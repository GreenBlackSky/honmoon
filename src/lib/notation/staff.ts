import type { Pref } from '../store/types';
import { honmoon, mastery } from '../store/honmoon.svelte';
import { GB, accPath, gMid, gPath, stemSVG } from './glyphs';
import { STEP, noteName, pcOf } from '../music/notes';
import { clefDef, enabledClefs, staffNotesFor, staffPos } from '../music/clefs';
import { degPretty, noteText, scaleName, scaleNotes, type ScaleNote } from '../music/scales';
import { esc } from '../util/text';
import { masteryColour, monoLabel, staffLines } from './svg';

/* ---------------- clefs + staff ----------------
   A clef says which staff position its origin sits on: the F line for the F
   clef, the G line for the G clef, and whichever line a C clef is centred on. */
const CLEFG: Record<string, ['fClef' | 'gClef' | 'cClef', number]> = {
  bass: ['fClef', 10],
  treble: ['gClef', 30],
  alto: ['cClef', 20],
  tenor: ['cClef', 10],
};
/** Distance from the left edge of the staff to the clef. */
const CLEF_X = 3;
/** The staff's middle line: stems point away from it. */
const MIDDLE_LINE_Y = 20;
const BOTTOM_LINE_Y = 40;
const LINE_GAP = 10;
const ACCENT = 'var(--accent)';

function clefGlyph(clef?: string) {
  return CLEFG[clef || 'bass'] || CLEFG.bass;
}
export function clefSVG(clef?: string): string {
  const [glyph, y] = clefGlyph(clef);
  return gPath(glyph, CLEF_X, y);
}
/** How wide the clef glyph is, so notes never collide with it. */
export function clefW(clef?: string): number {
  return CLEF_X + GB[clefGlyph(clef)[0]][1];
}
function ledgerLine(y: number, noteX: number, halfWidth: number): string {
  return `<line x1="${noteX - halfWidth}" y1="${y}" x2="${noteX + halfWidth}" y2="${y}" stroke="var(--staff-line)" stroke-width="1.3"/>`;
}
/** The ledger lines a note at height `y` needs, below or above the staff. */
export function ledgersFor(y: number, noteX: number, halfWidth: number): string {
  const out: string[] = [];
  if (y > BOTTOM_LINE_Y) {
    const lowest = Math.floor(y / LINE_GAP) * LINE_GAP;
    for (let ledgerY = BOTTOM_LINE_Y + LINE_GAP; ledgerY <= lowest; ledgerY += LINE_GAP) {
      out.push(ledgerLine(ledgerY, noteX, halfWidth));
    }
  }
  if (y < 0) {
    const highest = Math.ceil(y / LINE_GAP) * LINE_GAP;
    for (let ledgerY = -LINE_GAP; ledgerY >= highest; ledgerY -= LINE_GAP) {
      out.push(ledgerLine(ledgerY, noteX, halfWidth));
    }
  }
  return out.join('');
}
/** A notehead with its ledger lines, stem and accidental, in one colour. */
function noteWithStem(
  noteX: number,
  y: number,
  alteration: number,
  ledgerHalfWidth: number,
  colour: string | null = null,
): string {
  return (
    ledgersFor(y, noteX, ledgerHalfWidth) +
    gMid('noteheadBlack', noteX, y, colour) +
    stemSVG(noteX, y, MIDDLE_LINE_Y, colour) +
    accPath(alteration, noteX, y, colour)
  );
}

/** One note on a staff, for the reading drills. */
export function staffSVG(writtenMidi: number, pref: Pref, clef = 'bass'): string {
  clef = clef || 'bass';
  const pos = staffPos(writtenMidi, pref, clef);
  const noteX = 86;
  const staffWidth = 120;
  return (
    `<svg viewBox="-2 -46 124 118" role="img" aria-label="note on the ${clef} staff">` +
    clefSVG(clef) +
    staffLines(staffWidth) +
    noteWithStem(noteX, pos.y, pos.a, 12) +
    '</svg>'
  );
}

