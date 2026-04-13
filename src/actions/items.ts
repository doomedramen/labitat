"use server";

import { eq, max } from "drizzle-orm";
import { nanoid } from "nanoid";
import { requireAuth } from "@/lib/auth/guard";
import { db } from "@/lib/db";
import { items } from "@/lib/db/schema";
import { encrypt, decrypt } from "@/lib/crypto";
import { getService } from "@/lib/adapters";
import { refreshGroupsCache } from "@/lib/structural-cache";
import type { GroupWithItems } from "@/lib/types";

async function buildServiceConfig(
  serviceType: string | null,
  formData: FormData,
): Promise<{ config: Record<string, string>; serviceUrl: string | null }> {
  if (!serviceType) {
    return { config: {}, serviceUrl: null };
  }

  const adapter = getService(serviceType);
  if (!adapter) {
    return { config: {}, serviceUrl: null };
  }

  const config: Record<string, string> = {};
  let serviceUrl: string | null = null;

  for (const field of adapter.configFields) {
    const formKey = "config_" + field.key;

    if (field.type === "boolean") {
      const value = formData.get(formKey);
      config[field.key] = value === "true" ? "true" : "false";
    } else {
      const value = (formData.get(formKey) as string) ?? "";
      if (field.type === "password" && value) {
        config[field.key] = value;
      } else if (field.type === "url") {
        config[field.key] = value;
        serviceUrl = value || null;
      } else if (value) {
        config[field.key] = value;
      }
    }
  }

  return { config, serviceUrl };
}

export async function createItem(groupId: string, formData: FormData): Promise<GroupWithItems[]> {
  await requireAuth();

  const label = (formData.get("label") as string | null)?.trim() ?? "";

  const rawServiceType = (formData.get("serviceType") as string) || null;
  const serviceType = rawServiceType && getService(rawServiceType) ? rawServiceType : null;
  const { config, serviceUrl } = await buildServiceConfig(serviceType, formData);

  const configEnc = Object.keys(config).length > 0 ? await encrypt(JSON.stringify(config)) : null;

  const [result] = await db
    .select({ maxOrder: max(items.order) })
    .from(items)
    .where(eq(items.groupId, groupId));
  const nextOrder = (result?.maxOrder ?? -1) + 1;

  const pollingMsStr = formData.get("pollingMs") as string;
  const pollingMs = pollingMsStr ? parseInt(pollingMsStr, 10) : null;

  const cleanMode = formData.get("cleanMode") === "true";
  const displayMode = (formData.get("displayMode") as string) || "label";
  const statDisplayMode = (formData.get("statDisplayMode") as string) || "label";

  await db.insert(items).values({
    id: nanoid(),
    groupId,
    label,
    href: (formData.get("href") as string) || null,
    iconUrl: (formData.get("iconUrl") as string) || null,
    serviceType,
    serviceUrl,
    configEnc,
    pollingMs: pollingMs && !isNaN(pollingMs) ? pollingMs : null,
    cleanMode,
    displayMode,
    statDisplayMode,
    order: nextOrder,
  });
  return refreshGroupsCache();
}

export async function updateItem(id: string, formData: FormData): Promise<GroupWithItems[]> {
  await requireAuth();

  const label = (formData.get("label") as string | null)?.trim() ?? "";

  const rawServiceType = (formData.get("serviceType") as string) || null;
  const serviceType = rawServiceType && getService(rawServiceType) ? rawServiceType : null;

  // Fetch existing item to preserve password fields on edit
  const [existingItem] = await db.select().from(items).where(eq(items.id, id));
  let oldConfig: Record<string, string> = {};
  if (existingItem?.configEnc) {
    try {
      oldConfig = JSON.parse(await decrypt(existingItem.configEnc));
    } catch {
      // Can't decrypt old config — start fresh
    }
  }

  const { config, serviceUrl } = await buildServiceConfig(serviceType, formData);

  // Preserve existing password values when the form leaves them blank
  const adapter = serviceType ? getService(serviceType) : null;
  if (adapter) {
    for (const field of adapter.configFields) {
      if (field.type === "password" && !config[field.key] && oldConfig[field.key]) {
        config[field.key] = oldConfig[field.key];
      }
    }
  }

  const configEnc =
    Object.keys(config).length > 0
      ? await encrypt(JSON.stringify(config))
      : (existingItem?.configEnc ?? null);

  const pollingMsStr = formData.get("pollingMs") as string;
  const pollingMs = pollingMsStr ? parseInt(pollingMsStr, 10) : null;

  const cleanMode = formData.get("cleanMode") === "true";
  const displayMode = (formData.get("displayMode") as string) || "label";
  const statDisplayMode = (formData.get("statDisplayMode") as string) || "label";
  const rawStatCardOrder = formData.get("statCardOrder") as string | null;
  let statCardOrder: { active: string[]; unused: string[] } | null = null;
  if (rawStatCardOrder) {
    try {
      statCardOrder = JSON.parse(rawStatCardOrder);
    } catch {
      // Invalid JSON — keep existing
    }
  }

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
      cleanMode,
      displayMode,
      statDisplayMode,
      statCardOrder: statCardOrder ?? existingItem?.statCardOrder ?? null,
    })
    .where(eq(items.id, id));
  return refreshGroupsCache();
}

export async function deleteItem(id: string): Promise<GroupWithItems[]> {
  await requireAuth();
  await db.delete(items).where(eq(items.id, id));
  return refreshGroupsCache();
}

export async function reorderItems(
  groupId: string,
  orderedIds: string[],
): Promise<GroupWithItems[]> {
  await requireAuth();
  await Promise.all(
    orderedIds.map((id, index) =>
      db.update(items).set({ order: index, groupId }).where(eq(items.id, id)),
    ),
  );
  return refreshGroupsCache();
}

export async function getItemConfig(id: string): Promise<Record<string, string>> {
  await requireAuth();

  const [item] = await db.select().from(items).where(eq(items.id, id));
  if (!item || !item.configEnc) {
    return {};
  }

  try {
    const decrypted = await decrypt(item.configEnc);
    return JSON.parse(decrypted);
  } catch (err) {
    console.warn("[items] Failed to decrypt config for item", id, err);
    return {};
  }
}
