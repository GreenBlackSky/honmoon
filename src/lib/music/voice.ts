import { honmoon } from '../store/honmoon.svelte';
import { pickOf } from '../util/random';

/* ---------------- voice ----------------
   A cold voice doing agility work is how people strain, so the stages run in
   a fixed order and only the pattern and syllable inside each one are random. */
export interface VoicePattern {
  id: string;
  n: string;
  iv?: number[];
  /** a siren: how far it slides, in semitones */
  glide?: number;
  beats: number;
  staccato?: boolean;
}
export const VPATS: VoicePattern[] = [
  { id: 'sus', n: 'Sustained', iv: [0], beats: 4 },
  { id: 'p3', n: 'Three-note', iv: [0, 2, 4, 2, 0], beats: 1 },
  { id: 'p5', n: 'Five-note scale', iv: [0, 2, 4, 5, 7, 5, 4, 2, 0], beats: 1 },
  { id: 'tri', n: 'Triad', iv: [0, 4, 7, 4, 0], beats: 1 },
  { id: 'arp', n: 'Arpeggio to the octave', iv: [0, 4, 7, 12, 7, 4, 0], beats: 1 },
  { id: 'oct', n: 'Octave leap', iv: [0, 12, 0], beats: 2 },
  {
    id: 'p9',
    n: 'Nine-note scale',
    iv: [0, 2, 4, 5, 7, 9, 11, 12, 11, 9, 7, 5, 4, 2, 0],
    beats: 0.5,
  },
  { id: 'stac', n: 'Staccato arpeggio', iv: [0, 4, 7, 12, 7, 4, 0], beats: 0.75, staccato: true },
  { id: 'siren', n: 'Siren', glide: 13, beats: 6 },
];
export function vpat(id: string): VoicePattern {
  return VPATS.find((pattern) => pattern.id === id) ?? VPATS[0];
}

