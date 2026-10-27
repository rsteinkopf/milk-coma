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
  let editKind = "night";

  // Default to nap during the day and night sleep otherwise; flip it with the toggle
  const defaultKind = () => {
    const h = new Date().getHours();
    return h >= 7 && h < 19 ? "nap" : "night";
  };
  let sleepKind = defaultKind();

  onMount(() => {
    tick = setInterval(() => (now = new Date()), 1000);
  });
  onDestroy(() => clearInterval(tick));

  $: sleepHistory = $entries.filter((e) => e.type === "sleep" && e.end_time);
  let visibleCount = 10;
  $: visibleSleeps = sleepHistory.slice(0, visibleCount);
  $: shownKind = $activeSleep
    ? ($activeSleep.sleep_type ?? "night")
    : sleepKind;
  $: elapsed = $activeSleep
    ? fmtDuration($activeSleep.start_time, now.toISOString())
    : null;

  function startEdit(e) {
    editingId = e.id;
    editStart = toDatetimeLocal(e.start_time);
    editEnd = toDatetimeLocal(e.end_time);
    editKind = e.sleep_type ?? "night";
  }

  function cancelEdit() {
    editingId = null;
  }

  function saveEdit(e) {
    editEntry(e.id, {
      start_time: fromDatetimeLocal(editStart),
      end_time: fromDatetimeLocal(editEnd),
      sleep_type: editKind,
    });
    editingId = null;
  }

  function cancelSleep() {
    if (!$activeSleep) return;
    if (confirm("Cancel this sleep? The timer will be discarded.")) {
      deleteEntry($activeSleep.id);
    }
  }

  function removeEntry(id) {
    if (confirm("Delete this entry? This can't be undone.")) {
      deleteEntry(id);
      editingId = null;
    }
  }
</script>

<section class="timer">
  <Emblem
    size={190}
    a={shownKind === "nap" ? "var(--sun)" : "var(--cyan)"}
    b={shownKind === "nap" ? "var(--orange)" : "var(--violet)"}
    spin={!!$activeSleep}
  >
    {#if $activeSleep}<span class="emb-num"><Duration text={elapsed} /></span
      ><span class="emb-cap">{shownKind === "nap" ? "napping" : "asleep"}</span
      >{:else}<Icon
        name={shownKind === "nap" ? "sun" : "moon"}
        size={44}
      />{/if}
  </Emblem>
  {#if $activeSleep}
    <p class="since">started {fmtTime($activeSleep.start_time)}</p>
    <button class="stop" on:click={stopSleep}>Stop sleep</button>
    <button class="delete" on:click={cancelSleep}>Cancel sleep</button>
  {:else}
    <div class="seg" role="group" aria-label="Sleep type">
      <button
        class="nap"
        aria-pressed={sleepKind === "nap"}
        on:click={() => (sleepKind = "nap")}
        ><Icon name="sun" size={20} /> Day</button
      >
      <button
        class="night"
        aria-pressed={sleepKind === "night"}
        on:click={() => (sleepKind = "night")}
        ><Icon name="moon" size={20} /> Night</button
      >
    </div>
    <button
      class="start {sleepKind === 'nap' ? 'nap' : ''}"
      on:click={() => startSleep(sleepKind)}
    >
      Start {sleepKind === "nap" ? "nap" : "sleep"}
    </button>
  {/if}
</section>

<section class="history">
  <h2>History</h2>
  <ul>
    {#each visibleSleeps as e (e.id)}
      <li>
        {#if editingId === e.id}
          <div class="edit-form">
            <div class="seg" role="group" aria-label="Sleep type">
              <button
                class="nap"
                aria-pressed={editKind === "nap"}
                on:click={() => (editKind = "nap")}
                ><Icon name="sun" size={20} /> Nap</button
              >
              <button
                class="night"
                aria-pressed={editKind === "night"}
                on:click={() => (editKind = "night")}
                ><Icon name="moon" size={20} /> Night</button
              >
            </div>
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
            <span class="badge {e.sleep_type === 'nap' ? 'b-sun' : 'b-moon'}"
              ><Icon
                name={e.sleep_type === "nap" ? "sun" : "moon"}
                size={18}
              /></span
            >
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
