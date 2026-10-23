<script>
  import { onMount, onDestroy } from "svelte";
  import { entries, activeSleep } from "$lib/stores.js";
  import Emblem from "$lib/components/Emblem.svelte";
  import Duration from "$lib/components/Duration.svelte";
  import Icon from "$lib/components/Icon.svelte";
  import {
    startSleep,
    stopSleep,
    deleteEntry,
    editEntry,
    toDatetimeLocal,
    fromDatetimeLocal,
    fmtTime,
    fmtDate,
    fmtDuration,
  } from "$lib/appState.js";

  let now = new Date();
  let tick;

  let editingId = null;
  let editStart = "";
  let editEnd = "";

  onMount(() => {
    tick = setInterval(() => (now = new Date()), 1000);
  });
  onDestroy(() => clearInterval(tick));

  $: sleepHistory = $entries.filter((e) => e.type === "sleep" && e.end_time);
  let visibleCount = 10;
  $: visibleSleeps = sleepHistory.slice(0, visibleCount);
  $: elapsed = $activeSleep
    ? fmtDuration($activeSleep.start_time, now.toISOString())
    : null;

  function startEdit(e) {
    editingId = e.id;
    editStart = toDatetimeLocal(e.start_time);
    editEnd = toDatetimeLocal(e.end_time);
  }

  function cancelEdit() {
    editingId = null;
  }

  function saveEdit(e) {
    editEntry(e.id, {
      start_time: fromDatetimeLocal(editStart),
      end_time: fromDatetimeLocal(editEnd),
    });
    editingId = null;
  }

  function removeEntry(id) {
    if (confirm("Delete this entry? This can't be undone.")) {
      deleteEntry(id);
      editingId = null;
    }
  }
</script>

<section class="timer">
  <Emblem size={190} a="var(--cyan)" b="var(--violet)" spin={!!$activeSleep}>
    {#if $activeSleep}<span class="emb-num"><Duration text={elapsed} /></span
      ><span class="emb-cap">asleep</span>{:else}<Icon
        name="moon"
        size={44}
      />{/if}
  </Emblem>
  {#if $activeSleep}
    <p class="since">started {fmtTime($activeSleep.start_time)}</p>
    <button class="stop" on:click={stopSleep}>Stop sleep</button>
  {:else}
    <button class="start" on:click={startSleep}>Start sleep</button>
  {/if}
</section>

<section class="history">
  <h2>History</h2>
  <ul>
    {#each visibleSleeps as e (e.id)}
      <li>
        {#if editingId === e.id}
          <div class="edit-form">
            <div class="edit-row stack">
              <label>
                Start
                <input type="datetime-local" bind:value={editStart} />
              </label>
              <label>
                End
                <input type="datetime-local" bind:value={editEnd} />
              </label>
            </div>
            <div class="edit-actions">
              <button class="save" on:click={() => saveEdit(e)}>Save</button>
              <button class="cancel" on:click={cancelEdit}>Cancel</button>
              <button class="delete" on:click={() => removeEntry(e.id)}
                >Delete</button
              >
            </div>
          </div>
        {:else}
          <button class="entry-row" on:click={() => startEdit(e)}>
            <span class="badge b-moon"><Icon name="moon" size={18} /></span>
            <span class="entry-main">
              <span class="entry-date">{fmtDate(e.start_time)}</span>
              <span class="entry-time"
                >{fmtTime(e.start_time)} to {fmtTime(e.end_time)}</span
              >
              <span class="chips"
                ><span class="chip dur"
                  >{fmtDuration(e.start_time, e.end_time)}</span
                ></span
              >
            </span>
          </button>
        {/if}
      </li>
    {:else}
      <li class="empty">No sleep sessions logged yet.</li>
    {/each}
  </ul>
  {#if sleepHistory.length > visibleCount}
    <button class="secondary show-more" on:click={() => (visibleCount += 10)}>
      Show more ({sleepHistory.length - visibleCount} left)
    </button>
  {/if}
</section>
