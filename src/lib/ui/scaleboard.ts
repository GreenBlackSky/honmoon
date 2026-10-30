import { honmoon, mastery } from '../store/honmoon.svelte';
import { STRINGS } from '../music/bass';
import { pcOf } from '../music/notes';
import {
  SCALES,
  accG,
  degPretty,
  enabledScales,
  noteText,
  rootDef,
  rootName,
  rootPool,
  scaleCards,
  scaleDef,
  scaleName,
  scaleNotes,
  scaleShape,
  scaleSteps,
  stepWord,
  midFret,
  type ScaleNote,
  type Shape,
} from '../music/scales';
import { fretboardSVG, type FretCell } from '../notation/fretboard';
import { NUMWORD, esc } from '../util/text';

/* Static teaching pictures and tables built from the scale model. They are
   strings rather than components because nothing in them is interactive, and
   it keeps them comparable, byte for byte, with the original app's. */

const ACCENT = 'var(--accent)';
const ACCENT_INK = 'var(--accent-ink)';
const isRootNote = (semis: number) => semis % 12 === 0;

/** The last fret to draw so every given fret shows: at least 12, at most 17. */
export function boardTopFor(frets: number[]): number {
  return Math.max(12, Math.min(17, Math.max(...frets) + 1));
}
const boardTop = (shape: Shape) => boardTopFor(shape.pos.map((pos) => pos.f));
/** What is written on a note of the playable box. */
function boxLabel(pos: Shape['pos'][number], mode: 'deg' | 'note' | 'fin'): string {
  if (mode === 'deg') {
    return degPretty(pos.deg.deg);
  }
  if (mode === 'fin') {
    return pos.f === 0 ? '0' : String(pos.fin);
  }
  return noteText(pos.deg);
}

/** Every tone of a scale on the neck, quietly, with one playable box on top. */
export function scaleBoard(
  sid: string,
  root: number,
  start: number,
  mode: 'deg' | 'note' | 'fin',
  extra?: FretCell[],
) {
  const shape: Shape = scaleShape(sid, root, start, 1);
  const byPc: Record<number, ScaleNote> = {};
  for (const note of scaleNotes(sid, root)) {
    byPc[note.pc] = note;
  }
  const lo = 0;
  const hi = boardTop(shape);
  const cells: FretCell[] = [];
  // every place the scale's notes occur: rings, the roots in the accent colour
  for (let string = 0; string < STRINGS.length; string++) {
    for (let fret = lo; fret <= hi; fret++) {
      const note = byPc[pcOf(STRINGS[string].open + fret)];
      if (!note) {
        continue;
      }
      const isRoot = isRootNote(note.semis);
      cells.push({
        s: string,
        f: fret,
        fill: 'none',
        stroke: isRoot ? ACCENT : 'var(--ink-3)',
        sw: isRoot ? 2 : 1.2,
        r: 8,
      });
    }
  }
  // the box itself, filled and labelled
  for (const pos of shape.pos) {
    const isRoot = isRootNote(pos.deg.semis);
    cells.push({
      s: pos.s,
      f: pos.f,
      fill: isRoot ? ACCENT : 'var(--good)',
      r: 11,
      label: boxLabel(pos, mode),
      fs: mode === 'note' ? 11 : 12,
      tc: isRoot ? ACCENT_INK : 'var(--bg)',
    });
  }
  if (extra) {
    cells.push(...extra);
  }
  return { cells, shape, lo, hi, cf: midFret(shape.pos) };
}

