export interface IconOption {
  name: string;
  slug: string;
}

export function parseIconCatalog(value: unknown): IconOption[] {
  if (!Array.isArray(value)) return [];

  const seen = new Set<string>();
  const icons: IconOption[] = [];

  for (const entry of value) {
    if (!Array.isArray(entry)) continue;
    const [name, slug] = entry;
    if (typeof name !== "string" || typeof slug !== "string" || !name || !slug || seen.has(slug)) {
      continue;
    }

    seen.add(slug);
    icons.push({ name, slug });
  }

  return icons;
}
