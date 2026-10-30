/** Invisible tap targets sit on top of a drawn SVG, positioned in percent of
    the drawing so they stay aligned at any zoom. */

/** A CSS position for a box given in the drawing's viewBox units. */
export function percentBox(
  box: { x: number; y: number; w: number; h: number },
  width: number,
  height: number,
): string {
  const pct = (part: number, whole: number) => ((100 * part) / whole).toFixed(3) + '%';
  return (
    `left:${pct(box.x, width)};top:${pct(box.y, height)};` +
    `width:${pct(box.w, width)};height:${pct(box.h, height)}`
  );
}