/** A sound to make (`s`, e.g. "Lip trill") and a cue for how (`c`). */
export interface VoiceSound {
  s: string;
  c: string;
}
export interface VoiceStage {
  /** key, e.g. "sovt" */
  k: string;
  /** name */
  n: string;
  /** 1 when switched on by default */
  on: 0 | 1;
  /** a breathing stage: timed, with no notes to sing */
  timed?: boolean;
  /** the patterns this stage can use (ids from VPATS) */
  pats?: string[];
  /** what the stage is for */
  d: string;
  sounds: VoiceSound[];
}
export const VSTAGES: VoiceStage[] = [
  {
    k: 'breath',
    n: 'Breath',
    on: 1,
    timed: true,
    d: 'No pitch, just air. Sets the support everything else rests on.',
    sounds: [
      {
        s: 'sss',
        c: 'Hiss on a steady "sss" for the whole count. Even pressure, no fade at the end.',
      },
      {
        s: '4 in, 8 out',
        c: 'In through the nose for four, out on a thin "fff" for eight. Shoulders still.',
      },
      { s: 'shh', c: 'Short, firm "shh" pulses from the belly — four per breath.' },
    ],
  },
  {
    k: 'sovt',
    n: 'Semi-occluded',
    on: 1,
    pats: ['sus', 'p3', 'p5', 'tri'],
    d: 'A partly closed mouth balances the pressure across the folds. The safest thing you can do to a cold voice, and always first.',
    sounds: [
      {
        s: 'Lip trill',
        c: 'Brrr. If it stalls, rest two fingers on your cheeks to take the weight off.',
      },
      { s: 'Tongue trill', c: 'Rolled r. If you cannot roll one, use the lip trill instead.' },
      {
        s: 'Straw (oo)',
        c: 'Sing "oo" through a narrow straw, or just purse your lips into a tiny circle.',
      },
      { s: 'vvv', c: 'A buzzy "v" — feel it in the lips and teeth.' },
      { s: 'zzz', c: 'Voiced "z". Steady buzz, no wobble.' },
      { s: 'Hum (mmm)', c: 'Lips together, teeth apart, jaw loose. Feel the buzz on the lips.' },
      { s: 'ng', c: 'The back of "sing". Tongue up at the soft palate, sound in the nose.' },
    ],
  },
  {
    k: 'fry',
    n: 'Fry and onset',
    on: 1,
    pats: ['sus', 'oct'],
    d: 'Wakes the folds gently and teaches a clean start to a note, without pushing air.',
    sounds: [
      { s: 'Vocal fry', c: 'The lowest creaky rattle you can make. No pushing — almost no air.' },
      {
        s: 'Fry into "ah"',
        c: 'Start in fry, then let it bloom into a tone on the note without a break.',
      },
      { s: 'uh-oh', c: 'A light glottal "uh-oh". Clean onset, no grab.' },
    ],
  },
  {
    k: 'glide',
    n: 'Sirens and glides',
    on: 1,
    pats: ['siren'],
    d: 'One smooth slide through your whole range. Finds the joins between registers and smooths them.',
    sounds: [
      {
        s: 'ng siren',
        c: 'Slide up and down on "ng" like a fire engine. Do not push through the bumps — go lighter.',
      },
      { s: 'Lip trill siren', c: 'Same slide, on a lip trill. Easiest way through the break.' },
      { s: 'oo glide', c: 'Narrow "oo", slide slowly. Keep the volume even top to bottom.' },
    ],
  },
  {
    k: 'vowel',
    n: 'Vowels',
    on: 1,
    pats: ['p5', 'tri', 'arp'],
    d: 'The shapes you actually sing in. Keep the jaw still and let the tongue do the work.',
    sounds: [
      { s: 'ee', c: 'As in "see". Bright, forward, tongue high.' },
      { s: 'eh', c: 'As in "bed". Jaw a touch lower than "ee".' },
      { s: 'ah', c: 'As in "father". Open, but do not drop the jaw as far as it wants to go.' },
      { s: 'oh', c: 'As in "go". Lips rounded, space inside.' },
      { s: 'oo', c: 'As in "boot". Narrow lips, open throat.' },
      { s: 'ee-eh-ah-oh-oo', c: 'One vowel per note, jaw as still as you can keep it.' },
    ],
  },
  {
    k: 'reson',
    n: 'Resonance',
    on: 1,
    pats: ['p5', 'tri', 'p3'],
    d: 'Moves the sound forward so it carries without extra effort.',
    sounds: [
      { s: 'nay', c: 'Deliberately bratty and nasal. It sounds awful alone and fixes placement.' },
      { s: 'mum', c: 'Relaxed and round. Balances out the "nay".' },
      { s: 'goo', c: 'Releases a tight tongue root.' },
      { s: 'ng-ah', c: 'Start on "ng", open to "ah" keeping the same buzz.' },
    ],
  },
  {
    k: 'agility',
    n: 'Agility',
    on: 0,
    pats: ['p9', 'stac', 'arp'],
    d: 'Speed and flexibility. Last, never first — and drop the tempo before you drop the accuracy.',
    sounds: [
      { s: 'ah', c: 'Light and bouncy. Do not let it get heavy at the top.' },
      {
        s: 'hah-hah-hah',
        c: 'A soft "h" on each note, powered from the belly rather than the throat.',
      },
      { s: 'ya', c: 'Quick and forward, tongue relaxed.' },
    ],
  },
];
export function vstage(key: string): VoiceStage {
  return VSTAGES.find((stage) => stage.k === key) ?? (null as unknown as VoiceStage);
}
export function vstageOn(key: string): boolean {
  return !(honmoon.settings.voff || []).includes(key);
}
/** Until a range has been measured: A2 to A4, a span most voices can manage
    somewhere in it. */
const DEFAULT_LOW = 45;
const DEFAULT_HIGH = 69;
/** The singer's comfortable range, or a default until it has been measured. */
export function vRange(): { lo: number; hi: number; set: boolean } {
  const low = honmoon.settings.vlo;
  const high = honmoon.settings.vhi;
  return {
    lo: low ?? DEFAULT_LOW,
    hi: high ?? DEFAULT_HIGH,
    set: low != null && high != null,
  };
}

/* ---------------- the warm-up routine ---------------- */
export interface RoutineStep {
  k: string;
  sound: VoiceSound;
  pat: VoicePattern | null;
}
/** Every stage that is switched on, in the fixed order, each with a sound and
    a pattern drawn at random. */
export function vBuildRoutine(): RoutineStep[] {
  const out: RoutineStep[] = [];
  for (const stage of VSTAGES) {
    if (!vstageOn(stage.k)) {
      continue;
    }
    const sound = pickOf(stage.sounds);
    const pattern = stage.timed ? null : vpat(pickOf(stage.pats!));
    out.push({ k: stage.k, sound, pat: pattern });
  }
  return out;
}
/** How far a pattern climbs above its starting note. */
export function vSpan(pattern: VoicePattern | null): number {
  if (!pattern) {
    return 0;
  }
  if (pattern.glide) {
    return pattern.glide;
  }
  return Math.max(...pattern.iv!);
}
/** Where the pattern can start without taking the top note outside the range. */
export function vStartRange(pattern: VoicePattern | null): { lo: number; hi: number } {
  const range = vRange();
  const highestStart = range.hi - vSpan(pattern);
  return { lo: range.lo, hi: Math.max(range.lo, highestStart) };
}
