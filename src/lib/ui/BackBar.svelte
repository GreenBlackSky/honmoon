<!-- The bar at the top of a sub-screen: a way back on the left, a title on the right. -->
<script lang="ts">
  import type { Snippet } from 'svelte';
  interface Props {
    label: string;
    onBack: () => void;
    title?: string;
    id?: string;
    /** wrap in a .sec like most screens do */
    sec?: boolean;
    extra?: Snippet;
  }
  const { label, onBack, title = '', id = 'back', sec = false, extra }: Props = $props();
</script>

{#snippet bar()}
  <div class="bar">
    <button class="ghost" {id} onclick={onBack}>← {label}</button>
    {@render extra?.()}
    <span class="spacer"></span><span class="tick">{title}</span>
  </div>
{/snippet}
{#if sec}<div class="sec">{@render bar()}</div>{:else}{@render bar()}{/if}
