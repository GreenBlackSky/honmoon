import { honmoon } from '../store/honmoon.svelte';
import type { ClefId, Pref } from '../store/types';
import { LETTERS, NATPC, STEP, pcOf, spell } from './notes';
import { STRINGS, allowedPc, lvl } from './bass';
import { rnd } from '../util/random';

/* staff coords: line y = 0,10,20,30,40, bottom line at y=40.
   A clef is nothing but an offset: it names the diatonic index sitting on
   the bottom line. bot 18 = G2 (bass), 30 = E4 (treble), 24 = F3 (alto),
   22 = D3 (tenor). Everything else about the staff is identical. */
export interface ClefDef {
  id: ClefId;
  n: string;
  ab: string;
  bot: number;
  /** mnemonic for the lines, and for the spaces */
  ml: string;
  ms: string;
  sb: string;
}
export const CLEFS: ClefDef[] = [
  {
    id: 'bass',
    n: 'Bass',
    ab: 'F',
    bot: 18,
    ml: 'Good Boys Do Fine Always',
    ms: 'All Cows Eat Grass',
    sb: 'The F clef. Where bass guitar and the low half of the piano are written.',
  },
  {
    id: 'treble',
    n: 'Treble',
    ab: 'G',
    bot: 30,
    ml: 'Every Good Boy Deserves Fruit',
    ms: 'bottom to top they spell FACE',
    sb: 'The G clef. Singing, guitar, the right hand of the piano — most music you will ever meet.',
  },
  {
    id: 'tenor',
    n: 'Tenor',
    ab: 'C4',
    bot: 22,
    ml: 'Dogs From Africa Chase Elephants',
    ms: 'Every Good Bass Does',
    sb: 'A C clef on the fourth line. Turns up in high bass, cello and trombone parts, to dodge ledger lines.',
  },
  {
    id: 'alto',
    n: 'Alto',
    ab: 'C3',
    bot: 24,
    ml: 'Fat Alley Cats Eat Garbage',
    ms: 'Good Bass Does Fine',
    sb: 'A C clef on the middle line. Viola, and the occasional arrangement. Learn it last.',
  },
];
export function clefDef(id: string): ClefDef {
  return CLEFS.find((clef) => clef.id === id) ?? CLEFS[0];
}
export function enabledClefs(): ClefId[] {
  const chosen = honmoon.settings.clefs;
  if (!chosen || !chosen.length) {
    return ['bass'];
  }
  const out = CLEFS.filter((clef) => chosen.includes(clef.id)).map((clef) => clef.id);
  return out.length ? out : ['bass'];
}
export function clefOn(id: ClefId): boolean {
  return enabledClefs().includes(id);
}
export function multiClef(): boolean {
  return enabledClefs().length > 1;
}

/* Staff geometry in SVG units: five lines 10 apart, so one diatonic step
   (line to space) is 5, and the bottom line sits at y = 40. */
const STAFF_BOTTOM_Y = 40;
const Y_PER_STEP = 5;
const STEPS_PER_OCTAVE = 7;
const STAFF_LINES = 5;
const STAFF_SPACES = 4;
/** Two ledger lines = four diatonic steps beyond the staff. */
const LEDGER_STEPS = 4;
/** From the bottom line to the top line is eight steps. */
const STAFF_HEIGHT_STEPS = 8;
const MIDDLE_C = 60;

/** Notation is diatonic, not chromatic: C and C♯ share a line. So position is
    found from a diatonic index, offset by whichever clef is in force. */
