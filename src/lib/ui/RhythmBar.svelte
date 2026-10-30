<!-- A bar of rhythm on its one-line staff, scrolling sideways if it is wider than the screen. -->
<script lang="ts">
  import { rhythmSVG, type RhythmOpts } from '../notation/rhythmsvg';
  import type { Bar } from '../music/rhythm';

  const { bar, ...options }: { bar: Bar } & RhythmOpts = $props();
</script>

<div class="rhwrap"><div class="fbstage">{@html rhythmSVG(bar, options)}</div></div>
