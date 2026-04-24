"use server";

import { eq, max } from "drizzle-orm";
import { nanoid } from "nanoid";
import { requireAuth } from "@/lib/auth/guard";
import { db } from "@/lib/db";
import { items } from "@/lib/db/schema";
import { encrypt, decrypt } from "@/lib/crypto";
import { getService } from "@/lib/adapters";
import { refreshGroupsCache } from "@/lib/structural-cache";
import { pollingSup } from "@/lib/polling-supervisor";
import { serverCache } from "@/lib/server-cache";
import type { GroupWithItems } from "@/lib/types";
import { revalidatePath } from "next/cache";

function safeRevalidatePath(path: string) {
  try {
    revalidatePath(path);
  } catch {
    // In unit tests or non-RSC contexts, Next's static generation store is absent.
    // Revalidation is best-effort here; mutations still update the DB.
  }
}

function isStatCardOrder(value: unknown): value is { active: string[]; unused: string[] } {
  if (!value || typeof value !== "object") return false;
  if (!("active" in value) || !("unused" in value)) return false;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const v = value as any;
  return (
    Array.isArray(v.active) &&
    v.active.every((x: unknown) => typeof x === "string") &&
    Array.isArray(v.unused) &&
    v.unused.every((x: unknown) => typeof x === "string")
  );
}

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
      const raw = formData.get(formKey);
      if (raw === null) continue; // field omitted (e.g. async config not loaded yet)
      config[field.key] = raw === "true" ? "true" : "false";
    } else {
      const raw = formData.get(formKey);
      if (raw === null) continue; // field omitted
      const value = String(raw);
      if (field.type === "password" && value) {
        config[field.key] = value;
      } else if (field.type === "url") {
        // Preserve explicit clears ("") but ignore omitted fields (handled above).
        config[field.key] = value;
        serviceUrl = value === "" ? null : value;
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
    displayMode,
    statDisplayMode,
    order: nextOrder,
  });
  pollingSup.invalidateCache();
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

  // Preserve serviceUrl if the form didn't include the url config field (e.g. config not loaded yet).
  const serviceUrlProvided = !!adapter?.configFields.some(
    (f) => f.type === "url" && formData.has("config_" + f.key),
  );
  const nextServiceUrl =
    !serviceUrlProvided && existingItem?.serviceUrl ? existingItem.serviceUrl : serviceUrl;

  const configEnc =
    Object.keys(config).length > 0
      ? await encrypt(JSON.stringify(config))
      : (existingItem?.configEnc ?? null);

  const pollingMsStr = formData.get("pollingMs") as string;
  const pollingMs = pollingMsStr ? parseInt(pollingMsStr, 10) : null;

  const displayMode = (formData.get("displayMode") as string) || "label";
  const statDisplayMode = (formData.get("statDisplayMode") as string) || "label";
  const rawStatCardOrder = formData.get("statCardOrder") as string | null;
  let statCardOrderStr: string | null = null;
  if (rawStatCardOrder) {
    try {
      const parsed = JSON.parse(rawStatCardOrder) as unknown;
      if (isStatCardOrder(parsed)) {
        statCardOrderStr = JSON.stringify(parsed);
      }
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
      serviceUrl: nextServiceUrl,
      configEnc,
      pollingMs: pollingMs && !isNaN(pollingMs) ? pollingMs : null,
      displayMode,
      statDisplayMode,
      statCardOrder: statCardOrderStr ?? existingItem?.statCardOrder ?? null,
    })
    .where(eq(items.id, id));
  pollingSup.invalidateCache();

  // Ensure both view and edit routes get fresh data after mutations.
  safeRevalidatePath("/");
  safeRevalidatePath("/edit");

  // Return fresh data from DB
  const freshGroups = await refreshGroupsCache();

  return freshGroups;
}

export async function deleteItem(id: string): Promise<GroupWithItems[]> {
  await requireAuth();
  await db.delete(items).where(eq(items.id, id));
  await serverCache.delete(id);
  pollingSup.invalidateCache();
  safeRevalidatePath("/");
  safeRevalidatePath("/edit");
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
  pollingSup.invalidateCache();
  safeRevalidatePath("/");
  safeRevalidatePath("/edit");
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