/* One staff carrying a run of notes, each labelled in both systems. */
export const RUN = { x0: 52, dx: 44, H: 158, top: -48 };
/** Room after the last note. */
const RUN_END_MARGIN = 14;
/** The run is drawn a quarter larger than its viewBox. */
const RUN_SCALE = 1.25;
export function runX0(clef: string): number {
  return Math.max(RUN.x0, clefW(clef) + 14);
}
export function runWidth(noteCount: number, clef: string): number {
  return runX0(clef) + noteCount * RUN.dx + RUN_END_MARGIN;
}
export function staffRunSVG(
  midis: number[],
  pref: Pref,
  selected: number,
  showLabels: boolean,
  clef = 'bass',
): string {
  clef = clef || 'bass';
  const firstX = runX0(clef);
  const width = runWidth(midis.length, clef);
  const selectedIndex = midis.indexOf(selected);
  const parts = [clefSVG(clef)];
  /* the selected column goes down first, so the staff lines stay drawn across it */
  if (selectedIndex >= 0) {
    const columnX = firstX + selectedIndex * RUN.dx - 19;
    parts.push(
      `<rect x="${columnX}" y="-40" width="38" height="140" rx="7" fill="${ACCENT}" opacity="0.14"/>`,
    );
  }
  parts.push(staffLines(width - 6));
  midis.forEach((midi, k) => {
    const pos = staffPos(midi, pref, clef);
    const noteX = firstX + k * RUN.dx;
    const isSelected = selected === midi;
    parts.push(noteWithStem(noteX, pos.y, pos.a, 11, isSelected ? ACCENT : null));
    if (showLabels !== false) {
      const letter = noteName(pcOf(midi), 'en', pref);
      const syllable = noteName(pcOf(midi), 'solf', pref);
      parts.push(monoLabel(noteX, 80, 15, isSelected ? ACCENT : 'var(--ink)', letter, true));
      parts.push(monoLabel(noteX, 97, 13, 'var(--ink-3)', syllable));
    }
  });
  const size = `width="${Math.round(width * RUN_SCALE)}" height="${Math.round(RUN.H * RUN_SCALE)}"`;
  return (
    `<svg viewBox="-2 ${RUN.top} ${width} ${RUN.H}" ${size} role="img" aria-label="notes on the ${clef} staff">` +
    parts.join('') +
    '</svg>'
  );
}

/* ---------------- a scale on the staff, for the degree pages and drills ----
   One octave on the bass staff, spelled by letter (so F major gets B♭ even
   when you have sharps selected), with the letter and the degree written
   under each note. `mark` lists semitone offsets to pick out. */

/** A written octave for a root that keeps one octave of it on the bass staff
    with no more than a ledger line or so either way: E2 up to D♯3. */
export function degRootWritten(pc: number): number {
  const lowestRoot = 40; // E2
  let midi = 36 + pc; // C2 + pc
  while (midi < lowestRoot) {
    midi += 12;
  }
  return midi;
}
export interface DegStaffOpts {
  /** 'both' (letters and degrees, the default), 'letters', or 'none' — a
      reading question must not print its own answer underneath. */
  labels?: 'both' | 'letters' | 'none';
  alter?: { k: number; dir: number } | null;
}
/** The scale's notes up to and including the octave, with one note moved
    when `alter` asks for it (for the spot-the-wrong-note drill). */
