import type { Pref, Sys } from '../store/types';
import { honmoon } from '../store/honmoon.svelte';

/* ---------------- pitch arithmetic ---------------- */

export const SEMITONES_PER_OCTAVE = 12;
/** Concert A: MIDI note 69 sounds at 440 Hz. */
const A4_MIDI = 69;
const A4_HZ = 440;

/** The pitch class (0 = C … 11 = B) of a MIDI note; works for negatives too. */
export function pcOf(midi: number): number {
  return ((midi % SEMITONES_PER_OCTAVE) + SEMITONES_PER_OCTAVE) % SEMITONES_PER_OCTAVE;
}
export function freqOfSounding(midi: number): number {
  return A4_HZ * Math.pow(2, (midi - A4_MIDI) / SEMITONES_PER_OCTAVE);
}

/* ---------------- note vocabulary ---------------- */

/** Letter and alteration for each pitch class, spelled with sharps … */
const SHARP_LETTERS = ['C', 'C', 'D', 'D', 'E', 'F', 'F', 'G', 'G', 'A', 'A', 'B'];
const SHARP_ALTERATIONS = [0, 1, 0, 1, 0, 0, 1, 0, 1, 0, 1, 0];
/** … and with flats. */
const FLAT_LETTERS = ['C', 'D', 'D', 'E', 'E', 'F', 'G', 'G', 'A', 'A', 'B', 'B'];
const FLAT_ALTERATIONS = [0, -1, 0, -1, 0, 0, -1, 0, -1, 0, -1, 0];

export const SOLF: Record<string, string> = {
  C: 'Do',
  D: 'Re',
  E: 'Mi',
  F: 'Fa',
  G: 'Sol',
  A: 'La',
  B: 'Si',
};
export const SYSNAME: Record<Sys, string> = { en: 'letters', solf: 'solfège' };
/** Position of each letter in the C-major scale: C = 0 … B = 6. */
export const STEP: Record<string, number> = { C: 0, D: 1, E: 2, F: 3, G: 4, A: 5, B: 6 };
/** Pitch classes of the seven natural notes. */
export const NAT = [0, 2, 4, 5, 7, 9, 11];
export const LETTERS = ['C', 'D', 'E', 'F', 'G', 'A', 'B'];
export const NATPC = [0, 2, 4, 5, 7, 9, 11];

/** How a pitch class is written: a letter (`l`) and an alteration (`a`):
    -1 flat, 0 natural, 1 sharp. */
export interface Spelling {
  l: string;
  a: number;
}

export function spell(pc: number, pref: Pref): Spelling {
  return pref === 'flat'
    ? { l: FLAT_LETTERS[pc], a: FLAT_ALTERATIONS[pc] }
    : { l: SHARP_LETTERS[pc], a: SHARP_ALTERATIONS[pc] };
}
export function accGlyph(alteration: number): string {
  if (alteration === 1) {
    return '♯';
  }
  if (alteration === -1) {
    return '♭';
  }
  return '';
}
export function noteName(pc: number, sys: Sys, pref: Pref): string {
  const spelling = spell(pc, pref);
  const letterOrSyllable = sys === 'solf' ? SOLF[spelling.l] : spelling.l;
  return letterOrSyllable + accGlyph(spelling.a);
}
/** Guarded, because every caller reaches it by slicing a number out of a card
    id, and one id that does not carry a number should not print "undefined". */
export function bothNames(pc: number, pref: Pref): string {
  if (!isFinite(pc)) {
    return '?';
  }
  return noteName(pc, 'en', pref) + '  ·  ' + noteName(pc, 'solf', pref);
}
export function otherSys(sys: Sys): Sys {
  return sys === 'en' ? 'solf' : 'en';
}
/** A written pitch with its octave, in the user's spelling: "E2", "F♯3". */
export function midiName(midi: number, pref: Pref = honmoon.settings.pref): string {
  const octave = Math.floor(midi / SEMITONES_PER_OCTAVE) - 1;
  return noteName(pcOf(midi), 'en', pref) + octave;
}

/* ---- movable do and scale degrees ----
   Fixed do above ties a syllable to a letter for ever: Do is always C.
   Movable do ties it to the key instead: Do is whatever the tonic is, and
   the same tune keeps the same syllables in every key. Movable do says Ti,
   not Si, because Si is taken by the raised fifth. */
const MOVABLE_DO_SHARP = ['Do', 'Di', 'Re', 'Ri', 'Mi', 'Fa', 'Fi', 'Sol', 'Si', 'La', 'Li', 'Ti'];
const MOVABLE_DO_FLAT = ['Do', 'Ra', 'Re', 'Me', 'Mi', 'Fa', 'Se', 'Sol', 'Le', 'La', 'Te', 'Ti'];
const DEGREES_SHARP = ['1', '♯1', '2', '♯2', '3', '4', '♯4', '5', '♯5', '6', '♯6', '7'];
const DEGREES_FLAT = ['1', '♭2', '2', '♭3', '3', '4', '♭5', '5', '♭6', '6', '♭7', '7'];

/** Semitones from the key's tonic up to this pitch class (0–11). */
export function relOf(pc: number, keyPc: number): number {
  return pcOf(pc - keyPc);
}
export function mdoName(pc: number, keyPc: number, pref: Pref): string {
  return mdoFromRel(relOf(pc, keyPc), pref);
}
export function degName(pc: number, keyPc: number, pref: Pref): string {
  return degFromRel(relOf(pc, keyPc), pref);
}
export function mdoFromRel(semitonesFromTonic: number, pref: Pref): string {
  return (pref === 'flat' ? MOVABLE_DO_FLAT : MOVABLE_DO_SHARP)[pcOf(semitonesFromTonic)];
}
export function degFromRel(semitonesFromTonic: number, pref: Pref): string {
  return (pref === 'flat' ? DEGREES_FLAT : DEGREES_SHARP)[pcOf(semitonesFromTonic)];
}
/** Keys used for movable-do work: majors out to four accidentals, spelled the
    way a key signature spells them. */
export const MKEYS = [
  { pc: 0, n: 'C' },
  { pc: 7, n: 'G' },
  { pc: 2, n: 'D' },
  { pc: 9, n: 'A' },
  { pc: 4, n: 'E' },
  { pc: 5, n: 'F' },
  { pc: 10, n: 'B♭' },
  { pc: 3, n: 'E♭' },
  { pc: 8, n: 'A♭' },
];
export function keyName(pc: number): string {
  const key = MKEYS.find((k) => k.pc === pc);
  return key ? key.n : noteName(pc, 'en', 'sharp');
}
export function mdoOn(): boolean {
  return !!honmoon.settings.mdo;
}
