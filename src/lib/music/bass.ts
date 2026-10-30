import { honmoon } from '../store/honmoon.svelte';
import { NAT, pcOf } from './notes';
import type { LevelId } from '../store/types';

/* Written pitch: bass sounds an octave below what is written.
   Open strings written: E2 40, A2 45, D3 50, G3 55. Top row -> bottom row. */
export const STRINGS = [
  { n: 'G', open: 55 },
  { n: 'D', open: 50 },
  { n: 'A', open: 45 },
  { n: 'E', open: 40 },
] as const;

/* How far up the neck, and — separately — whether the black notes are in.
   These used to be one four-step ladder ending in "All 12 notes", which meant
   the only way to meet a sharp was to jump to the whole neck, and nothing in
   the name of a range said anything about sharps at all. They are two
   different questions, so they are two separate controls. */
export interface Level {
  id: LevelId;
  name: string;
  lo: number;
  hi: number;
  /** how far the board is drawn, when that is wider than what is carded */
  vhi?: number;
  desc: string;
}
export const LEVELS: Level[] = [
  {
    id: 'l0',
    name: 'Open strings',
    lo: 0,
    hi: 0,
    vhi: 4,
    desc: 'The four open strings only — the place to start on the staff',
  },
  { id: 'l1', name: 'Open position', lo: 0, hi: 5, desc: 'Frets 0–5' },
  { id: 'l2', name: 'Full neck', lo: 0, hi: 12, desc: 'Frets 0–12' },
];

export function lvl(): Level {
  return LEVELS.find((level) => level.id === honmoon.settings.level) ?? LEVELS[1];
}
/** The highest fret drawn on the board (can be wider than the carded range). */
export function vhi(): number {
  const level = lvl();
  return level.vhi ?? level.hi;
}
export function accOn(): boolean {
  return honmoon.settings.acc === true;
}
export function allowedPc(pc: number): boolean {
  return accOn() || NAT.includes(pc);
}
/** Whether the instrument is to hand. Separate from the microphone setting:
    the mic is about how a played note gets graded, this is about whether
    there is a bass in the room at all. */
export function bassHere(): boolean {
  return honmoon.settings.bass !== false;
}

/** A place on the neck: string index `s` (0 = G, top row), fret `f`, the
    written MIDI pitch `m`, and its card id. */
export interface FretPos {
  s: number;
  f: number;
  m: number;
  id: string;
}

const STRING_COUNT = STRINGS.length;
/** The neck as drawn on maps and used to place a written pitch: frets 0–12. */
const MAP_LAST_FRET = 12;
/** The highest fret `findPos` will suggest. */
const REACHABLE_LAST_FRET = 15;
/** String indices from the lowest string (E) up. */
const LOW_TO_HIGH_STRINGS = [3, 2, 1, 0];

function cardIdForFret(string: number, fret: number): string {
  return 'fb:' + string + ':' + fret;
}

/** Every carded position on the neck at the current range. */
export function positions(): FretPos[] {
  const level = lvl();
  const out: FretPos[] = [];
  for (let string = 0; string < STRING_COUNT; string++) {
    for (let fret = level.lo; fret <= level.hi; fret++) {
      const midi = STRINGS[string].open + fret;
      if (allowedPc(pcOf(midi))) {
        out.push({ s: string, f: fret, m: midi, id: cardIdForFret(string, fret) });
      }
    }
  }
  return out;
}
/** Every place a pitch class can be played at this range. */
export function placesFor(pc: number): FretPos[] {
  return positions().filter((pos) => pcOf(pos.m) === pc);
}
/** Every place a written pitch sits on a 12-fret neck. */
export function placesForMidi(midi: number): { s: number; f: number }[] {
  const out: { s: number; f: number }[] = [];
  for (let string = 0; string < STRING_COUNT; string++) {
    for (let fret = 0; fret <= MAP_LAST_FRET; fret++) {
      if (STRINGS[string].open + fret === midi) {
        out.push({ s: string, f: fret });
      }
    }
  }
  return out;
}
/** Where one pitch class sits on a single string, within the range on show.
    Two, when the string covers a full octave. The whole span that is drawn and
    tappable counts, not just the carded one: if a fret is on the board and is
    that note, tapping it is a fair answer. */
export function sameNoteFrets(string: number, pc: number): number[] {
  const out: number[] = [];
  for (let fret = lvl().lo; fret <= vhi(); fret++) {
    if (pcOf(STRINGS[string].open + fret) === pc) {
      out.push(fret);
    }
  }
  return out;
}
/** The first playable spot for a written pitch, trying a preferred string first. */
export function findPos(
  midi: number,
  preferString?: number | null,
): { s: number; f: number } | null {
  const order = preferString == null ? LOW_TO_HIGH_STRINGS : [preferString, ...LOW_TO_HIGH_STRINGS];
  for (const string of order) {
    const fret = midi - STRINGS[string].open;
    if (fret >= 0 && fret <= REACHABLE_LAST_FRET) {
      return { s: string, f: fret };
    }
  }
  return null;
}
