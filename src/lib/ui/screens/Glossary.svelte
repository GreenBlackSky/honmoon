<!--
  Every word the app uses at you, defined in one line each. The point is not
  to teach the subject — the references do that — but to stop a single
  unfamiliar word from making a whole drill unreadable. Written so that each
  entry stands on its own: you arrive here having met one term, not to read
  the list end to end.
-->
<script lang="ts">
  import { GLOSS } from '../refdata';
  import RefBar from '../RefBar.svelte';
  const { back }: { back?: { label: string; to: string } } = $props();

  let search = $state('');
  /** The text of an HTML snippet, tags dropped. */
  const plain = (html: string) => html.replace(/<[^>]+>/g, '').replace(/&amp;/g, '&');
  const shown = $derived.by(() => {
    const wanted = search.trim().toLowerCase();
    return GLOSS.map((section) => ({
      g: section.g,
      items: section.items.filter(
        ([term, meaning]) =>
          !wanted || (plain(term) + plain(meaning)).toLowerCase().includes(wanted),
      ),
    }));
  });
  const none = $derived(shown.every((section) => !section.items.length));
</script>

<RefBar title="Vocabulary" {back} resume={false} />
<div class="sec">
  <div class="card stack">
    <p class="note" style="margin:0">
      Every term the drills use at you, one line each. Type to narrow it down.
    </p>
    <input
      class="gfind"
      id="glossq"
      type="search"
      placeholder="Search a word…"
      aria-label="search the vocabulary"
      autocomplete="off"
      bind:value={search}
    />
    <p class="note" id="glossnone" hidden={!none} style="margin:0">Nothing matches that.</p>
  </div>
</div>
{#each shown as section (section.g)}
  <div class="sec gsec" hidden={!section.items.length}>
    <h2>{section.g}</h2>
    <div class="card stack">
      {#each section.items as [term, meaning] (term)}<div class="gterm">
          <b>{@html term}</b>
          <p>{@html meaning}</p>
        </div>{/each}
    </div>
  </div>
{/each}
<div class="sec">
  <div class="card">
    <p class="note" style="margin:0">
      Still stuck on a word? The references go into each of these properly — this page is only here
      so that one unfamiliar term cannot make a whole drill unreadable.
    </p>
  </div>
</div>
