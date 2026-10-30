import { honmoon, mastery } from '../store/honmoon.svelte';
import { STRINGS, allowedPc, lvl, vhi } from '../music/bass';
import { pcOf } from '../music/notes';
import { masteryColour } from './svg';

/** A dot (or ring) drawn on the neck. */
export interface FretCell {
  /** string index, 0 = G (top row) */
  s: number;
  /** fret, 0 = open */
  f: number;
  fill?: string;
  stroke?: string;
  /** stroke width */
  sw?: number;
  /** radius */
  r?: number;
  label?: string;
  /** label font size */
  fs?: number;
  /** label text colour */
  tc?: string;
}
export interface FretboardOpts {
  lo?: number;
  hi?: number;
  cells?: FretCell[];
  /** highlight one string as the one to tap */
  tap?: boolean;
  onlyString?: number | null;
  noLabels?: boolean;
  scale?: number;
}

/** Layout of the drawn neck, in viewBox units: fret width, where fret 1
    starts, string spacing, top margin, right padding, room below for fret
    numbers, and the width of the open-string column left of the nut. */
export const FB = { fw: 44, x0: 42, rowH: 30, top: 18, pad: 22, foot: 46, openW: 28 };
const STRING_COUNT = STRINGS.length;
/** Height of the strings area, top string to bottom string. */
const STRINGS_SPAN = (STRING_COUNT - 1) * FB.rowH;
/** Inlay dots, and the double dot at 12 and 24. */
const SINGLE_DOT_FRETS = [3, 5, 7, 9, 15, 17, 19, 21];
const DOUBLE_DOT_FRETS = [12, 24];
const MONO = 'IBM Plex Mono,monospace';

export function fbDims(lo: number, hi: number) {
  const fretCount = hi - lo;
  return {
    n: fretCount,
    W: FB.x0 + fretCount * FB.fw + FB.pad,
    H: FB.top + STRINGS_SPAN + FB.foot,
  };
}
/** The tappable box for one string and fret, in viewBox units. */
export function fbCell(lo: number, string: number, fret: number) {
  const x = fret === 0 ? FB.x0 - FB.openW : FB.x0 + (fret - lo - 1) * FB.fw;
  const width = fret === 0 ? FB.openW : FB.fw;
  return { x, y: FB.top + string * FB.rowH - FB.rowH / 2, w: width, h: FB.rowH };
}
/** Horizontal centre of a fret (the open column sits left of the nut). */
function fretCentreX(fret: number, lo: number): number {
  return fret === 0 ? FB.x0 - 12 : FB.x0 + (fret - lo - 0.5) * FB.fw;
}
const stringY = (string: number) => FB.top + string * FB.rowH;

