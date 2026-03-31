"use server"

import { revalidatePath } from "next/cache"
import { eq, max } from "drizzle-orm"
import { nanoid } from "nanoid"
import { getSession } from "@/lib/auth"
import { db } from "@/lib/db"
import { items } from "@/lib/db/schema"
import { encrypt, decrypt } from "@/lib/crypto"
import { getService } from "@/lib/adapters"

async function requireAuth() {
  const session = await getSession()
  if (!session.loggedIn) throw new Error("Unauthorized")
}

/** Extract and encrypt service config from form data */
async function buildServiceConfig(
  serviceType: string | null,
  formData: FormData
): Promise<{ configEnc: string | null; serviceUrl: string | null }> {
  if (!serviceType) {
    return { configEnc: null, serviceUrl: null }
  }

  const adapter = getService(serviceType)
  if (!adapter) {
    return { configEnc: null, serviceUrl: null }
  }

  const config: Record<string, string> = {}
  let serviceUrl: string | null = null

  for (const field of adapter.configFields) {
    const formKey = "config_" + field.key

    if (field.type === "boolean") {
      // Boolean fields: check for "true" value (switch submits value="true" when checked)
      const value = formData.get(formKey)
      config[field.key] = value === "true" ? "true" : "false"
    } else {
      const value = (formData.get(formKey) as string) ?? ""
      if (field.type === "password" && value) {
        config[field.key] = value
      } else if (field.key === "url") {
        config[field.key] = value
        serviceUrl = value || null
      } else if (value) {
        config[field.key] = value
      }
    }
  }

  // Encrypt if there's any config to store
  const configEnc =
    Object.keys(config).length > 0
      ? await encrypt(JSON.stringify(config))
      : null

  return { configEnc, serviceUrl }
}

export async function createItem(groupId: string, formData: FormData) {
  await requireAuth()

  const label = (formData.get("label") as string).trim()
  if (!label) throw new Error("Label is required")

  const serviceType = (formData.get("serviceType") as string) || null
  const { configEnc, serviceUrl } = await buildServiceConfig(
    serviceType,
    formData
  )

  const [result] = await db
    .select({ maxOrder: max(items.order) })
    .from(items)
    .where(eq(items.groupId, groupId))
  const nextOrder = (result?.maxOrder ?? -1) + 1

  const pollingMsStr = formData.get("pollingMs") as string
  const pollingMs = pollingMsStr ? parseInt(pollingMsStr, 10) : null

  await db.insert(items).values({
    id: nanoid(),
    groupId,
    label,
    href: (formData.get("href") as string) || null,
    iconUrl: (formData.get("iconUrl") as string) || null,
    serviceType,
    serviceUrl,
    apiKeyEnc: null, // deprecated - using configEnc now
    configEnc,
    pollingMs: pollingMs && !isNaN(pollingMs) ? pollingMs : null,
    order: nextOrder,
  })
  revalidatePath("/")
}

export async function updateItem(id: string, formData: FormData) {
  await requireAuth()

  const label = (formData.get("label") as string).trim()
  if (!label) throw new Error("Label is required")

  const serviceType = (formData.get("serviceType") as string) || null
  const { configEnc, serviceUrl } = await buildServiceConfig(
    serviceType,
    formData
  )

  const pollingMsStr = formData.get("pollingMs") as string
  const pollingMs = pollingMsStr ? parseInt(pollingMsStr, 10) : null

  await db
    .update(items)
    .set({
      label,
      href: (formData.get("href") as string) || null,
      iconUrl: (formData.get("iconUrl") as string) || null,
      serviceType,
      serviceUrl,
      configEnc,
      pollingMs: pollingMs && !isNaN(pollingMs) ? pollingMs : null,
    })
    .where(eq(items.id, id))
  revalidatePath("/")
}

export async function deleteItem(id: string) {
  await requireAuth()
  await db.delete(items).where(eq(items.id, id))
  revalidatePath("/")
}

/** Called by dnd-kit in Step 3 */
export async function reorderItems(groupId: string, orderedIds: string[]) {
  await requireAuth()
  await Promise.all(
    orderedIds.map((id, index) =>
      db.update(items).set({ order: index, groupId }).where(eq(items.id, id))
    )
  )
  revalidatePath("/")
}

/** Get decrypted config for an item (for editing) */
export async function getItemConfig(
  id: string
): Promise<Record<string, string>> {
  await requireAuth()

  const [item] = await db.select().from(items).where(eq(items.id, id))
  if (!item || !item.configEnc) {
    return {}
  }

  try {
    const decrypted = await decrypt(item.configEnc)
    return JSON.parse(decrypted)
  } catch {
    return {}
  }
}
