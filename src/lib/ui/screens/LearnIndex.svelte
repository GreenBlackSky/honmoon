<!--
  Every explanation in the app, in one place. They are still linked from the
  family that uses them, but you should not have to remember which drill owns
  an idea in order to go and read about it.
-->
<script lang="ts">
  import { IC } from '../../notation/icons';
  import { go, hasRoute } from '../../nav.svelte';
  import { LEARN } from '../refdata';
  const items = LEARN.filter((item) => hasRoute(item.go));
</script>

<div class="sec">
  <div class="card">
    <p class="note" style="margin:0">
      {items.length} references. Nothing here is a test — read them when a drill turns up something you
      do not recognise, or when you want the idea before the practice.
    </p>
  </div>
</div>
<div class="sec">
  <h2>References</h2>
  {#each items as item (item.go)}
    <button class="drill ref" data-go={item.go} onclick={() => go(item.go)}
      ><span class="ic">{@html IC.book}</span><span
        ><span class="nm">{item.n}</span><br /><span class="sb">{item.sb}</span></span
      ><span class="mast">→</span></button
    >
  {/each}
</div>
{#if hasRoute('setup')}
  <div class="sec">
    <div class="card">
      <p class="note" style="margin:0">
        How the app decides what to ask you, and why bass is written an octave high, are under <b
          >Setup</b
        >.
      </p>
      <div class="bar" style="margin-top:8px">
        <button class="ghost" onclick={() => go('setup')}>How this works</button>
      </div>
    </div>
  </div>
{/if}