/** Notes with the gap between them written in, so the recipe is visible. */
export function stepRowHTML(sid: string, root: number): string {
  const notes = scaleNotes(sid, root);
  const steps = scaleSteps(sid);
  const last = notes[notes.length - 1];
  /* A scale whose own list already ends on the octave closes the loop with a
     step of nothing. Drawing that gave a "0" circle and a second copy of the
     root, which reads as a mistake rather than as arriving home. */
  const endsOnOctave = notes.length && isRootNote(last.semis) && last.semis > 0;
  const parts = ['<div class="steprow">'];
  notes.forEach((note, i) => {
    const isTop = endsOnOctave && i === notes.length - 1;
    const rootClass = isRootNote(note.semis) ? ' root' : '';
    const degree = isTop ? '8' : degPretty(note.deg);
    parts.push(`<span class="sn${rootClass}"><b>${esc(noteText(note))}</b><i>${degree}</i></span>`);
    if (steps[i] > 0) {
      parts.push(stepGap(steps[i]));
    }
  });
  if (!endsOnOctave) {
    parts.push(`<span class="sn root"><b>${esc(noteText(notes[0]))}</b><i>8</i></span>`);
  }
  parts.push('</div>');
  return '<div class="fbwrap">' + parts.join('') + '</div>';
}
function stepGap(semitones: number): string {
  return `<span class="sg"><b>${semitones}</b><i>${stepWord(semitones)}</i></span>`;
}
/** The steps of a scale with the notes left blank: root, gaps, octave. Just
    the gaps, in order, with the root and octave as small end marks: a row of
    note boxes wrapped onto three lines on a phone, and a pattern you have to
    read across three lines is not a pattern any more. */
export function stepsOnlyHTML(sid: string): string {
  const gaps = scaleSteps(sid)
    .filter((step) => step > 0)
    .map(stepGap)
    .join('');
  return `<div class="steponly"><span class="se">1</span>${gaps}<span class="se">8</span></div>`;
}
/** What the keyboard picture is actually showing for this scale: where its
    half steps fall, named, or that it has none — which is the whole character
    of a pentatonic and worth saying out loud rather than implying. */
export function kbHalfStepLine(sid: string, root: number): string {
  const notes = scaleNotes(sid, root);
  const steps = scaleSteps(sid);
  const halfSteps: string[] = [];
  steps.forEach((step, i) => {
    if (step === 1) {
      halfSteps.push(noteText(notes[i]) + '–' + noteText(notes[(i + 1) % notes.length]));
    }
  });
  if (!halfSteps.length && scaleDef(sid).iv.length <= 4) {
    return 'An arpeggio is a chord strung out in a line, so the gaps are wide: these are only the notes the chord is built from.';
  }
  if (!halfSteps.length) {
    return (
      'This one has no half steps at all — every lit key has at least one key between it and the next. ' +
      'That even spacing is why it is so hard to play a wrong note with.'
    );
  }
  const where =
    halfSteps.length === 1
      ? 'step is the one place'
      : 'steps are the ' + (NUMWORD[halfSteps.length] || halfSteps.length) + ' places';
  return (
    'Its half ' +
    where +
    ' two lit keys touch with nothing between them: <b>' +
    halfSteps.join('</b> and <b>') +
    '</b>. ' +
    'That pattern, not the letters, is what makes the scale sound as it does.'
  );
}

/* ---------------- reading scale degrees ---------------- */
/** The major scale, in semitones: the plain numbers on the ruler. */
export const MAJIV = [0, 2, 4, 5, 7, 9, 11];
/** What each of the twelve semitones above the root is called as a degree. */
export const RULER = [
  ['1'],
  ['♭2'],
  ['2'],
  ['♭3'],
  ['3'],
  ['4'],
  ['♯4', '♭5'],
  ['5'],
  ['♭6'],
  ['6'],
  ['♭7'],
  ['7'],
];
/** The last (flat) name of a semitone on the ruler: ♭5 rather than ♯4. */
const rulerName = (semis: number) => RULER[semis][RULER[semis].length - 1];
/** A scale's degree names, by semitones above the root. */
function degreeLabels(sid: string | null, belowOctaveOnly: boolean): Record<number, string> {
  const labels: Record<number, string> = {};
  const scale = sid ? scaleDef(sid) : null;
  scale?.iv.forEach((semis, k) => {
    if (!belowOctaveOnly || semis < 12) {
      labels[semis] = degPretty(scale.dg[k]);
    }
  });
  return labels;
}