export function staffPos(
  writtenMidi: number,
  pref: Pref,
  clef: string = 'bass',
): { y: number; l: string; a: number } {
  const bottomLineStep = clefDef(clef || 'bass').bot;
  const octave = Math.floor(writtenMidi / 12) - 1;
  const spelling = spell(pcOf(writtenMidi), pref);
  const diatonicIndex = octave * STEPS_PER_OCTAVE + STEP[spelling.l];
  return {
    y: STAFF_BOTTOM_Y - (diatonicIndex - bottomLineStep) * Y_PER_STEP,
    l: spelling.l,
    a: spelling.a,
  };
}
/** The natural MIDI note at a diatonic index (C-1 = 0, D-1 = 1, …). */
export function diatonicMidi(diatonicIndex: number): number {
  const octave = Math.floor(diatonicIndex / STEPS_PER_OCTAVE);
  const stepInOctave = diatonicIndex - octave * STEPS_PER_OCTAVE;
  for (let i = 0; i < LETTERS.length; i++) {
    if (STEP[LETTERS[i]] === stepInOctave) {
      return (octave + 1) * 12 + NATPC[i];
    }
  }
  return MIDDLE_C;
}
export function clefLines(clef: string): number[] {
  const bottom = clefDef(clef).bot;
  const out: number[] = [];
  for (let line = 0; line < STAFF_LINES; line++) {
    out.push(diatonicMidi(bottom + line * 2));
  }
  return out;
}
export function clefSpaces(clef: string): number[] {
  const bottom = clefDef(clef).bot;
  const out: number[] = [];
  for (let space = 0; space < STAFF_SPACES; space++) {
    out.push(diatonicMidi(bottom + 1 + space * 2));
  }
  return out;
}
/** The written notes that sit comfortably on a clef: the staff itself plus
    two ledger lines either side. */
export function clefRange(clef: string): number[] {
  const bottom = clefDef(clef).bot;
  const lowest = bottom - LEDGER_STEPS;
  const highest = bottom + STAFF_HEIGHT_STEPS + LEDGER_STEPS;
  const out: number[] = [];
  for (let step = lowest; step <= highest; step++) {
    out.push(diatonicMidi(step));
  }
  return out;
}

/* ---- staff cards ----
   Bass-clef cards keep their old id, "st:<midi>", so nothing already learned
   is thrown away; the other clefs add their name in the middle. */
export interface StaffNote {
  m: number;
  clef: ClefId;
  id: string;
}
export function stId(clef: ClefId, m: number): string {
  return clef === 'bass' ? 'st:' + m : 'st:' + clef + ':' + m;
}
export function parseST(id: string): { clef: ClefId; m: number } {
  const parts = id.split(':');
  // 'st:m' is a bass-clef note (the original format); 'st:clef:m' any other clef
  return parts.length === 2
    ? { clef: 'bass', m: +parts[1] }
    : { clef: parts[1] as ClefId, m: +parts[2] };
}
/** Bass clef follows the fret range you are working in, so the staff and the
    neck always agree. The other clefs have no neck to follow, so they use the
    staff itself plus two ledger lines either way. */
export function staffNotesFor(clef: ClefId): StaffNote[] {
  const out: StaffNote[] = clef === 'bass' ? bassClefNotesOnNeck() : notesAroundStaff(clef);
  out.sort((a, b) => a.m - b.m);
  return out;
}
/** Each distinct written pitch the neck covers at the current range. */
function bassClefNotesOnNeck(): StaffNote[] {
  const level = lvl();
  const seen = new Set<number>();
  const out: StaffNote[] = [];
  for (let string = 0; string < STRINGS.length; string++) {
    for (let fret = level.lo; fret <= level.hi; fret++) {
      const midi = STRINGS[string].open + fret;
      if (allowedPc(pcOf(midi)) && !seen.has(midi)) {
        seen.add(midi);
        out.push({ m: midi, clef: 'bass', id: stId('bass', midi) });
      }
    }
  }
  return out;
}
function notesAroundStaff(clef: ClefId): StaffNote[] {
  return clefRange(clef)
    .filter((midi) => allowedPc(pcOf(midi)))
    .map((midi) => ({ m: midi, clef, id: stId(clef, midi) }));
}
export function staffNotes(): StaffNote[] {
  return enabledClefs().flatMap((clef) => staffNotesFor(clef));
}
/** A written pitch carrying this pitch class, sitting on the given clef. */
export function midiForPcInClef(pc: number, clef: ClefId): number {
  const matches = clefRange(clef).filter((midi) => pcOf(midi) === pc);
  if (matches.length) {
    return matches[rnd(matches.length)];
  }
  /* spelled notes only cover naturals, so step to the nearest one and let
     the accidental do the rest */
  const range = clefRange(clef);
  let nearest = range[0];
  let nearestDistance = Infinity;
  for (const midi of range) {
    const distance = Math.abs(pcOf(midi) - pc);
    if (distance < nearestDistance) {
      nearestDistance = distance;
      nearest = midi;
    }
  }
  const nearestPc = pcOf(nearest);
  const wrapsToNextOctave = pc < nearestPc && nearestPc - pc > 6;
  return nearest - nearestPc + pc + (wrapsToNextOctave ? 12 : 0);
}
