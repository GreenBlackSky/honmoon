<!--
  The bass neck, plus — when it can be tapped — a layer of real HTML buttons
  positioned over it in percentages of the drawing. Reliable everywhere,
  unlike transparent SVG hit areas, and reachable from a keyboard.
-->
<script lang="ts">
  import { percentBox } from './overlay';
  import { fbCell, fbDims, fretboardSVG, type FretboardOpts } from '../notation/fretboard';
  import { STRINGS } from '../music/bass';

  interface Props extends FretboardOpts {
    /** restrict the tappable spots to these */
    only?: { s: number; f: number }[] | null;
    onTap?: (s: number, f: number, scrollLeft: number) => void;
  }
  const { onTap, only = null, ...options }: Props = $props();

  const lo = $derived(options.lo || 0);
  const hi = $derived(options.hi == null ? 12 : options.hi);
  const size = $derived(fbDims(lo, hi));
  const svg = $derived(fretboardSVG(options));
  const spotKey = (string: number, fret: number) => string + ':' + fret;
  const targets = $derived.by(() => {
    if (!options.tap) {
      return [];
    }
    const allowed = only ? only.map((spot) => spotKey(spot.s, spot.f)) : null;
    const out: { s: number; f: number; style: string; label: string }[] = [];
    for (let string = 0; string < STRINGS.length; string++) {
      if (options.onlyString != null && string !== options.onlyString) {
        continue;
      }
      for (let fret = lo; fret <= hi; fret++) {
        if (allowed && !allowed.includes(spotKey(string, fret))) {
          continue;
        }
        out.push({
          s: string,
          f: fret,
          label: STRINGS[string].n + ' string, fret ' + fret,
          style: percentBox(fbCell(lo, string, fret), size.W, size.H),
        });
      }
    }
    return out;
  });

  function tap(event: MouseEvent, string: number, fret: number) {
    const wrap = (event.currentTarget as HTMLElement).closest('.fbwrap') as HTMLElement | null;
    onTap?.(string, fret, wrap ? wrap.scrollLeft : 0);
  }
</script>

<div class="fbstage">
  {@html svg}
  {#if options.tap}
    <div class="taplayer">
      {#each targets as target (spotKey(target.s, target.f))}
        <button
          class="hit"
          type="button"
          data-s={target.s}
          data-f={target.f}
          aria-label={target.label}
          style={target.style}
          onclick={(event) => tap(event, target.s, target.f)}
        ></button>
      {/each}
    </div>
  {/if}
</div>
