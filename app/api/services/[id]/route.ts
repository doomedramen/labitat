import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { items } from "@/lib/db/schema"
import { eq } from "drizzle-orm"
import { decrypt } from "@/lib/crypto"
import { getCached, setCached } from "@/lib/cache"
import { getService } from "@/lib/adapters"

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params

  // Load item from DB
  const [item] = await db.select().from(items).where(eq(items.id, id))
  if (!item) {
    return NextResponse.json({ error: "Item not found" }, { status: 404 })
  }

  // Check if item has a service adapter
  if (!item.serviceType) {
    return NextResponse.json({ _status: "none" })
  }

  // Get the adapter
  const adapter = getService(item.serviceType)
  if (!adapter) {
    return NextResponse.json({ error: "Unknown service type" }, { status: 400 })
  }

  const pollingMs = item.pollingMs ?? adapter.defaultPollingMs ?? 10000

  // Check cache
  const cached = getCached(`service:${id}`, pollingMs)
  if (cached) {
    return NextResponse.json(cached)
  }

  // Build config object - decrypt password fields
  const config: Record<string, string> = {}

  // Add base URL
  if (item.serviceUrl) {
    config.url = item.serviceUrl
  }

  // Decrypt stored config
  if (item.configEnc) {
    try {
      const decryptedConfig = JSON.parse(await decrypt(item.configEnc))
      Object.assign(config, decryptedConfig)
    } catch (err) {
      console.error(`[labitat] Failed to decrypt config for item ${id}:`, err)
      const errorResponse = {
        _status: "error" as const,
        _statusText: "Failed to decrypt credentials — check SECRET_KEY",
      }
      setCached(`service:${id}`, errorResponse)
      return NextResponse.json(errorResponse)
    }
  }

  // Fetch live data
  try {
    const data = await adapter.fetchData(config)
    const responseData = {
      ...data,
      _status: data._status ?? "ok",
    }
    setCached(`service:${id}`, responseData)
    return NextResponse.json(responseData)
  } catch (err) {
    const errorResponse = {
      _status: "error" as const,
      _statusText: err instanceof Error ? err.message : "Failed to fetch data",
    }
    // Cache errors briefly to avoid hammering
    setCached(`service:${id}`, errorResponse)
    return NextResponse.json(errorResponse)
  }
}
