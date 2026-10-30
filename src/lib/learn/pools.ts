import { MKEYS, pcOf } from '../music/notes';
import { accOn, allowedPc, positions } from '../music/bass';
import { enabledScales } from '../music/scales';

/* ---------------- card pools ----------------
   Every card id carries its own meaning, and the prefixes are kept exactly as
   Fretboard Fluency had them so old progress still lines up:
     fb:s:f    a position on the neck          st:m / st:clef:m  a note on a staff
     tr:pc     naming a pitch class            pl:pc  playing a pitch class
     md:k:pc   a note in a key                 rh:…   rhythm
     iv:n      an interval                     ch:id  a chord
     se:id     a scale by ear                  sc:id:root  a scale in a key */

const PITCH_CLASSES = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11];
const MAJOR_SCALE_STEPS = [0, 2, 4, 5, 7, 9, 11];

/** Pitch classes in rotation, for translating between letters and solfège. */
export function pcs(): { pc: number; id: string }[] {
  return PITCH_CLASSES.filter(allowedPc).map((pc) => ({ pc, id: 'tr:' + pc }));
}
/** Pitch classes you can actually reach at this range, for "play that note" —
    the answer is the right note in any octave, so the card is the pitch class. */
export function playPcs(): { pc: number; id: string }[] {
  const reachable = new Set(positions().map((pos) => pcOf(pos.m)));
  return [...reachable].sort((a, b) => a - b).map((pc) => ({ pc, id: 'pl:' + pc }));
}
export function parseMD(id: string): { keyPc: number; pc: number } {
  const parts = id.split(':');
  return { keyPc: +parts[1], pc: +parts[2] };
}
/** The degrees asked about in movable-do cards: all twelve when the black
    notes are on, otherwise the seven of the major scale. */
export function mdoRels(): number[] {
  return accOn() ? [...PITCH_CLASSES] : [...MAJOR_SCALE_STEPS];
}
export function mdoCards(): string[] {
  const degrees = mdoRels();
  return MKEYS.flatMap((key) =>
    degrees.map((degree) => 'md:' + key.pc + ':' + pcOf(key.pc + degree)),
  );
}
export function scalearCards(): string[] {
  return enabledScales().map((scale) => 'se:' + scale.id);
}
