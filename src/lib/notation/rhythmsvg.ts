import { HEADW, STEMW, STEMX, gMid, gPath, gW, headName, type GlyphName } from './glyphs';
import {
  beamGroups,
  beamsFor,
  countAt,
  restName,
  rvalDef,
  type Bar,
  type TapGrade,
  type TimeSig,
} from '../music/rhythm';
import { esc } from '../util/text';

/* ---- the single-line rhythm staff ----
   Same engraved glyphs as the pitched staff, with one line instead of five:
   noteheads sit on it, stems go up, and beams are drawn across the beat. */
/** Where the first note goes, width of one sixteenth, stem top and bottom. */
const RHL = { x0: 44, uw: 15, up: -35, dn: 35 };
/** First note's x when there is no time signature. */
const X0_WITHOUT_TIME_SIG = 18;
/** Two noteheads never closer than this, or a dotted note and the next. */
const MIN_NOTE_GAP = 16;
const MIN_GAP_AFTER_DOT = 25;
const BEAM_THICKNESS = 5;
const SECOND_BEAM_OFFSET = 7.5;
/** A sixteenth with no sixteenth beside it gets a stub this long. */
const STUB_BEAM = 8;
const DEFAULT_SCALE = 1.15;
const STAFF_INK = 'var(--staff)';
const MONO = 'IBM Plex Mono,monospace';

/** Dotted values: dotted eighth (3), dotted quarter (6), dotted half (12). */
function isDotted(sixteenths: number): boolean {
  return sixteenths === 3 || sixteenths === 6 || sixteenths === 12;
}
function restGlyph(sixteenths: number): GlyphName {
  if (sixteenths >= 16) {
    return 'restWhole';
  }
  if (sixteenths >= 8) {
    return 'restHalf';
  }
  if (sixteenths >= 4) {
    return 'restQuarter';
  }
  return sixteenths >= 2 ? 'rest8th' : 'rest16th';
}
function rhRest(x: number, sixteenths: number): string {
  const glyph = restGlyph(sixteenths);
  let out = gMid(glyph, x, 0);
  if (isDotted(sixteenths)) {
    out += gMid('augmentationDot', x + gW(glyph) / 2 + 5, -6);
  }
  return out;
}
function rhTimeSig(bar: Bar, x: number): string {
  return (
    gMid(('timeSig' + bar.ts[0]) as GlyphName, x, -11) +
    gMid(('timeSig' + bar.ts[1]) as GlyphName, x, 11)
  );
}
/** The left edge of the stem of a note at x. */
const stemLeft = (x: number) => x + STEMX - STEMW / 2;
function upStem(x: number): string {
  return `<rect x="${stemLeft(x).toFixed(2)}" y="${RHL.up}" width="${STEMW}" height="${-RHL.up}" fill="${STAFF_INK}"/>`;
}
/** A flag on an unbeamed eighth or sixteenth. */
function flag(x: number, sixteenths: number): string {
  return gPath(beamsFor(sixteenths) > 1 ? 'flag16thUp' : 'flag8thUp', stemLeft(x), RHL.up);
}
/** A note standing alone or inside a beam group: head, stem, flag if
    unbeamed and shorter than a quarter, dot. */
function noteGlyphs(x: number, sixteenths: number, beamed: boolean): string {
  let out = gMid(headName(sixteenths), x, 0);
  if (sixteenths < 16) {
    out += upStem(x);
    if (!beamed && sixteenths < 4) {
      out += flag(x, sixteenths);
    }
  }
  if (isDotted(sixteenths)) {
    out += gMid('augmentationDot', x + HEADW + 5, -6);
  }
  return out;
}

export interface RhythmOpts {
  /** width of one sixteenth */
  uw?: number;
  /** leave out the time signature */
  noTs?: boolean;
  /** index of an event to pick out */
  hi?: number;
  /** index of an event to leave blank, with a question mark */
  blank?: number;
  /** write the counting under the notes */
  count?: boolean;
  scale?: number;
}
/** Time is laid out proportionally, but two noteheads can never be closer
    than they are wide, or a run of sixteenths turns into a smudge. Each note
    takes its proportional place or the minimum gap, whichever is further on. */
function noteXs(bar: Bar, firstX: number, unitWidth: number): number[] {
  const xs: number[] = [];
  let at = 0;
  bar.ev.forEach((event, i) => {
    let x = firstX + at * unitWidth + unitWidth * 0.5;
    if (i > 0) {
      const gap = isDotted(bar.ev[i - 1].u) ? MIN_GAP_AFTER_DOT : MIN_NOTE_GAP;
      x = Math.max(x, xs[i - 1] + gap);
    }
    xs.push(x);
    at += event.u;
  });
  return xs;
}
function blankSlot(x: number): string {
  return (
    `<rect x="${x - 10}" y="-17" width="21" height="32" rx="4" fill="none" stroke="var(--accent)" stroke-width="2" stroke-dasharray="4 3"/>` +
    `<text x="${x + 0.5}" y="6" text-anchor="middle" font-size="17" font-weight="700" fill="var(--accent)" font-family="${MONO}">?</text>`
  );
}
function tieCurve(fromX: number, toX: number): string {
  return `<path d="M${fromX + 2} 7.5 Q${(fromX + toX) / 2} 18 ${toX - 2} 7.5" fill="none" stroke="${STAFF_INK}" stroke-width="1.7"/>`;
}
function beamRect(left: number, top: number, right: number): string {
  return `<rect x="${left.toFixed(2)}" y="${top}" width="${(right - left).toFixed(2)}" height="${BEAM_THICKNESS}" fill="${STAFF_INK}"/>`;
}
/** Beams over a group, drawn last so they sit over the stems: one beam across
    the group, and a second only where both neighbours need it — a lone
    sixteenth gets a stub. */
