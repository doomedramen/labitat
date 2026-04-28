import { NextRequest, NextResponse } from "next/server";
import type { ServiceData } from "@/lib/adapters/types";
import type { SessionData } from "@/lib/auth";
import { env } from "@/lib/env";

interface SeedRequest {
  admin?: { email: string; password: string };
  settings?: Record<string, string>;
  groups?: Array<{
    name: string;
    items?: Array<{
      label: string;
      href?: string;
      iconUrl?: string;
      serviceType?: string;
      serviceUrl?: string;
      /** Pre-seed cached widget data for E2E tests */
      cachedWidgetData?: Record<string, unknown>;
    }>;
  }>;
}

export async function POST(request: Request) {
  const secret = request.headers.get("x-test-secret");
  if (!env.TEST_SECRET || secret !== env.TEST_SECRET) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  // Dynamic imports to avoid loading env-dependent modules during build
  const { sql } = await import("drizzle-orm");
  const { getIronSession } = await import("iron-session");
  const bcrypt = await import("bcryptjs");
  const { nanoid } = await import("nanoid");
  const { db } = await import("@/lib/db");
  const { users, groups, items, settings } = await import("@/lib/db/schema");
  const { getSessionOptions } = await import("@/lib/auth");
  const { serverCache } = await import("@/lib/server-cache");

  // Reset first
  await db.run(sql`DELETE FROM items`);
  await db.run(sql`DELETE FROM groups`);
  await db.run(sql`DELETE FROM settings`);
  await db.run(sql`DELETE FROM users`);

  // Clear server cache
  serverCache.clear();

  const body: SeedRequest = await request.json().catch(() => ({}));

  const response = NextResponse.json({ ok: true });

  // Seed admin user
  if (body.admin) {
    const userId = nanoid();
    const passwordHash = await bcrypt.default.hash(body.admin.password, 4);
    await db.insert(users).values({
      id: userId,
      email: body.admin.email,
      passwordHash,
      role: "admin",
    });

    // Set session cookie
    const session = await getIronSession<SessionData>(request, response, getSessionOptions());
    session.loggedIn = true;
    session.userId = userId;
    await session.save();
  }

  // Seed settings
  if (body.settings) {
    for (const [key, value] of Object.entries(body.settings)) {
      await db.insert(settings).values({ key, value });
    }
  }

  // Seed groups and items
  if (body.groups) {
    for (let gi = 0; gi < body.groups.length; gi++) {
      const groupData = body.groups[gi];
      const groupId = nanoid();
      await db.insert(groups).values({
        id: groupId,
        name: groupData.name,
        order: gi,
      });

      if (groupData.items) {
        for (let ii = 0; ii < groupData.items.length; ii++) {
          const itemData = groupData.items[ii];
          const itemId = nanoid();
          await db.insert(items).values({
            id: itemId,
            groupId,
            label: itemData.label,
            href: itemData.href ?? null,
            iconUrl: itemData.iconUrl ?? null,
            serviceType: itemData.serviceType ?? null,
            serviceUrl: itemData.serviceUrl ?? null,
            order: ii,
          });

          // Pre-seed cached widget data for E2E tests
          if (itemData.cachedWidgetData) {
            console.log(`[seed API] Seeding cache for item ${itemId} (${itemData.label})`);
            const status = (itemData.cachedWidgetData._status as string) ?? "ok";
            await serverCache.seed(itemId, {
              _status: status as "ok" | "warn" | "error" | "none",
              ...itemData.cachedWidgetData,
            } as ServiceData);
            console.log(`[seed API] Cache seeded for ${itemId}`);
          }
        }
      }
    }
  }

  return response;
}

// GET handler for debugging cache state in E2E tests
export async function GET(request: NextRequest) {
  const secret = request.headers.get("x-test-secret");
  if (!process.env.TEST_SECRET || secret !== process.env.TEST_SECRET) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const { serverCache } = await import("@/lib/server-cache");
  const itemId = request.nextUrl.searchParams.get("itemId");
  if (itemId) {
    const cached = serverCache.get(itemId);
    return NextResponse.json({ itemId, cached });
  }

  return NextResponse.json({ error: "Provide ?itemId=..." }, { status: 400 });
}