/** The twelve frets from a root, as a strip. The seven plain numbers are the
    major scale; everything in between is a flattened or sharpened one. Pass a
    scale to fill in only its members, labelled the way that scale spells them. */
export function degRuler(
  sid: string | null,
  options: { compact?: boolean; frets?: boolean; mark?: number[] } = {},
): string {
  const labels = degreeLabels(sid, true);
  const parts = ['<div class="druler' + (options.compact ? ' compact' : '') + '">'];
  for (let semis = 0; semis < 12; semis++) {
    const inMajor = MAJIV.includes(semis);
    const lit = sid ? labels[semis] != null : true;
    const label = sid ? labels[semis] || '' : RULER[semis].join('<br>');
    const marked = options.mark && options.mark.includes(semis);
    const classes =
      'dr' + (inMajor ? ' maj' : ' alt') + (lit ? ' on' : '') + (marked ? ' mark' : '');
    const fretNumber = options.frets ? `<i>${semis}</i>` : '';
    parts.push(`<span class="${classes}"><b>${label}</b>${fretNumber}</span>`);
  }
  parts.push('</div>');
  return parts.join('');
}
/** Where each degree sits under the hand with the root on the E string: a
    one-octave map that never changes shape, because every fret is a semitone.
    Each entry: string, frets from the root, semitones above the root. With a
    scale chosen, its members are filled and the rest drop to rings. */
const DEGMAP = [
  [3, 0, 0],
  [3, 1, 1],
  [3, 2, 2],
  [3, 3, 3],
  [2, -1, 4],
  [2, 0, 5],
  [2, 1, 6],
  [2, 2, 7],
  [2, 3, 8],
  [1, -1, 9],
  [1, 0, 10],
  [1, 1, 11],
  [1, 2, 12],
];
export function degMapSVG(sid: string | null, rootFret: number): string {
  const labels = degreeLabels(sid, false);
  const cells: FretCell[] = DEGMAP.map(([string, fromRoot, semis]) => {
    const fret = rootFret + fromRoot;
    const name = semis === 12 ? '8' : labels[semis] || rulerName(semis);
    const inScale = !sid || labels[semis % 12] != null;
    if (semis === 0 || semis === 12) {
      return { s: string, f: fret, fill: ACCENT, r: 12, label: name, fs: 11, tc: ACCENT_INK };
    }
    if (inScale) {
      const plain = MAJIV.includes(semis);
      /* green flips light/dark with the theme, so its text follows --bg; the cream dot does not */
      return {
        s: string,
        f: fret,
        fill: plain ? 'var(--dot)' : 'var(--good)',
        r: 12,
        label: name,
        fs: 10.5,
        tc: plain ? 'var(--dot-ink)' : 'var(--bg)',
      };
    }
    return {
      s: string,
      f: fret,
      stroke: 'var(--wire)',
      sw: 1.3,
      r: 11,
      label: rulerName(semis),
      fs: 9.5,
      tc: 'var(--wire)',
    };
  });
  return fretboardSVG({ lo: Math.max(0, rootFret - 2), hi: rootFret + 4, cells, scale: 1.25 });
}
/** Two degrees one fret apart on the same string, to make "flat means one fret
    lower" something you can see rather than take on trust. */
