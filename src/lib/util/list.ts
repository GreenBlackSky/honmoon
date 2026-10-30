/** A copy of a list with an item added, or removed if it was already there. */
export function toggledIn<T>(list: readonly T[], item: T): T[] {
  return list.includes(item) ? list.filter((other) => other !== item) : [...list, item];
}
