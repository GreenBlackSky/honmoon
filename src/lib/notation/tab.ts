import { STRINGS } from '../music/bass';
import { esc } from '../util/text';

/** One note of a tabbed exercise: string, fret, left-hand finger, right-hand
    finger, and an optional label marking the start of a section. */
export interface TabStep {
  s: number;
  f: number;
  fin?: number;
  rh?: string;
  bar?: string | null;
}

const FIRST_X = 34;
const STEP_WIDTH = 26;
/** y of each string's line, G (top) to E. */
const STRING_ROWS = [14, 34, 54, 74];
/** Rows for the left-hand (finger) and right-hand (i/m) lines under the tab. */
const LH_ROW_Y = 98;
const RH_ROW_Y = 114;
const MONO = 'IBM Plex Mono,monospace';
const DISPLAY = 'Saira Condensed,sans-serif';

function tabStrings(width: number): string {
  let out = '';
  STRING_ROWS.forEach((y, string) => {
    out += `<line x1="${FIRST_X - 8}" y1="${y}" x2="${width - 8}" y2="${y}" stroke="var(--line-2)" stroke-width="1.2"/>`;
    out += `<text x="${FIRST_X - 14}" y="${y + 4.5}" text-anchor="end" font-size="12" font-family="${MONO}" font-weight="600" fill="var(--ink-3)">${STRINGS[string].n}</text>`;
  });
  return out;
}
/** A section line and its name, at the left edge of a step. */
function sectionMark(left: number, name: string): string {
  return (
    `<line x1="${left}" y1="8" x2="${left}" y2="80" stroke="var(--ink-3)" stroke-width="1.4"/>` +
    `<text x="${left + 4}" y="4" font-size="10.5" font-family="${DISPLAY}" letter-spacing="1" fill="var(--accent)">${esc(name).toUpperCase()}</text>`
  );
}
/** A fret number on its string, on a patch of background so the line breaks. */
function fretNumber(x: number, y: number, fret: number): string {
  return (
    `<rect x="${x - 9}" y="${y - 7}" width="18" height="14" fill="var(--surface)"/>` +
    `<text x="${x}" y="${y + 4.5}" text-anchor="middle" font-size="13" font-weight="600" font-family="${MONO}" fill="var(--ink)">${fret}</text>`
  );
}
function smallText(x: number, y: number, fill: string, text: string | number): string {
  return `<text x="${x}" y="${y}" text-anchor="middle" font-size="11.5" font-family="${MONO}" fill="${fill}">${text}</text>`;
}
function rowName(y: number, name: string): string {
  return `<text x="${FIRST_X - 14}" y="${y}" text-anchor="end" font-size="10" font-family="${DISPLAY}" fill="var(--ink-3)">${name}</text>`;
}

export function tabSVG(steps: TabStep[]): string {
  const width = FIRST_X + steps.length * STEP_WIDTH + 12;
  const hasRightHand = steps.some((step) => !!step.rh);
  const height = hasRightHand ? 132 : 116;
  const parts = [tabStrings(width)];
  steps.forEach((step, k) => {
    const x = FIRST_X + k * STEP_WIDTH + STEP_WIDTH / 2;
    if (step.bar) {
      parts.push(sectionMark(x - STEP_WIDTH / 2, step.bar));
    }
    parts.push(fretNumber(x, STRING_ROWS[step.s], step.f));
    if (step.fin) {
      parts.push(smallText(x, LH_ROW_Y, 'var(--accent)', step.fin));
    }
    if (step.rh) {
      parts.push(smallText(x, hasRightHand ? RH_ROW_Y : LH_ROW_Y, 'var(--ink-3)', step.rh));
    }
  });
  parts.push(rowName(LH_ROW_Y, 'LH'));
  if (hasRightHand) {
    parts.push(rowName(RH_ROW_Y, 'RH'));
  }
  return (
    `<svg viewBox="0 -8 ${width} ${height}" width="${width}" height="${height}" role="img" aria-label="tab">` +
    parts.join('') +
    '</svg>'
  );
}
