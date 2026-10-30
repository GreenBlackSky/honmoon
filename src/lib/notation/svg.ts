/* Small builders for the SVG strings the notation code assembles. They
   return markup as text; it ends up in the page through {@html}. */

/** The five lines of a staff, 10 apart, from x = 0 to `width`. */
export function staffLines(width: number): string {
  let out = '';
  for (let line = 0; line < 5; line++) {
    out += `<line x1="0" y1="${line * 10}" x2="${width}" y2="${line * 10}" stroke="var(--staff-line)" stroke-width="1.1"/>`;
  }
  return out;
}

/** A monospace label centred on x. */
export function monoLabel(
  x: number,
  y: number,
  size: number,
  fill: string,
  text: string,
  bold = false,
): string {
  const weight = bold ? ' font-weight="600"' : '';
  return `<text x="${x}" y="${y}" text-anchor="middle" font-size="${size}"${weight} font-family="IBM Plex Mono,monospace" fill="${fill}">${text}</text>`;
}

/** The colour a mastery level is shown in on the heat maps: shaky (1 or less)
    red, solid (5) green, and in between the "getting there" colour, mixed
    stronger the higher the level, into the given background. */
export function masteryColour(level: number, background: string): string {
  if (level <= 1) {
    return 'var(--bad)';
  }
  if (level < 5) {
    return `color-mix(in srgb,var(--mid) ${40 + level * 12}%, ${background})`;
  }
  return 'var(--good)';
}
