/* The shape of everything the apps remember. One payload per app, in the same
   format the original Fretboard Fluency used (`ff.v1`), so progress exported
   from the old app can be imported into any of the new ones unchanged. */

export type Pref = 'sharp' | 'flat';
export type Sys = 'en' | 'solf';
export type ClefId = 'bass' | 'treble' | 'tenor' | 'alto';
export type LevelId = 'l0' | 'l1' | 'l2';
export type RhythmLevelId = 'r1' | 'r2' | 'r3';
export type Theme = 'auto' | 'light' | 'dark';

/** One thing you can be asked about. s = seen, c = correct, t = last seen (ms), k = mastery 0–5. */
export interface Card {
  s: number;
  c: number;
  t: number;
  k: number;
}

/** One calendar day: answers, correct answers, milliseconds spent. */
export interface Day {
  n: number;
  c: number;
  ms: number;
}

export interface TempoEntry {
  d: string;
  bpm: number;
  v: TempoVerdict;
}
export type TempoVerdict = 'clean' | 'sloppy' | 'fast';

/** Tempo tracking for a warm-up family or a rhythm level. */
export interface TempoRec {
  bpm: number;
  best: number;
  n: number;
  hist: TempoEntry[];
}

export interface Settings {
  /* notes */
  pref: Pref;
  level: LevelId;
  acc: boolean;
  clefs: ClefId[];
  mdo: boolean;
  /* screen */
  theme: Theme;
  hints: boolean;
  labels: boolean;
  /* instrument and sound */
  bass: boolean;
  mic: boolean;
  sound: boolean;
  /* daily session */
  slen: number;
  off: string[];
  doff: string[];
  /* scales */
  sen: string[] | null;
  sroots: 'nat' | 'all';
  sstart: 'both' | 'E' | 'A';
  sslen: number;
  sdoff: string[];
  /* ear */
  ivset: 'basic' | 'all';
  /* bass warm-ups */
  woff: string[];
  wlen: number;
  wmode: 'bass' | 'voice';
  /* voice */
  vlo: number | null;
  vhi: number | null;
  voff: string[] | null;
  vtempo: number;
  vgap: boolean;
  /* rhythm */
  rlev: RhythmLevelId;
  rtempo: number;
  rfloor: number;
  rlat: number;
}

export interface Payload {
  v: 1;
  t: number;
  cards: Record<string, Card>;
  daily: Record<string, Day>;
  tempo: Record<string, TempoRec>;
  settings: Settings;
}

export interface HonmoonState {
  cards: Record<string, Card>;
  daily: Record<string, Day>;
  tempo: Record<string, TempoRec>;
  settings: Settings;
  answers: number;
}
