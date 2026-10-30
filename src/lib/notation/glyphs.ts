import { GB, GP, type GlyphName } from './glyphdata';

export { GB, GP, type GlyphName };

/* Music glyphs (SMuFL outlines from glyphdata.ts) placed as SVG paths.
   GB[name] is a glyph's horizontal extent [left, right]; GP[name] its path. */

const DEFAULT_INK = 'var(--staff)';
/** Coordinates in the SVG are rounded to two decimals to keep it small. */
const round2 = (value: number) => Math.round(value * 100) / 100;

/** A glyph's width. */
export function gW(name: GlyphName): number {
  return GB[name][1] - GB[name][0];
}
/** An SVG path with no fill is black, which is invisible on a dark background
    — every glyph names its colour. */
export function gPath(name: GlyphName, x: number, y: number, fill?: string | null): string {
  return `<path d="${GP[name]}" transform="translate(${round2(x)} ${round2(y)})" fill="${fill || DEFAULT_INK}"/>`;
}
/** centred horizontally on x */
export function gMid(name: GlyphName, x: number, y: number, fill?: string | null): string {
  return gPath(name, x - GB[name][0] - gW(name) / 2, y, fill);
}
function accGlyphName(alteration: number): GlyphName {
  if (alteration === 1) {
    return 'accidentalSharp';
  }
  if (alteration === -1) {
    return 'accidentalFlat';
  }
  return 'accidentalNatural';
}
/** Gap between an accidental's right edge and its notehead's centre. */
const ACCIDENTAL_GAP = 8.4;
/** An accidental hangs to the left of its notehead, right-aligned against it. */
export function accPath(
  alteration: number,
  noteX: number,
  y: number,
  fill?: string | null,
): string {
  if (!alteration) {
    return '';
  }
  const name = accGlyphName(alteration);
  return gPath(name, noteX - ACCIDENTAL_GAP - GB[name][1], y, fill);
}
/** 5.9: half a notehead */
export const HEADW = gW('noteheadBlack') / 2;
export const STEMX = HEADW - 0.6;
export const STEMW = 1.2;
export const STEMLEN = 35;
/** Whole notes (16 sixteenths and up) and half notes have hollow heads. */
export function headName(sixteenths: number): GlyphName {
  if (sixteenths >= 16) {
    return 'noteheadWhole';
  }
  return sixteenths >= 8 ? 'noteheadHalf' : 'noteheadBlack';
}
/** A stem, the way an engraver puts one on: up on the right of the head for
    notes below the middle line, down on the left for notes above it, and long
    enough to reach the middle line when the note is far outside the staff. */
export function stemSVG(noteX: number, y: number, middleY: number, fill?: string | null): string {
  const up = y > middleY;
  const x = up ? noteX + STEMX - STEMW / 2 : noteX - HEADW;
  const end = up ? Math.min(y - STEMLEN, middleY) : Math.max(y + STEMLEN, middleY);
  const top = Math.min(y, end).toFixed(2);
  const height = Math.abs(end - y).toFixed(2);
  return `<rect x="${x.toFixed(2)}" y="${top}" width="${STEMW}" height="${height}" fill="${fill || DEFAULT_INK}"/>`;
}
