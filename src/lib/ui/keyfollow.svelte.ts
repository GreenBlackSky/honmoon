import { pcOf } from '../music/notes';

/* follow mode: light keys from outside while something plays. The board shows
   one octave; a line that runs outside it still has a key of that name, so a
   note off the board lights the key with the same name rather than nothing. */
export const follow: { lit: number | null } = $state({ lit: null });
let timers: ReturnType<typeof setTimeout>[] = [];

/** The last key stays lit this long after its note. */
const LINGER_MS = 420;

/** Light each note's key in turn, `step` seconds apart. */
export function kbFollow(midis: number[], step: number): void {
  kbFollowStop();
  midis.forEach((midi, i) => {
    timers.push(
      setTimeout(
        () => {
          follow.lit = midi;
        },
        i * step * 1000,
      ),
    );
  });
  timers.push(
    setTimeout(
      () => {
        follow.lit = null;
      },
      midis.length * step * 1000 + LINGER_MS,
    ),
  );
}
export function kbFollowStop(): void {
  timers.forEach(clearTimeout);
  timers = [];
  follow.lit = null;
}
/** Which of the drawn keys the followed note lights. */
export function followTarget(lit: number | null, drawn: number[]): number | null {
  if (lit == null) {
    return null;
  }
  if (drawn.includes(lit)) {
    return lit;
  }
  return drawn.find((key) => pcOf(key) === pcOf(lit)) ?? null;
}
