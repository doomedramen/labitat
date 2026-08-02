import { parseIconCatalog } from "@/lib/icon-catalog";

const ICON_CATALOG_URL = "https://cdn.jsdelivr.net/gh/selfhst/icons@main/index-consolidated.json";

export const revalidate = 86_400;

export async function GET() {
  try {
    const response = await fetch(ICON_CATALOG_URL, {
      next: { revalidate },
      signal: AbortSignal.timeout(5_000),
    });

    if (!response.ok) {
      return Response.json({ error: "Icon catalog unavailable" }, { status: 502 });
    }

    const icons = parseIconCatalog(await response.json());
    if (icons.length === 0) {
      return Response.json({ error: "Icon catalog unavailable" }, { status: 502 });
    }

    return Response.json(icons, {
      headers: {
        "Cache-Control": "public, max-age=3600, s-maxage=86400, stale-while-revalidate=604800",
      },
    });
  } catch {
    return Response.json({ error: "Icon catalog unavailable" }, { status: 502 });
  }
}
