import { NextRequest, NextResponse } from "next/server"
import { sql } from "drizzle-orm"
import { getIronSession } from "iron-session"
import { cookies } from "next/headers"
import bcrypt from "bcryptjs"
import { nanoid } from "nanoid"
import { db } from "@/lib/db"
import { users, groups, items, settings } from "@/lib/db/schema"
import { resetAllRateLimits } from "@/lib/auth/rate-limit"
import { getSessionOptions, type SessionData } from "@/lib/auth"
import { serverCache } from "@/lib/server-cache"
import type { ServiceData } from "@/lib/adapters/types"

interface SeedRequest {
  admin?: { email: string; password: string }
  settings?: Record<string, string>
  groups?: Array<{
    name: string
    items?: Array<{
      label: string
      href?: string
      iconUrl?: string
      serviceType?: string
      serviceUrl?: string
      /** Pre-seed cached widget data for E2E tests */
      cachedWidgetData?: Record<string, unknown>
    }>
  }>
}

export async function POST(request: Request) {
  const secret = request.headers.get("x-test-secret")
  if (!process.env.TEST_SECRET || secret !== process.env.TEST_SECRET) {
    return NextResponse.json({ error: "Not found" }, { status: 404 })
  }

  // Reset first
  await db.run(sql`DELETE FROM items`)
  await db.run(sql`DELETE FROM groups`)
  await db.run(sql`DELETE FROM settings`)
  await db.run(sql`DELETE FROM users`)
  resetAllRateLimits()

  // Clear server cache
  serverCache.clear()

  const body: SeedRequest = await request.json().catch(() => ({}))

  // Seed admin user
  if (body.admin) {
    const userId = nanoid()
    const passwordHash = await bcrypt.hash(body.admin.password, 4)
    await db.insert(users).values({
      id: userId,
      email: body.admin.email,
      passwordHash,
      role: "admin",
    })

    // Set session cookie
    const session = await getIronSession<SessionData>(
      await cookies(),
      getSessionOptions()
    )
    session.loggedIn = true
    session.userId = userId
    await session.save()
  }

  // Seed settings
  if (body.settings) {
    for (const [key, value] of Object.entries(body.settings)) {
      await db.insert(settings).values({ key, value })
    }
  }

  // Seed groups and items
  if (body.groups) {
    for (let gi = 0; gi < body.groups.length; gi++) {
      const groupData = body.groups[gi]
      const groupId = nanoid()
      await db.insert(groups).values({
        id: groupId,
        name: groupData.name,
        order: gi,
      })

      if (groupData.items) {
        for (let ii = 0; ii < groupData.items.length; ii++) {
          const itemData = groupData.items[ii]
          const itemId = nanoid()
          await db.insert(items).values({
            id: itemId,
            groupId,
            label: itemData.label,
            href: itemData.href ?? null,
            iconUrl: itemData.iconUrl ?? null,
            serviceType: itemData.serviceType ?? null,
            serviceUrl: itemData.serviceUrl ?? null,
            order: ii,
          })

          // Pre-seed cached widget data for E2E tests
          if (itemData.cachedWidgetData) {
            serverCache.seed(itemId, {
              _status: "ok",
              ...itemData.cachedWidgetData,
            } as ServiceData)
          }
        }
      }
    }
  }

  return NextResponse.json({ ok: true })
}

// GET handler for debugging cache state in E2E tests
export async function GET(request: NextRequest) {
  const secret = request.headers.get("x-test-secret")
  if (!process.env.TEST_SECRET || secret !== process.env.TEST_SECRET) {
    return NextResponse.json({ error: "Not found" }, { status: 404 })
  }

  const itemId = request.nextUrl.searchParams.get("itemId")
  if (itemId) {
    const cached = serverCache.get(itemId)
    return NextResponse.json({ itemId, cached })
  }

  return NextResponse.json({ error: "Provide ?itemId=..." }, { status: 400 })
}