function groupBeams(bar: Bar, xs: number[], group: { idx: number[] }): string {
  const indices = group.idx;
  const needsTwo = (k: number | undefined) => k != null && beamsFor(bar.ev[k].u) >= 2;
  let out = beamRect(
    stemLeft(xs[indices[0]]),
    RHL.up,
    xs[indices[indices.length - 1]] + STEMX + STEMW / 2,
  );
  indices.forEach((k, j) => {
    if (!needsTwo(k)) {
      return;
    }
    const prev = indices[j - 1];
    const next = indices[j + 1];
    const stemX = xs[k] + STEMX;
    let left: number;
    let right: number;
    if (needsTwo(next)) {
      left = stemX - STEMW / 2;
      right = xs[next] + STEMX + STEMW / 2;
    } else if (needsTwo(prev)) {
      left = xs[prev] + STEMX - STEMW / 2;
      right = stemX + STEMW / 2;
    } else if (prev != null) {
      left = stemX - STUB_BEAM;
      right = stemX + STEMW / 2;
    } else {
      left = stemX - STEMW / 2;
      right = stemX + STUB_BEAM;
    }
    out += beamRect(left, RHL.up + SECOND_BEAM_OFFSET, right);
  });
  return out;
}
/** The counting syllable under each attacked note. */
function countingRow(bar: Bar, xs: number[]): string {
  let out = '';
  let at = 0;
  bar.ev.forEach((event, i) => {
    const tiedOnto = i > 0 && bar.ev[i - 1].tie;
    if (!event.r && !tiedOnto) {
      out += `<text x="${xs[i]}" y="32" text-anchor="middle" font-size="14" font-weight="600" font-family="${MONO}" fill="var(--ink-3)">${esc(countAt(bar, at))}</text>`;
    }
    at += event.u;
  });
  return out;
}

export function rhythmSVG(bar: Bar, options: RhythmOpts = {}): string {
  const unitWidth = options.uw || RHL.uw;
  const firstX = options.noTs ? X0_WITHOUT_TIME_SIG : RHL.x0;
  const height = 100;
  const xs = noteXs(bar, firstX, unitWidth);
  const lastEvent = bar.ev[bar.ev.length - 1] || { u: 4 };
  const endX = Math.max(
    firstX + bar.u * unitWidth,
    xs[xs.length - 1] + Math.max(unitWidth * lastEvent.u * 0.5, 14),
  );
  const width = endX + 18;
  const parts: string[] = [];
  parts.push(
    `<line x1="0" y1="0" x2="${(width - 8).toFixed(1)}" y2="0" stroke="var(--staff-line)" stroke-width="1.4"/>`,
  );
  if (!options.noTs) {
    parts.push(rhTimeSig(bar, 20));
  }
  parts.push(
    `<rect x="${(width - 10).toFixed(1)}" y="-11" width="1.8" height="22" fill="${STAFF_INK}"/>`,
  );
  const groups = beamGroups(bar);
  const beamed = new Set(groups.flatMap((group) => group.idx));

  /* highlight, drawn first so it sits behind */
  const picked = options.hi;
  if (picked != null && picked >= 0 && picked < xs.length) {
    parts.push(
      `<rect x="${xs[picked] - 11}" y="-42" width="22" height="82" rx="6" fill="var(--accent)" opacity="0.16"/>`,
    );
  }

  bar.ev.forEach((event, i) => {
    const x = xs[i];
    if (options.blank === i) {
      parts.push(blankSlot(x));
      return;
    }
    if (event.r) {
      parts.push(rhRest(x, event.u));
      return;
    }
    parts.push(noteGlyphs(x, event.u, beamed.has(i)));
    if (event.tie && i + 1 < bar.ev.length) {
      parts.push(tieCurve(x, xs[i + 1]));
    }
  });
  groups.forEach((group) => parts.push(groupBeams(bar, xs, group)));
  if (options.count) {
    parts.push(countingRow(bar, xs));
  }
  const scale = options.scale || DEFAULT_SCALE;
  return (
    `<svg viewBox="-2 -48 ${width.toFixed(1)} ${height}" width="${Math.round(width * scale)}" height="${Math.round(height * scale)}" role="img" aria-label="rhythm in ${bar.ts.join(' ')}">` +
    parts.join('') +
    '</svg>'
  );
}

