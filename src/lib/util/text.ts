/** Escapes text for use inside the SVG/HTML strings the notation code builds. */
export function esc(s: unknown): string {
  return String(s).replace(
    /[&<>]/g,
    (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' })[c] as string,
  );
}

/** "a fifth", "an octave" */
export function anA(w: string): string {
  return (/^[aeiou]/i.test(w) ? 'an ' : 'a ') + w;
}

export const NUMWORD = [
  'zero',
  'one',
  'two',
  'three',
  'four',
  'five',
  'six',
  'seven',
  'eight',
  'nine',
  'ten',
  'eleven',
  'twelve',
];

/** Local calendar day as YYYY-MM-DD — the key the daily log is stored under. */
export function dayKey(d: Date): string {
  return (
    d.getFullYear() +
    '-' +
    String(d.getMonth() + 1).padStart(2, '0') +
    '-' +
    String(d.getDate()).padStart(2, '0')
  );
}

export function todayKey(): string {
  return dayKey(new Date());
}

/** "3m 07s"-style durations used on the summary screens. */
export function minsSecs(totalSecs: number): string {
  const mins = Math.floor((totalSecs || 0) / 60);
  const secs = (totalSecs || 0) % 60;
  return (mins ? mins + 'm ' : '') + secs + 's';
}
