import type { Pref } from '../store/types';
import { noteName, pcOf } from '../music/notes';
import { esc } from '../util/text';

/* ---------------- piano keyboard ----------------
   Built to the shape the engine wants: geometry and drawing are pure, nothing
   here reads the app's honmoon, and every use passes what it needs in. Four
   modes — display (lit keys), input (taps answer), play (taps sound), follow
   (lit from outside while audio runs).

   The black keys are not evenly spaced, and spacing them evenly reads as
   wrong even to people who cannot say why. Real geometry: inside the C–E
   group the three white fronts are equal, and so are the four in F–B, which
   puts the black keys where a piano puts them. */
/** A white key's width and height; a black key's width and height as
    fractions of a white key's. */
export const KB = { w: 42, h: 150, bw: 0.583, bh: 0.62 };
/** Pitch classes of the white keys. */
const KBW = [0, 2, 4, 5, 7, 9, 11];
/** Each black key: its pitch class and its left edge, in white-key widths
    from the C. */
const KBB: [number, number][] = [
  [1, 0.611],
  [3, 1.806],
  [6, 3.5625],
  [8, 4.708],
  [10, 5.854],
];
const WHITE_KEYS_PER_OCTAVE = 7;
/** Without a lowest note asked for, the board starts on C3. */
const DEFAULT_LOW = 48;

/** A lit key: `midi` matches one key, `pc` the same note in every octave —
    which is what a question about a note rather than a pitch wants. */
export interface KeyCell {
  midi?: number;
  pc?: number;
  fill?: string;
  label?: string;
  tc?: string;
}
export interface KeyboardOpts {
  /** lowest note wanted; the board starts on the C at or below it */
  lo?: number;
  oct?: number;
  w?: number;
  h?: number;
  cells?: KeyCell[];
  labels?: 'letters' | 'all' | null;
  pref?: Pref;
  alt?: string;
}
export interface KeyBox {
  midi: number;
  black: boolean;
  x: number;
  w: number;
  h: number;
}

function kbWhites(octaves: number): number {
  return WHITE_KEYS_PER_OCTAVE * octaves + 1; /* the top C closes the octave */
}
export function kbDims(options: KeyboardOpts) {
  const whiteCount = kbWhites(options.oct || 1);
  const keyWidth = options.w || KB.w;
  return { n: whiteCount, w: keyWidth, W: whiteCount * keyWidth, H: options.h || KB.h };
}
/** A sensible octave to draw for a given note: the C at or below it. */
export function kbBase(midi: number): number {
  return Math.floor(midi / 12) * 12;
}
/** A keyboard always starts on a C: the pattern of black keys only makes sense
    measured from one. Ask for a board around A and you get the C below it with
    the A lit, not a board whose white keys are labelled A B C♯. */
function kbLo(options: KeyboardOpts): number {
  return kbBase(options.lo ?? DEFAULT_LOW);
}
/** Every key in the drawn range, with its own box, in one list. White first so
    the black ones paint over them; the tap layer reuses the same order. */
export function kbKeys(options: KeyboardOpts): KeyBox[] {
  const dims = kbDims(options);
  const lowC = kbLo(options);
  const octaves = options.oct || 1;
  const out: KeyBox[] = [];
  const white = (midi: number, whiteIndex: number) =>
    out.push({ midi, black: false, x: whiteIndex * dims.w, w: dims.w, h: dims.H });
  for (let octave = 0; octave < octaves; octave++) {
    KBW.forEach((pc, i) => white(lowC + 12 * octave + pc, WHITE_KEYS_PER_OCTAVE * octave + i));
  }
  white(lowC + 12 * octaves, WHITE_KEYS_PER_OCTAVE * octaves);
  for (let octave = 0; octave < octaves; octave++) {
    for (const [pc, leftEdge] of KBB) {
      out.push({
        midi: lowC + 12 * octave + pc,
        black: true,
        x: (WHITE_KEYS_PER_OCTAVE * octave + leftEdge) * dims.w,
        w: KB.bw * dims.w,
        h: dims.H * KB.bh,
      });
    }
  }
  return out;
}
/** The lit-key entry that applies to a key: by exact pitch, or by pitch class. */
export function kbLook(cells: KeyCell[] | undefined, key: KeyBox): KeyCell | null {
  const matches = (cell: KeyCell) =>
    cell.midi != null ? cell.midi === key.midi : pcOf(key.midi) === pcOf(cell.pc as number);
  return (cells || []).find(matches) ?? null;
}
/** The text written on a key: the lit entry's own label, or the note name
    when labels are on (black keys too, unless only the letters are wanted). */
function keyLabel(cell: KeyCell | null, key: KeyBox, options: KeyboardOpts): string {
  if (cell && cell.label != null) {
    return cell.label;
  }
  const name = noteName(pcOf(key.midi), 'en', options.pref || 'sharp');
  if (options.labels === 'letters') {
    return name;
  }
  if (options.labels === 'all' && !key.black) {
    return name;
  }
  return '';
}
/** Label colour is fixed, not themed: the keys are light and dark in both
    themes, so an --ink that flips would vanish on one of them. */
function labelColour(cell: KeyCell | null, key: KeyBox): string {
  if (cell && cell.tc) {
    return cell.tc;
  }
  if (cell) {
    return 'var(--pk-lit-ink)';
  }
  return key.black ? 'var(--pk-b-ink)' : 'var(--pk-w-ink)';
}
function keyRect(key: KeyBox, cell: KeyCell | null): string {
  const plainFill = key.black ? 'var(--pk-b)' : 'var(--pk-w)';
  const fill = cell ? cell.fill || 'var(--accent)' : plainFill;
  const radius = key.black ? 4 : 5;
  const border = key.black ? 0.8 : 1;
  return `<rect x="${(key.x + 0.6).toFixed(2)}" y="0" width="${(key.w - 1.2).toFixed(2)}" height="${key.h.toFixed(1)}" rx="${radius}" ry="${radius}" fill="${fill}" stroke="var(--pk-line)" stroke-width="${border}"/>`;
}
function keyText(key: KeyBox, label: string, colour: string): string {
  const x = (key.x + key.w / 2).toFixed(2);
  const y = (key.h - (key.black ? 8 : 10)).toFixed(1);
  const size = key.black ? 10 : 12;
  return `<text x="${x}" y="${y}" text-anchor="middle" font-size="${size}" font-weight="600" font-family="IBM Plex Mono,monospace" fill="${colour}">${esc(String(label))}</text>`;
}
export function kbSVG(options: KeyboardOpts = {}): string {
  const dims = kbDims(options);
  const parts: string[] = [];
  for (const key of kbKeys(options)) {
    const cell = kbLook(options.cells, key);
    parts.push(keyRect(key, cell));
    const label = keyLabel(cell, key, options);
    if (label !== '' && label != null) {
      parts.push(keyText(key, label, labelColour(cell, key)));
    }
  }
  return (
    `<svg viewBox="0 0 ${dims.W} ${dims.H}" width="${dims.W}" height="${dims.H}" role="img" aria-label="${esc(options.alt || 'piano keyboard')}">` +
    parts.join('') +
    '</svg>'
  );
}
