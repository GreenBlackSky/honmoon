import { honmoon } from '../store/honmoon.svelte';
import { LETTERS, NATPC, SEMITONES_PER_OCTAVE, pcOf } from './notes';
import { STRINGS } from './bass';
import { rnd, shuffle } from '../util/random';

export const ROOTS = [
  { pc: 0, l: 'C', a: 0 },
  { pc: 1, l: 'D', a: -1 },
  { pc: 2, l: 'D', a: 0 },
  { pc: 3, l: 'E', a: -1 },
  { pc: 4, l: 'E', a: 0 },
  { pc: 5, l: 'F', a: 0 },
  { pc: 6, l: 'F', a: 1 },
  { pc: 7, l: 'G', a: 0 },
  { pc: 8, l: 'A', a: -1 },
  { pc: 9, l: 'A', a: 0 },
  { pc: 10, l: 'B', a: -1 },
  { pc: 11, l: 'B', a: 0 },
];
const NATURAL_ROOTS = [0, 2, 4, 5, 7, 9, 11];
const ALL_ROOTS = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11];

export interface ScaleDef {
  id: string;
  /** group heading it is listed under */
  g: string;
  /** name */
  n: string;
  /** semitones above the root, one per note */
  iv: number[];
  /** the degree of each note, written with b and # ("b3", "#4") */
  dg: string[];
  /** 1 when switched on by default */
  on: 0 | 1;
  /** one-line description */
  d: string;
}
export const SCALES: ScaleDef[] = [
  {
    id: 'minpent',
    g: 'Pentatonics',
    n: 'Minor pentatonic',
    iv: [0, 3, 5, 7, 10],
    dg: ['1', 'b3', '4', '5', 'b7'],
    on: 1,
    d: 'Five notes and none of them sound wrong. The backbone of rock, blues and most bass fills.',
  },
  {
    id: 'majpent',
    g: 'Pentatonics',
    n: 'Major pentatonic',
    iv: [0, 2, 4, 7, 9],
    dg: ['1', '2', '3', '5', '6'],
    on: 1,
    d: 'The same shape as minor pentatonic three frets lower. Bright, country, pop, gospel.',
  },
  {
    id: 'blues',
    g: 'Pentatonics',
    n: 'Blues scale',
    iv: [0, 3, 5, 6, 7, 10],
    dg: ['1', 'b3', '4', 'b5', '5', 'b7'],
    on: 1,
    d: 'Minor pentatonic plus the flat five. One extra note and all the attitude.',
  },
  {
    id: 'major',
    g: 'Major & minor',
    n: 'Major',
    iv: [0, 2, 4, 5, 7, 9, 11],
    dg: ['1', '2', '3', '4', '5', '6', '7'],
    on: 1,
    d: 'The do-re-mi scale. Everything else in music is described by how it differs from this.',
  },
  {
    id: 'natmin',
    g: 'Major & minor',
    n: 'Natural minor',
    iv: [0, 2, 3, 5, 7, 8, 10],
    dg: ['1', '2', 'b3', '4', '5', 'b6', 'b7'],
    on: 1,
    d: 'The sad one, also called Aeolian. Exactly the notes of the major scale a minor third above.',
  },
  {
    id: 'harmmin',
    g: 'Major & minor',
    n: 'Harmonic minor',
    iv: [0, 2, 3, 5, 7, 8, 11],
    dg: ['1', '2', 'b3', '4', '5', 'b6', '7'],
    on: 0,
    d: 'Natural minor with the seventh raised, which opens a gap you can hear. Classical and neoclassical metal.',
  },
  {
    id: 'melmin',
    g: 'Major & minor',
    n: 'Melodic minor',
    iv: [0, 2, 3, 5, 7, 9, 11],
    dg: ['1', '2', 'b3', '4', '5', '6', '7'],
    on: 0,
    d: 'Minor underneath, major on top. Mostly a jazz scale.',
  },
  {
    id: 'dorian',
    g: 'Modes',
    n: 'Dorian',
    iv: [0, 2, 3, 5, 7, 9, 10],
    dg: ['1', '2', 'b3', '4', '5', '6', 'b7'],
    on: 1,
    d: 'Minor with a raised sixth. Funk, soul and most modal jamming lives here.',
  },
  {
    id: 'mixo',
    g: 'Modes',
    n: 'Mixolydian',
    iv: [0, 2, 4, 5, 7, 9, 10],
    dg: ['1', '2', '3', '4', '5', '6', 'b7'],
    on: 1,
    d: 'Major with a flat seventh — the sound of a dominant chord. Blues, rock, funk.',
  },
  {
    id: 'phryg',
    g: 'Modes',
    n: 'Phrygian',
    iv: [0, 1, 3, 5, 7, 8, 10],
    dg: ['1', 'b2', 'b3', '4', '5', 'b6', 'b7'],
    on: 0,
    d: 'Minor with a flat second. Spanish music and a great deal of metal.',
  },
  {
    id: 'lydian',
    g: 'Modes',
    n: 'Lydian',
    iv: [0, 2, 4, 6, 7, 9, 11],
    dg: ['1', '2', '3', '#4', '5', '6', '7'],
    on: 0,
    d: 'Major with a raised fourth. Floating and unresolved — film scores love it.',
  },
  {
    id: 'locrian',
    g: 'Modes',
    n: 'Locrian',
    iv: [0, 1, 3, 5, 6, 8, 10],
    dg: ['1', 'b2', 'b3', '4', 'b5', 'b6', 'b7'],
    on: 0,
    d: 'Half-diminished and restless. Rare in practice, but it completes the set.',
  },
  {
    id: 'maj',
    g: 'Arpeggios',
    n: 'Major triad',
    iv: [0, 4, 7],
    dg: ['1', '3', '5'],
    on: 1,
    d: 'Three notes that spell a major chord. Most bass lines are made of these, not scales.',
  },
  {
    id: 'min',
    g: 'Arpeggios',
    n: 'Minor triad',
    iv: [0, 3, 7],
    dg: ['1', 'b3', '5'],
    on: 1,
    d: 'The minor chord, note for note.',
  },
  {
    id: 'r5',
    g: 'Arpeggios',
    n: 'Root–fifth–octave',
    iv: [0, 7, 12],
    dg: ['1', '5', '8'],
    on: 1,
    d: 'The two-note bassline that works over almost any chord. Learn it in every key first.',
  },
  {
    id: 'dom7',
    g: 'Arpeggios',
    n: 'Dominant 7',
    iv: [0, 4, 7, 10],
    dg: ['1', '3', '5', 'b7'],
    on: 0,
    d: 'A major triad with a flat seventh on top. The engine of blues and funk.',
  },
  {
    id: 'min7',
    g: 'Arpeggios',
    n: 'Minor 7',
    iv: [0, 3, 7, 10],
    dg: ['1', 'b3', '5', 'b7'],
    on: 0,
    d: 'The smooth one. Soul, neo-soul, half of all jazz.',
  },
  {
    id: 'maj7',
    g: 'Arpeggios',
    n: 'Major 7',
    iv: [0, 4, 7, 11],
    dg: ['1', '3', '5', '7'],
    on: 0,
    d: 'Lush and slightly wistful. Bossa nova, ballads.',
  },
  {
    id: 'dim',
    g: 'Arpeggios',
    n: 'Diminished triad',
    iv: [0, 3, 6],
    dg: ['1', 'b3', 'b5'],
    on: 0,
    d: 'Tense and unstable, built from two minor thirds.',
  },
  {
    id: 'm7b5',
    g: 'Arpeggios',
    n: 'Half-diminished',
    iv: [0, 3, 6, 10],
    dg: ['1', 'b3', 'b5', 'b7'],
    on: 0,
    d: 'The chord before a minor resolution in jazz.',
  },
  {
    id: 'aug',
    g: 'Other',
    n: 'Augmented triad',
    iv: [0, 4, 8],
    dg: ['1', '3', '#5'],
    on: 0,
    d: 'Two major thirds stacked. Symmetrical, so it has no home key.',
  },
  {
    id: 'whole',
    g: 'Other',
    n: 'Whole tone',
    iv: [0, 2, 4, 6, 8, 10],
    dg: ['1', '2', '3', '#4', '#5', '#6'],
    on: 0,
    d: 'Every step the same size. Dreamlike and directionless.',
  },
];
export const SGROUPS = ['Pentatonics', 'Major & minor', 'Modes', 'Arpeggios', 'Other'];