/** A single value on its own, for the note-values drill. */
export function rhOneSVG(sixteenths: number, rest: boolean, width?: number): string {
  const centreX = 27;
  const glyphs = rest ? rhRest(centreX, sixteenths) : noteGlyphs(centreX, sixteenths, false);
  width = width || 88;
  const label = rest ? restName(sixteenths) : rvalDef(sixteenths).n;
  return (
    `<svg viewBox="0 -46 56 80" width="${width}" height="${Math.round((width * 80) / 56)}" role="img" aria-label="${label}">` +
    '<line x1="2" y1="0" x2="52" y2="0" stroke="var(--staff-line)" stroke-width="1.2"/>' +
    glyphs +
    '</svg>'
  );
}

/** The numerals on their own, for the reference. */
export function tsGlyphSVG(ts: TimeSig, height?: number): string {
  height = height || 54;
  return (
    `<svg viewBox="-2 -22 26 44" width="${Math.round((height * 26) / 44)}" height="${height}" role="img" aria-label="${ts[0]} ${ts[1]} time">` +
    gMid(('timeSig' + ts[0]) as GlyphName, 11, -11) +
    gMid(('timeSig' + ts[1]) as GlyphName, 11, 11) +
    '</svg>'
  );
}

/** A picture of what you played against what was written. Written onsets stand
    above the line, your taps below it, and every tap is drawn — including the
    ones that landed nowhere near anything, which are the ones you most need to
    see. The timeline runs a little past both ends of the bar so an early or
    late tap has somewhere to be. */
/** -1 if a time falls before the drawing, 1 if after it, 0 if inside. */
function outsideSide(time: number, earliest: number, latest: number): -1 | 0 | 1 {
  if (time < earliest) {
    return -1;
  }
  return time > latest ? 1 : 0;
}
export function tapTimeline(
  grade: TapGrade,
  bar: Bar,
  start: number,
  secondsPerSixteenth: number,
): string {
  const duration = bar.u * secondsPerSixteenth;
  const width = 300;
  const height = 62;
  /** how much of a bar is drawn each side */
  const PAD = 0.18;
  const xAt = (time: number) => (width * ((time - start) / duration + PAD)) / (1 + 2 * PAD);
  const earliest = start - duration * PAD;
  const latest = start + duration * (1 + PAD);
  const vertical = (x: number, y1: number, y2: number, style: string) =>
    `<line x1="${x.toFixed(1)}" y1="${y1}" x2="${x.toFixed(1)}" y2="${y2}" ${style}/>`;
  const parts: string[] = [];
  parts.push(
    `<rect x="${xAt(start).toFixed(1)}" y="24" width="${(xAt(start + duration) - xAt(start)).toFixed(1)}" height="2" fill="var(--line)"/>`,
  );
  /* a tick on each beat. In compound time this ticks every three sixteenths,
     which matches neither the eighth (2) nor the dotted-quarter beat (6) —
     kept as the original drew it; noted in docs/ROADMAP.md as a likely bug */
  const beatSixteenths = bar.cmp ? 3 : 4;
  for (let beat = 0; beat <= bar.ts[0]; beat++) {
    const beatTime = start + beat * beatSixteenths * secondsPerSixteenth;
    if (beatTime <= start + duration + 1e-6) {
      parts.push(vertical(xAt(beatTime), 16, 34, 'stroke="var(--line)" stroke-width="1.4"'));
    }
  }
  grade.want.forEach((time, k) => {
    const x = xAt(time);
    const hit = grade.hits[k];
    parts.push(vertical(x, 8, 25, 'stroke="var(--ink-3)" stroke-width="2"'));
    if (hit.err != null) {
      const colour = Math.abs(hit.err) < grade.tol * 0.5 ? 'var(--good)' : 'var(--mid)';
      parts.push(vertical(xAt(time + hit.err), 25, 44, `stroke="${colour}" stroke-width="2.6"`));
    } else {
      parts.push(
        `<circle cx="${x.toFixed(1)}" cy="36" r="3.2" fill="none" stroke="var(--bad)" stroke-width="1.6"/>`,
      );
    }
  });
  (grade.stray || []).forEach((time) => {
    /* off the end of the drawing: park it at the edge with a chevron, so a tap
       half a bar late still shows up rather than silently disappearing */
    const side = outsideSide(time, earliest, latest);
    const x = side === 0 ? xAt(time) : xAt(side < 0 ? earliest : latest);
    parts.push(
      vertical(x, 25, 44, 'stroke="var(--bad)" stroke-width="2.6" stroke-dasharray="3 2.4"'),
    );
    if (side) {
      parts.push(
        `<path d="M${(x + side * 2).toFixed(1)} 48 l${side * 5} 3.5 l${-side * 5} 3.5z" fill="var(--bad)"/>`,
      );
    }
  });
  /* width:100% with a fixed height attribute letterboxes the drawing into a
     strip in the middle; letting the height follow the aspect ratio gives the
     timeline the full width of the card, which is the whole point of it. */
  return (
    `<svg viewBox="-4 0 ${width + 8} ${height}" style="display:block;width:100%;height:auto" role="img" aria-label="your taps against the written rhythm">` +
    parts.join('') +
    '</svg>'
  );
}
