<!-- The summary after a session: how it went, what it taught you, what is still shaky. -->
<script lang="ts">
  import { minsSecs } from '../../util/text';
  import { describeCard } from '../../learn/describe';
  import { streakDays } from '../../learn/progress';
  import {
    session,
    startMissSession,
    startSession,
    stillMissed,
  } from '../../drills/runtime.svelte';
  import { go } from '../../nav.svelte';
  import Stat from '../Stat.svelte';

  const current = $derived(session.current);
  const summary = $derived.by(() => {
    if (!current) {
      return null;
    }
    const total = current.results.length;
    const right = current.right;
    const pct = total ? Math.round((100 * right) / total) : 0;
    /* A card counts as shaky if it was missed and never got a clean pass after. */
    const last: Record<string, boolean> = {};
    for (const result of current.results) {
      last[result.card] = result.ok;
    }
    const missed: string[] = [];
    const fixed: string[] = [];
    const seen: Record<string, 1> = {};
    for (const result of current.results) {
      if (result.ok || seen[result.card]) {
        continue;
      }
      seen[result.card] = 1;
      (last[result.card] ? fixed : missed).push(result.card);
    }
    return { total, right, pct, missed, fixed };
  });
</script>

{#if current && summary}
  <div class="sec">
    <h2>Session done</h2>
    <Stat
      items={[
        { v: summary.right + '/' + summary.total, k: 'Correct' },
        { v: summary.pct + '%', k: 'Accuracy' },
        { v: minsSecs(current.secs || 0), k: 'Time' },
        { v: streakDays(), k: 'Day streak' },
      ]}
    />
    <p class="note">
      {current.planned} cards planned{current.redos
        ? ', ' +
          current.redos +
          ' of them missed and sent round a second time — ' +
          summary.total +
          ' questions in all'
        : ''}.
    </p>
  </div>
  {#if summary.fixed.length}
    <div class="sec">
      <h2>Missed, then got right</h2>
      <div class="card stack">
        {#each summary.fixed.slice(0, 8) as card (card)}<div class="setrow">
            <span class="lbl">{describeCard(card)}</span><span
              class="tick"
              style="color:var(--good)">fixed</span
            >
          </div>{/each}
      </div>
      <p class="note">
        These are the ones the session actually taught you — you saw them again a few questions
        later and got them.
      </p>
    </div>
  {/if}
  {#if summary.missed.length}
    <div class="sec">
      <h2>Still shaky</h2>
      <div class="card stack">
        {#each summary.missed.slice(0, 10) as card (card)}<div class="setrow">
            <span class="lbl">{describeCard(card)}</span><span class="tick" style="color:var(--bad)"
              >missed</span
            >
          </div>{/each}
      </div>
    </div>
  {/if}
  {#if !summary.missed.length && !summary.fixed.length}
    <div class="sec">
      <div class="card">
        <p class="lead">Clean run — nothing missed. If that happens twice more, move up a range.</p>
      </div>
    </div>
  {/if}
  <div class="sec">
    <div class="bar">
      {#if summary.missed.length}<button
          class="start"
          id="redomiss"
          style="width:auto"
          onclick={() => startMissSession(stillMissed(current))}
          >Drill the {summary.missed.length} misses</button
        >{/if}
      <button class="ghost" id="againsess" onclick={() => startSession(current.mode)}
        >Another session</button
      >
      <span class="spacer"></span>
      <button
        class="ghost"
        id={current.mode === 'scales' ? 'backscales' : 'back'}
        onclick={() => go(current.mode === 'scales' ? 'scales' : 'home')}>Done</button
      >
    </div>
  </div>
{/if}