function scaleWithOctave(
  sid: string,
  rootPc: number,
  alter: { k: number; dir: number } | null | undefined,
): ScaleNote[] {
  const base = scaleNotes(sid, rootPc);
  /* a few entries (root–fifth–octave) already list the octave themselves */
  const notes: ScaleNote[] = base.some((note) => note.semis === 12)
    ? base
    : base.concat([{ semis: 12, pc: rootPc, deg: '8', l: base[0].l, a: base[0].a }]);
  if (!alter) {
    return notes;
  }
  return notes.map((note, k) =>
    k !== alter.k
      ? note
      : {
          semis: note.semis + alter.dir,
          pc: pcOf(note.pc + alter.dir),
          deg: '?',
          l: note.l,
          a: (note.a || 0) + alter.dir,
          moved: true,
        },
  );
}
/** Height of the degree staff for each labelling: room for none, one or two rows. */
const DEG_STAFF_HEIGHT = { none: 112, letters: 128, both: 150 };
export function degStaffSVG(
  sid: string,
  rootPc: number,
  rootWritten?: number | null,
  mark?: number[] | null,
  options: DegStaffOpts = {},
): string {
  const labels = options.labels || 'both';
  const rootMidi = rootWritten ?? degRootWritten(rootPc);
  const notes = scaleWithOctave(sid, rootPc, options.alter);
  const clef = 'bass';
  const bottomLineStep = clefDef(clef).bot;
  /* A fixed width, wide enough for a seven-note scale and its octave. Sized
     to the notes instead, a triad was drawn half again as large as a scale
     beside it — and when three staves are offered side by side, the odd one
     out by size is an answer given away. */
  const firstX = clefW(clef) + 22;
  const noteGap = 40;
  const width = Math.max(firstX + notes.length * noteGap, firstX + 8 * noteGap);
  const height = DEG_STAFF_HEIGHT[labels];
  const parts = [clefSVG(clef), staffLines(width - 4)];
  notes.forEach((note, k) => {
    // the height comes from the letter, not the pitch: B♭ sits on the B line
    const naturalMidi = rootMidi + note.semis - (note.a || 0);
    const octave = Math.floor(naturalMidi / 12) - 1;
    const diatonicIndex = octave * 7 + STEP[note.l];
    const y = BOTTOM_LINE_Y - (diatonicIndex - bottomLineStep) * 5;
    const noteX = firstX + k * noteGap;
    const marked = !!mark && mark.includes(note.semis % 12) && note.semis < 12;
    const colour = marked ? ACCENT : null;
    if (marked) {
      parts.push(
        `<rect x="${noteX - 16}" y="-34" width="32" height="${height - 10}" rx="7" fill="${ACCENT}" opacity="0.13"/>`,
      );
    }
    /* No natural sign on a moved note. These staves carry no key signature, so
       a plain B already means B — and a natural sign would be the one mark no
       real scale here ever shows, pointing straight at the wrong answer. */
    parts.push(noteWithStem(noteX, y, note.a || 0, 11, colour));
    if (labels !== 'none') {
      parts.push(monoLabel(noteX, 80, 14, colour ?? 'var(--ink)', esc(noteText(note)), true));
    }
    if (labels === 'both') {
      parts.push(monoLabel(noteX, 98, 13, colour ?? 'var(--ink-3)', degPretty(note.deg)));
    }
  });
  const label =
    labels === 'none'
      ? 'a scale on the bass staff'
      : esc(scaleName(sid, rootPc)) + ' with its degrees';
  /* Scaled to the card rather than scrolled: a teaching picture whose last
     note is hidden off to the right reads as a scale with a note missing. */
  return (
    `<div class="dfit"><svg viewBox="-2 -44 ${width + 4} ${height}" role="img" aria-label="${label}">` +
    parts.join('') +
    '</svg></div>'
  );
}

/* ---------------- a staff heat map ----------------
   The reading counterpart to the neck map. One notehead per note you can be
   asked for on that clef, in pitch order, shaded by how solid it is. Pitch on
   a staff is a vertical position, so the picture only means anything drawn on
   a real staff — a row of squares would throw away the one thing the drill is
   training. */
const HST = { dx: 30, H: 152, top: -52 };
const HEAT_SCALE = 1.1;
export function heatStaffSVG(clef: string): string {
  const pref = honmoon.settings.pref;
  const notes = staffNotesFor(clef as never);
  if (!notes.length) {
    return '';
  }
  const firstX = Math.max(36, clefW(clef) + 14);
  const width = firstX + notes.length * HST.dx + 12;
  const parts = [clefSVG(clef), staffLines(width - 8)];
  notes.forEach((note, k) => {
    const pos = staffPos(note.m, pref, clef);
    const noteX = firstX + k * HST.dx;
    const card = honmoon.cards[note.id];
    const fill =
      !card || !card.s ? 'var(--line-2)' : masteryColour(mastery(note.id), 'var(--surface)');
    parts.push(ledgersFor(pos.y, noteX, 10));
    parts.push(gMid('noteheadBlack', noteX, pos.y, fill));
    parts.push(accPath(pos.a, noteX, pos.y, fill));
    parts.push(monoLabel(noteX, 80, 12, 'var(--ink-3)', esc(noteName(pcOf(note.m), 'en', pref))));
  });
  const size = `width="${Math.round(width * HEAT_SCALE)}" height="${Math.round(HST.H * HEAT_SCALE)}"`;
  return (
    `<svg viewBox="-2 ${HST.top} ${width} ${HST.H}" ${size} role="img" aria-label="how solid each note on the ${clef} staff is">` +
    parts.join('') +
    '</svg>'
  );
}
export function heatStaffClefs(): string[] {
  return enabledClefs();
}
