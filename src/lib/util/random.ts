/* Every random choice in Honmoon goes through Math.random, on purpose: a test
   can replace it with a seeded generator and get the same questions every
   run. That only holds while the code asks for random numbers in the same
   order, so keep the order of calls when refactoring, and do not reach for a
   second source of randomness. */

/** A random whole number from 0 up to (not including) n. */
export function rnd(n: number): number {
  return Math.floor(Math.random() * n);
}

export function pickOf<T>(items: readonly T[]): T {
  return items[rnd(items.length)];
}

/** Fisher–Yates, in place. Returns the same array for chaining. */
export function shuffle<T>(items: T[]): T[] {
  for (let i = items.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [items[i], items[j]] = [items[j], items[i]];
  }
  return items;
}
