<!-- A row of choice chips, exactly one pressed. -->
<script lang="ts" generics="T">
  interface Props {
    items: { v: T; label: string }[];
    value: T;
    onPick: (v: T) => void;
    sm?: boolean;
    /** extra attributes for tests: data-set="<name>" on each chip */
    name?: string;
  }
  const { items, value, onPick, sm = true, name }: Props = $props();
</script>

{#each items as it (String(it.v))}
  <button
    class="chip"
    class:sm
    data-set={name}
    data-val={String(it.v)}
    aria-pressed={value === it.v}
    onclick={() => onPick(it.v)}>{@html it.label}</button
  >
{/each}