function boardBackground(fretCount: number): string {
  return `<rect x="${FB.x0 - 2}" y="${FB.top - 13}" width="${fretCount * FB.fw + 4}" height="${STRINGS_SPAN + 26}" fill="var(--board)" rx="3"/>`;
}
/** The band behind the one string a question asks you to tap on. */
function stringHighlight(string: number, fretCount: number, showsOpen: boolean): string {
  const x = FB.x0 - (showsOpen ? 28 : 2);
  const width = fretCount * FB.fw + 4 + (showsOpen ? 26 : 0);
  return `<rect x="${x}" y="${stringY(string) - FB.rowH / 2}" width="${width}" height="${FB.rowH}" fill="var(--accent)" opacity="0.16" rx="3"/>`;
}
function fretWires(lo: number, fretCount: number): string {
  let out = '';
  for (let i = 0; i <= fretCount; i++) {
    const x = FB.x0 + i * FB.fw;
    const isNut = lo + i === 0;
    out += `<line x1="${x}" y1="${FB.top - 13}" x2="${x}" y2="${FB.top + STRINGS_SPAN + 13}" stroke="${isNut ? 'var(--ink)' : 'var(--wire)'}" stroke-width="${isNut ? 4.5 : 2}" stroke-linecap="round"/>`;
  }
  return out;
}
function inlayDots(lo: number, hi: number): string {
  const dot = (cx: number, cy: number) =>
    `<circle cx="${cx}" cy="${cy}" r="5" fill="var(--board-2)"/>`;
  const middleY = FB.top + 1.5 * FB.rowH;
  let out = '';
  for (let fret = lo + 1; fret <= hi; fret++) {
    const cx = fretCentreX(fret, lo);
    if (SINGLE_DOT_FRETS.includes(fret)) {
      out += dot(cx, middleY);
    }
    if (DOUBLE_DOT_FRETS.includes(fret)) {
      out += dot(cx, middleY - FB.rowH * 0.6) + dot(cx, middleY + FB.rowH * 0.6);
    }
  }
  return out;
}
/** The strings, thicker towards the low E, each named at the left. */
function stringsAndNames(fretCount: number, showsOpen: boolean, hideNames: boolean): string {
  let out = '';
  for (let string = 0; string < STRING_COUNT; string++) {
    const y = stringY(string);
    const thickness = 1.1 + string * 0.65;
    out += `<line x1="${FB.x0 - (showsOpen ? 24 : 2)}" y1="${y}" x2="${FB.x0 + fretCount * FB.fw}" y2="${y}" stroke="var(--string)" stroke-width="${thickness}"/>`;
    out += `<text x="${FB.x0 - (showsOpen ? 32 : 12)}" y="${y + 4.5}" text-anchor="end" font-size="13" font-family="${MONO}" font-weight="600" fill="var(--ink-3)">${hideNames ? '·' : STRINGS[string].n}</text>`;
  }
  return out;
}
function fretNumbers(lo: number, hi: number): string {
  let out = '';
  for (let fret = lo; fret <= hi; fret++) {
    if (fret === 0 && lo !== 0) {
      continue;
    }
    out += `<text x="${fretCentreX(fret, lo)}" y="${FB.top + STRINGS_SPAN + 34}" text-anchor="middle" font-size="12" font-family="${MONO}" fill="var(--ink-3)">${fret}</text>`;
  }
  return out;
}
function cellMarks(cells: FretCell[], lo: number, hi: number): string {
  let out = '';
  for (const cell of cells) {
    const cx = fretCentreX(cell.f, lo);
    const cy = stringY(cell.s);
    if (cell.f < lo || cell.f > hi) {
      continue;
    }
    if (cell.fill || cell.stroke) {
      out += `<circle cx="${cx}" cy="${cy}" r="${cell.r || 11}" fill="${cell.fill || 'none'}" stroke="${cell.stroke || 'none'}" stroke-width="${cell.sw || 2}"/>`;
    }
    if (cell.label) {
      out += `<text x="${cx}" y="${cy + 4.6}" text-anchor="middle" font-size="${cell.fs || 12}" font-family="${MONO}" font-weight="600" fill="${cell.tc || 'var(--accent-ink)'}">${cell.label}</text>`;
    }
  }
  return out;
}

export function fretboardSVG(options: FretboardOpts = {}): string {
  const lo = options.lo || 0;
  const hi = options.hi ?? 12;
  const { n: fretCount, W: width, H: height } = fbDims(lo, hi);
  const showsOpen = lo === 0;
  const parts = [boardBackground(fretCount)];
  if (options.tap && options.onlyString != null) {
    parts.push(stringHighlight(options.onlyString, fretCount, showsOpen));
  }
  parts.push(fretWires(lo, fretCount));
  parts.push(inlayDots(lo, hi));
  parts.push(stringsAndNames(fretCount, showsOpen, !!options.noLabels));
  parts.push(fretNumbers(lo, hi));
  parts.push(cellMarks(options.cells || [], lo, hi));
  const scale = options.scale || 1;
  return (
    `<svg viewBox="0 0 ${width} ${height}" width="${Math.round(width * scale)}" height="${Math.round(height * scale)}" role="img" aria-label="bass fretboard">` +
    parts.join('') +
    '</svg>'
  );
}

/** The neck, shaded by how solid each position is — the map on Stats. */
export function heatFretboard(): string {
  const level = lvl();
  const cells: FretCell[] = [];
  for (let string = 0; string < STRING_COUNT; string++) {
    for (let fret = level.lo; fret <= vhi(); fret++) {
      const midi = STRINGS[string].open + fret;
      if (fret > level.hi || !allowedPc(pcOf(midi))) {
        continue;
      }
      const id = 'fb:' + string + ':' + fret;
      const card = honmoon.cards[id];
      if (!card || !card.s) {
        cells.push({ s: string, f: fret, stroke: 'var(--ink-3)', sw: 1.6, r: 8 });
      } else {
        cells.push({
          s: string,
          f: fret,
          fill: masteryColour(mastery(id), 'var(--board)'),
          r: 8.5,
        });
      }
    }
  }
  return fretboardSVG({ lo: level.lo, hi: vhi(), cells, scale: 1.45 });
}
