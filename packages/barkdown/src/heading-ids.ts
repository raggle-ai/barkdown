/**
 * Stable heading IDs shared by the document index, the rehype heading plugin,
 * the outline, and the collapsible sections, so a fragment link resolves to
 * the same element everywhere.
 */

/** Lower-case slug that keeps letters and digits from every script. */
export function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s_-]/gu, "")
    .trim()
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

/**
 * Assigns unique IDs in document order. Duplicate heading text gets a
 * counter suffix. Reserved IDs are never handed out again, which lets a
 * renderer assign fallback IDs that cannot collide with the index.
 */
export class HeadingIdRegistry {
  private counts = new Map<string, number>();
  private used = new Set<string>();

  reserve(id: string): void {
    this.used.add(id);
  }

  id(text: string): string {
    const base = slugify(text) || "section";
    let count = this.counts.get(base) ?? 0;
    let candidate = count === 0 ? base : `${base}-${count}`;
    while (this.used.has(candidate)) {
      count += 1;
      candidate = `${base}-${count}`;
    }
    this.counts.set(base, count + 1);
    this.used.add(candidate);
    return candidate;
  }
}