export function scaleDef(id: string): ScaleDef {
  return SCALES.find((scale) => scale.id === id) ?? (null as unknown as ScaleDef);
}
export function rootDef(pc: number) {
  return ROOTS[pcOf(pc)];
}
const ACCIDENTAL_GLYPHS: Record<number, string> = { 1: '♯', 2: '♯♯', [-1]: '♭', [-2]: '♭♭' };
export function accG(alteration: number): string {
  return ACCIDENTAL_GLYPHS[alteration] ?? '';
}
export function rootName(pc: number): string {
  const root = rootDef(pc);
  return root.l + accG(root.a);
}
export function degPretty(degree: string): string {
  return degree.replace(/b/g, '♭').replace(/#/g, '♯');
}

/** One note of a scale in a key: semitones above the root, pitch class, its
    degree ("b3"), and how it is spelled (letter `l`, alteration `a`). */
export interface ScaleNote {
  semis: number;
  pc: number;
  deg: string;
  l: string;
  a: number;
  moved?: boolean;
}
const LETTERS_PER_OCTAVE = 7;
/** Difference between two pitch classes folded into -6 … +5: how far a
    letter's natural note has to be raised (+) or lowered (-) to reach a pitch. */
function alterationBetween(naturalPc: number, targetPc: number): number {
  return ((targetPc - naturalPc + 18) % SEMITONES_PER_OCTAVE) - 6;
}
/** Spell each degree by letter, so F major gets B♭ and B major gets D♯.
    The degree number fixes the letter; the accidental is whatever makes that
    letter land on the right pitch. */
export function scaleNotes(id: string, rootPc: number): ScaleNote[] {
  const scale = scaleDef(id);
  const rootLetterIndex = LETTERS.indexOf(rootDef(rootPc).l);
  return scale.iv.map((semis, i) => {
    const pc = pcOf(rootPc + semis);
    const degreeNumber = +scale.dg[i].match(/^([b#]*)(\d+)$/)![2];
    const letterIndex = (rootLetterIndex + degreeNumber - 1) % LETTERS_PER_OCTAVE;
    return {
      semis,
      pc,
      deg: scale.dg[i],
      l: LETTERS[letterIndex],
      a: alterationBetween(NATPC[letterIndex], pc),
    };
  });
}
export function noteText(note: { l: string | null; a: number | null }): string {
  return note.l === null ? '' : note.l + accG(note.a || 0);
}
export function scaleName(id: string, rootPc: number): string {
  return rootName(rootPc) + ' ' + scaleDef(id).n.toLowerCase();
}
export function scaleOn(id: string): boolean {
  return (honmoon.settings.sen || []).includes(id);
}
export function enabledScales(): ScaleDef[] {
  return SCALES.filter((scale) => scaleOn(scale.id));
}
export function rootPool(): number[] {
  return honmoon.settings.sroots === 'all' ? [...ALL_ROOTS] : [...NATURAL_ROOTS];
}

/** String indices (0 = G, top row) of the strings a scale can start on. */
const E_STRING = 3;
const A_STRING = 2;
function startPool(): number[] {
  const startSetting = honmoon.settings.sstart;
  if (startSetting === 'E') {
    return [E_STRING];
  }
  if (startSetting === 'A') {
    return [A_STRING];
  }
  return [E_STRING, A_STRING];
}
export function randStart(): number {
  const strings = startPool();
  return strings[rnd(strings.length)];
}

/** One note of a fingered shape: string `s`, fret `f`, finger `fin` (0 = open),
    the scale note it plays, and whether the hand shifted to reach it. */
export interface ShapePos {
  s: number;
  f: number;
  fin: number;
  deg: ScaleNote;
  shift: boolean;
}
export interface Shape {
  anchor: number;
  pos: ShapePos[];
  clean: boolean;
}

/** The hand covers four frets: the anchor fret and the three above it. */
const HAND_SPAN = 3;
/** Nothing in a shape is placed above this fret. */
const HIGHEST_SHAPE_FRET = 17;

/** The semitone offsets from the root (over the given number of octaves,
    ending on the top octave) and the scale note each one plays. */
function shapeSteps(id: string, rootPc: number, octaves: number) {
  const scale = scaleDef(id);
  const notes = scaleNotes(id, rootPc);
  const offsets: number[] = [];
  const degrees: ScaleNote[] = [];
  for (let octave = 0; octave < octaves; octave++) {
    for (let i = 0; i < scale.iv.length; i++) {
      /* a scale whose list ends on 12 already carries its octave */
      if (scale.iv[i] === 12 && octave < octaves - 1) {
        continue;
      }
      offsets.push(scale.iv[i] + 12 * octave);
      degrees.push(notes[i]);
    }
  }
  if (offsets[offsets.length - 1] !== 12 * octaves) {
    offsets.push(12 * octaves);
    degrees.push(notes[0]);
  }
  return { offsets, degrees };
}

/** A playable box: anchor the hand, stay on a string until the next note
    leaves the four-fret window, then cross. Try the anchors a bass player
    would actually try, nearest first. */
export function scaleShape(id: string, rootPc: number, startString: number, octaves = 1): Shape {
  const { offsets, degrees } = shapeSteps(id, rootPc, octaves);
  const startOpen = STRINGS[startString].open;
  const rootFret = pcOf(rootPc - pcOf(startOpen));
  /** fret on `string` that plays the note `offset` semitones above the root */
  const fretFor = (string: number, offset: number) =>
    rootFret + offset - (STRINGS[string].open - startOpen);

  /* An open string is free: it needs no finger, so it is playable from any
     hand position. That is why a scale rooted on an open string can sit in a
     window further up the neck than its own root. */
  const inWindow = (fret: number, anchor: number) =>
    fret === 0 || (fret >= anchor && fret <= anchor + HAND_SPAN);

  function placeFrom(anchor: number, allowShift: boolean): Shape | null {
    let string = startString;
    let shiftedAtAll = false;
    const out: ShapePos[] = [];
    for (let k = 0; k < offsets.length; k++) {
      let fret = fretFor(string, offsets[k]);
      // move to a higher string while the note is past the hand and reachable there
      while (fret > anchor + HAND_SPAN && string > 0 && fretFor(string - 1, offsets[k]) >= 0) {
        string--;
        fret = fretFor(string, offsets[k]);
      }
      let shiftedHere = false;
      if (!inWindow(fret, anchor)) {
        if (!allowShift) {
          return null;
        }
        anchor = Math.max(0, fret - HAND_SPAN);
        shiftedHere = true;
        shiftedAtAll = true;
        if (!inWindow(fret, anchor)) {
          return null;
        }
      }
      if (fret < 0 || fret > HIGHEST_SHAPE_FRET) {
        return null;
      }
      const finger = fret === 0 ? 0 : fret - anchor + 1;
      out.push({ s: string, f: fret, fin: finger, deg: degrees[k], shift: shiftedHere });
    }
    return { anchor, pos: out, clean: !shiftedAtAll };
  }

  /* the root under the first finger, then the hand a fret or three lower,
     then a fret or two higher */
  const anchors = [
    rootFret,
    rootFret - 1,
    rootFret - 2,
    rootFret - 3,
    rootFret + 1,
    rootFret + 2,
  ].filter((anchor, i, all) => anchor >= 0 && all.indexOf(anchor) === i);
  for (const anchor of anchors) {
    const shape = placeFrom(anchor, false);
    if (shape) {
      return shape;
    }
  }
  for (const anchor of anchors) {
    const shape = placeFrom(anchor, true);
    if (shape) {
      return shape;
    }
  }
  return placeFrom(Math.max(0, rootFret), true) || { anchor: rootFret, pos: [], clean: false };
}

/** The gaps between consecutive notes of a scale, in semitones, closing the
    loop back to the octave. They always add up to twelve. */
export function scaleSteps(scaleId: string): number[] {
  const intervals = scaleDef(scaleId).iv;
  return intervals.map((semis, i) => (i + 1 < intervals.length ? intervals[i + 1] : 12) - semis);
}
/** Named in whole steps, the vocabulary the explorer teaches, rather than in
    semitones — "7 semitones" was both longer than its slot and in the wrong
    unit for what is being explained. */
const STEP_WORDS: Record<number, string> = {
  0: '',
  1: 'half',
  2: 'whole',
  3: '1½',
  4: 'two',
  5: '2½',
  6: 'three',
  7: '3½',
  8: 'four',
};
export function stepWord(semitones: number): string {
  return STEP_WORDS[semitones] ?? semitones / 2 + ' steps';
}
/** Four notes or fewer is a chord played one note at a time, and asking
    "which scale" of a triad reads like a trick question. */
export function scaleNoun(scaleId: string): 'arpeggio' | 'scale' {
  return scaleDef(scaleId).iv.length <= 4 ? 'arpeggio' : 'scale';
}
/** The fret halfway across the fretted (non-open) notes of a shape. */
export function midFret(positions: { f: number }[]): number {
  const frets = positions.filter((pos) => pos.f > 0).map((pos) => pos.f);
  if (!frets.length) {
    return 0;
  }
  return Math.round((Math.min(...frets) + Math.max(...frets)) / 2);
}

/* ---- scale cards: one per scale in one key ---- */
export function scaleCards(): string[] {
  const roots = rootPool();
  return enabledScales().flatMap((scale) => roots.map((root) => 'sc:' + scale.id + ':' + root));
}
export function parseSC(id: string): { sid: string; root: number } {
  const parts = id.split(':');
  return { sid: parts[1], root: +parts[2] };
}

/** Whether a note may be moved by `direction` (+1 or -1) without giving a
    spelling no one would write (E♯, B♯, C♭, F♭, or a double accidental). */
function spellableMove(note: ScaleNote, direction: number): boolean {
  const alteration = (note.a || 0) + direction;
  if (Math.abs(alteration) > 1) {
    return false;
  }
  if (alteration === 1 && (note.l === 'E' || note.l === 'B')) {
    return false;
  }
  if (alteration === -1 && (note.l === 'C' || note.l === 'F')) {
    return false;
  }
  return true;
}
/** One note of a scale, other than the root, moved a fret up or down on its own
    letter: B♭ to B, C to C♯. Never onto E♯, B♯, C♭ or F♭, and never a double
    sharp or flat — a wrong answer should be wrong in its notes, not in its
    spelling. */
export function alterOne(sid: string, root: number): { k: number; dir: number } | null {
  const notes = scaleNotes(sid, root);
  const candidates: { k: number; dir: number }[] = [];
  for (let k = 1; k < notes.length; k++) {
    if (notes[k].semis >= 12) {
      continue;
    }
    for (const dir of [1, -1]) {
      if (!spellableMove(notes[k], dir)) {
        continue;
      }
      const semis = notes[k].semis + dir;
      const collides = notes.some((other, j) => j !== k && pcOf(other.semis - semis) === 0);
      if (collides || semis <= 0 || semis >= 12) {
        continue;
      }
      candidates.push({ k, dir });
    }
  }
  return candidates.length ? candidates[rnd(candidates.length)] : null;
}
/** A scale's spelling as "letter+alteration" pairs ("B-1 C0 …"), with an
    optional altered note — two scales that sound alike compare equal only if
    they are also written alike. */
export function staffSig(
  scale: { sid: string; alter?: { k: number; dir: number } | null },
  root: number,
): string {
  return scaleNotes(scale.sid, root)
    .map((note, k) => {
      let alteration = note.a || 0;
      if (scale.alter && scale.alter.k === k) {
        alteration += scale.alter.dir;
      }
      return note.l + alteration;
    })
    .join(' ');
}
/** Other scales to offer as wrong answers, best first: the same number of notes
    (so the answer cannot be had by counting), and among those the ones you have
    switched on (so you are tested on what you are learning), then the rest. */
export function scaleAlts(sid: string): ScaleDef[] {
  const noteCount = scaleDef(sid).iv.length;
  const offRanksLast = (scale: ScaleDef) => (scaleOn(scale.id) ? 0 : 1);
  const sameSize = shuffle(SCALES.filter((x) => x.id !== sid && x.iv.length === noteCount));
  const otherSize = shuffle(SCALES.filter((x) => x.id !== sid && x.iv.length !== noteCount));
  sameSize.sort((a, b) => offRanksLast(a) - offRanksLast(b));
  otherSize.sort((a, b) => offRanksLast(a) - offRanksLast(b));
  return sameSize.concat(otherSize);
}