export function degThirdsSVG(): string {
  const root = 5; /* A on the E string */
  const eString = 3;
  return fretboardSVG({
    lo: 4,
    hi: 10,
    scale: 1.25,
    cells: [
      { s: eString, f: root, fill: ACCENT, r: 12, label: '1', fs: 11, tc: ACCENT_INK },
      {
        s: eString,
        f: root + 3,
        fill: 'var(--good)',
        r: 12,
        label: '♭3',
        fs: 10.5,
        tc: 'var(--bg)',
      },
      {
        s: eString,
        f: root + 4,
        fill: 'var(--dot)',
        r: 12,
        label: '3',
        fs: 11,
        tc: 'var(--dot-ink)',
      },
    ],
  });
}
const hotClass = (hot: boolean | undefined) => (hot ? ' class="hot"' : '');
/** A small table: keys down the side, degrees across the top. */
export function degKeyTable(sid: string, roots: number[], mark?: number[]): string {
  const scale = scaleDef(sid);
  const parts = ['<div class="fbwrap"><table class="dtab"><tr><th class="corner">key</th>'];
  scale.dg.forEach((degree, k) => {
    parts.push(`<th${hotClass(mark?.includes(scale.iv[k]))}>${degPretty(degree)}</th>`);
  });
  parts.push('</tr>');
  for (const root of roots) {
    parts.push(`<tr><th>${esc(rootName(root))}</th>`);
    for (const note of scaleNotes(sid, root)) {
      parts.push(`<td${hotClass(mark?.includes(note.semis))}>${esc(noteText(note))}</td>`);
    }
    parts.push('</tr>');
  }
  parts.push('</table></div>');
  return parts.join('');
}
/** The worked example: a major scale, then the same key with the formula's
    flats applied, the changed notes marked. */
export function degWorked(fromSid: string, toSid: string, rootPc: number): string {
  const before = scaleNotes(fromSid, rootPc);
  const after = scaleNotes(toSid, rootPc);
  const parts = ['<div class="fbwrap"><table class="dtab"><tr><th></th>'];
  after.forEach((note) => parts.push(`<th>${degPretty(note.deg)}</th>`));
  parts.push(`</tr><tr><th>${esc(scaleDef(fromSid).n)}</th>`);
  before.forEach((note) => parts.push(`<td>${esc(noteText(note))}</td>`));
  parts.push(`</tr><tr><th>${esc(scaleDef(toSid).n)}</th>`);
  after.forEach((note, k) => {
    const changed = !!before[k] && noteText(before[k]) !== noteText(note);
    parts.push(`<td${hotClass(changed)}>${esc(noteText(note))}</td>`);
  });
  parts.push('</tr></table></div>');
  return parts.join('');
}

/* ---------------- scale progress ---------------- */
/** The heat-map class for a card: m0 not met, m1 shaky, m2/m3 getting there, m5 solid. */
function masteryClass(id: string): string {
  const stats = honmoon.cards[id];
  if (!stats || !stats.s) {
    return 'm0';
  }
  const level = mastery(id);
  if (level <= 1) {
    return 'm1';
  }
  if (level < 3) {
    return 'm2';
  }
  return level < 5 ? 'm3' : 'm5';
}
/** One square per scale in one key, shaded by how solid it is. */
export function scaleMatrix(): string {
  const scales = enabledScales();
  const roots = rootPool();
  if (!scales.length) {
    return '';
  }
  const parts = ['<div class="matwrap"><table class="mat"><thead><tr><th></th>'];
  for (const root of roots) {
    parts.push(`<th>${esc(rootDef(root).l + accG(rootDef(root).a))}</th>`);
  }
  parts.push('</tr></thead><tbody>');
  for (const scale of scales) {
    parts.push(`<tr><th>${esc(scale.n)}</th>`);
    for (const root of roots) {
      const id = 'sc:' + scale.id + ':' + root;
      parts.push(`<td class="${masteryClass(id)}" title="${esc(scaleName(scale.id, root))}"></td>`);
    }
    parts.push('</tr>');
  }
  parts.push('</tbody></table></div>');
  return parts.join('');
}
export function scaleStats() {
  const pool = scaleCards();
  let seen = 0;
  let solid = 0;
  let answers = 0;
  let right = 0;
  for (const id of pool) {
    const stats = honmoon.cards[id];
    if (!stats || !stats.s) {
      continue;
    }
    seen++;
    answers += stats.s;
    right += stats.c;
    if (mastery(id) >= 5) {
      solid++;
    }
  }
  return {
    total: pool.length,
    seen,
    solid,
    ans: answers,
    acc: answers ? Math.round((100 * right) / answers) : 0,
  };
}
export { SCALES };
