/**
 * Least-recently-used cache bounded by entry count and by a size measure.
 * The newest entry is always kept, even when it alone exceeds the limits, so
 * the document being read is never evicted by its own insertion.
 */

export type BoundedCacheOptions<K, V> = {
  /** Maximum number of entries. Default 32. */
  maxEntries?: number;
  /** Maximum total `size` of all entries. Default unlimited. */
  maxBytes?: number;
  /** Size of one value in the unit of `maxBytes`. Default 0. */
  size?: (value: V) => number;
  /** Called when an entry leaves the cache. */
  onEvict?: (key: K, value: V, reason: EvictReason) => void;
};

export type EvictReason = "capacity" | "delete" | "invalidate" | "clear";

export class BoundedCache<K, V> {
  private entries = new Map<K, { value: V; size: number }>();
  private readonly maxEntries: number;
  private readonly maxBytes: number;
  private readonly measure: (value: V) => number;
  private readonly onEvict: BoundedCacheOptions<K, V>["onEvict"];
  /** Total measured size of the stored values. */
  bytes = 0;

  constructor(options: BoundedCacheOptions<K, V> = {}) {
    this.maxEntries = options.maxEntries ?? 32;
    this.maxBytes = options.maxBytes ?? Number.POSITIVE_INFINITY;
    this.measure = options.size ?? (() => 0);
    this.onEvict = options.onEvict;
  }

  get size(): number {
    return this.entries.size;
  }

  has(key: K): boolean {
    return this.entries.has(key);
  }

  get(key: K): V | undefined {
    const entry = this.entries.get(key);
    if (!entry) return undefined;
    this.entries.delete(key);
    this.entries.set(key, entry);
    return entry.value;
  }

  set(key: K, value: V): this {
    this.remove(key, "delete", false);
    const size = this.measure(value);
    this.entries.set(key, { value, size });
    this.bytes += size;
    for (const [oldest, entry] of this.entries) {
      if (
        this.entries.size <= 1 ||
        (this.entries.size <= this.maxEntries && this.bytes <= this.maxBytes)
      ) {
        break;
      }
      this.entries.delete(oldest);
      this.bytes -= entry.size;
      this.onEvict?.(oldest, entry.value, "capacity");
    }
    return this;
  }

  delete(key: K): boolean {
    return this.remove(key, "delete", true);
  }

  /** Remove every entry the predicate matches; returns how many left. */
  invalidate(match: (key: K, value: V) => boolean): number {
    let removed = 0;
    for (const [key, entry] of [...this.entries]) {
      if (!match(key, entry.value)) continue;
      this.entries.delete(key);
      this.bytes -= entry.size;
      this.onEvict?.(key, entry.value, "invalidate");
      removed += 1;
    }
    return removed;
  }

  clear(): void {
    const entries = [...this.entries];
    this.entries.clear();
    this.bytes = 0;
    for (const [key, entry] of entries) {
      this.onEvict?.(key, entry.value, "clear");
    }
  }

  keys(): IterableIterator<K> {
    return this.entries.keys();
  }

  private remove(key: K, reason: EvictReason, notify: boolean): boolean {
    const entry = this.entries.get(key);
    if (!entry) return false;
    this.entries.delete(key);
    this.bytes -= entry.size;
    if (notify) this.onEvict?.(key, entry.value, reason);
    return true;
  }
}
