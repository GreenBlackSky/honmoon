import type { Action } from 'svelte/action';

export interface HScrollParams {
  /** where to centre, as a fraction of the content width */
  frac?: number | null;
  /** or an exact scroll position to restore */
  left?: number | null;
  /** re-apply whenever this changes (a new question, a new selection) */
  key?: unknown;
}

/** Brings the interesting part of a wide board into view — the marked fret,
    the selected note — instead of leaving it off to the right on a phone. */
export const hscroll: Action<HTMLElement, HScrollParams> = (node, params) => {
  let lastKey: unknown = Symbol('none');
  function apply(options: HScrollParams) {
    if (options.key === lastKey) {
      return;
    }
    lastKey = options.key;
    requestAnimationFrame(() => {
      if (options.left != null) {
        node.scrollLeft = options.left;
      } else if (options.frac != null) {
        node.scrollLeft = Math.max(0, options.frac * node.scrollWidth - node.clientWidth / 2);
      }
    });
  }
  apply(params);
  return { update: apply };
};

/** The fraction of a board's width at which fret `f` sits, for a board drawn from `lo` to `hi`. */
export function fretFrac(fret: number, lo: number, hi: number): number {
  return (fret - lo + 0.5) / (hi - lo + 1);
}
