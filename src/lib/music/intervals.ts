import { honmoon } from '../store/honmoon.svelte';

export interface IntervalDef {
  /** size in semitones */
  s: number;
  /** name, e.g. "Perfect 5th" */
  n: string;
  /** abbreviation, e.g. "P5" */
  ab: string;
  /** what it looks and sounds like */
  c: string;
}
export const IVS: IntervalDef[] = [
  { s: 0, n: 'Unison', ab: 'P1', c: 'The same note twice.' },
  {
    s: 1,
    n: 'Minor 2nd',
    ab: 'm2',
    c: 'One fret. The most uncomfortable gap there is — horror films live here.',
  },
  { s: 2, n: 'Major 2nd', ab: 'M2', c: 'Two frets. One step of a scale.' },
  { s: 3, n: 'Minor 3rd', ab: 'm3', c: 'Three frets. The interval that makes a chord minor.' },
  { s: 4, n: 'Major 3rd', ab: 'M3', c: 'Four frets. The interval that makes a chord major.' },
  {
    s: 5,
    n: 'Perfect 4th',
    ab: 'P4',
    c: 'Five frets — the same note on the next string up. Opening of the wedding march.',
  },
  {
    s: 6,
    n: 'Tritone',
    ab: 'TT',
    c: 'Six frets, dead centre of the octave. Restless, wants to resolve.',
  },
  {
    s: 7,
    n: 'Perfect 5th',
    ab: 'P5',
    c: 'Seven frets. Opening of Twinkle Twinkle. The most stable interval after the octave.',
  },
  { s: 8, n: 'Minor 6th', ab: 'm6', c: 'Eight frets. A minor 3rd turned upside down.' },
  { s: 9, n: 'Major 6th', ab: 'M6', c: 'Nine frets. Bright and open.' },
  { s: 10, n: 'Minor 7th', ab: 'm7', c: 'Ten frets. The top note of a dominant chord.' },
  {
    s: 11,
    n: 'Major 7th',
    ab: 'M7',
    c: 'Eleven frets. One fret short of the octave and it aches for it.',
  },
  { s: 12, n: 'Octave', ab: 'P8', c: 'Twelve frets. The same note, higher.' },
];
export function ivDef(semitones: number): IntervalDef {
  return IVS.find((interval) => interval.s === semitones) ?? IVS[0];
}
/** Every interval from a minor second to the octave, in semitones. */
const ALL_INTERVALS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];
/** The starter set: 2nd, minor and major 3rd, 4th, 5th, octave. */
const BASIC_INTERVALS = [2, 3, 4, 5, 7, 12];
export function ivPool(): number[] {
  return honmoon.settings.ivset === 'all' ? [...ALL_INTERVALS] : [...BASIC_INTERVALS];
}

export interface ChordDef {
  id: string;
  /** name, e.g. "Minor" */
  n: string;
  /** semitones above the root, e.g. [0, 3, 7] */
  iv: number[];
  /** 1 when part of the starter set */
  basic: 0 | 1;
}
export const CHORDS: ChordDef[] = [
  { id: 'maj', n: 'Major', iv: [0, 4, 7], basic: 1 },
  { id: 'min', n: 'Minor', iv: [0, 3, 7], basic: 1 },
  { id: 'dom7', n: 'Dominant 7', iv: [0, 4, 7, 10], basic: 0 },
  { id: 'min7', n: 'Minor 7', iv: [0, 3, 7, 10], basic: 0 },
  { id: 'maj7', n: 'Major 7', iv: [0, 4, 7, 11], basic: 0 },
  { id: 'dim', n: 'Diminished', iv: [0, 3, 6], basic: 0 },
  { id: 'aug', n: 'Augmented', iv: [0, 4, 8], basic: 0 },
];
export function chPool(): ChordDef[] {
  return CHORDS.filter((chord) => honmoon.settings.ivset === 'all' || chord.basic);
}
export function chDef(id: string): ChordDef {
  return CHORDS.find((chord) => chord.id === id) ?? CHORDS[0];
}
/** Interval and chord cards: "iv:7" is a fifth, "ch:min" a minor chord. */
export function earCards(): string[] {
  return [
    ...ivPool().map((semitones) => 'iv:' + semitones),
    ...chPool().map((chord) => 'ch:' + chord.id),
  ];
}
