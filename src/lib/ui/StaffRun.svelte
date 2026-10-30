<!-- One staff carrying a run of notes, each labelled in both systems, optionally tappable. -->
<script lang="ts">
  import { percentBox } from './overlay';
  import type { Pref } from '../store/types';
  import { RUN, runWidth, runX0, staffRunSVG } from '../notation/staff';
  import { noteName, pcOf } from '../music/notes';

  interface Props {
    midis: number[];
    pref: Pref;
    sel?: number;
    tappable?: boolean;
    clef?: string;
    onNote?: (m: number) => void;
  }
  const { midis, pref, sel = -1, tappable = true, clef = 'bass', onNote }: Props = $props();

  const svg = $derived(staffRunSVG(midis, pref, sel, true, clef));
  const width = $derived(runWidth(midis.length, clef));
  const firstX = $derived(runX0(clef));
  /** The tap target for the note at an index: one note's width, full height. */
  const noteBox = (index: number) => ({
    x: firstX + index * RUN.dx - RUN.dx / 2 + 2,
    y: 0,
    w: RUN.dx,
    h: 1,
  });
</script>

<div class="fbstage">
  {@html svg}
  {#if tappable}
    <div class="taplayer">
      {#each midis as midi, index (index)}
        <button
          class="hit"
          type="button"
          data-refn={midi}
          aria-label={'note ' + noteName(pcOf(midi), 'en', pref)}
          style={percentBox(noteBox(index), width, 1)}
          onclick={() => onNote?.(midi)}
        ></button>
      {/each}
    </div>
  {/if}
</div>
