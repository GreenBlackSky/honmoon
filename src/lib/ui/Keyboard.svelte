<!--
  A piano keyboard. Real buttons over the drawing, the same trick the
  fretboard uses, for the same reasons: transparent SVG hit areas are
  unreliable on touch, and buttons can be reached from a keyboard. Black keys
  come last so they sit above the white ones they overlap.
-->
<script lang="ts">
  import { percentBox } from './overlay';
  import { kbDims, kbKeys, kbSVG, type KeyboardOpts } from '../notation/keyboard';
  import { midiName } from '../music/notes';
  import { handleKey } from '../drills/runtime.svelte';
  import { follow, followTarget } from './keyfollow.svelte';

  interface Props extends KeyboardOpts {
    /** taps answer (in a drill) or sound (anywhere else) */
    tap?: boolean | 'play';
    /** centre the board instead of letting it scroll */
    fit?: boolean;
    onKey?: (midi: number) => void;
  }
  const { tap = false, fit = true, onKey = handleKey, ...options }: Props = $props();

  const size = $derived(kbDims(options));
  const svg = $derived(kbSVG(options));
  const keys = $derived(kbKeys(options));
  const lit = $derived(
    followTarget(
      follow.lit,
      keys.map((key) => key.midi),
    ),
  );
</script>

<div class="kbwrap" class:fit>
  <div class="kbstage">
    {@html svg}
    {#if tap}
      <div class="taplayer">
        {#each keys as key (key.midi)}
          <button
            class="hit"
            class:bk={key.black}
            class:lit={lit === key.midi}
            type="button"
            data-kb={key.midi}
            aria-label={midiName(key.midi)}
            style={percentBox({ ...key, y: 0 }, size.W, size.H)}
            onclick={() => onKey(key.midi)}
          ></button>
        {/each}
      </div>
    {/if}
  </div>
</div>
