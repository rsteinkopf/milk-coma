<script>
  // Renders a formatted duration like "12m 30s" or "1h 5m" with full-size
  // digits and smaller, plain-font unit letters, so the "s" can't read as a 5.
  export let text = "";
  $: parts = [...text.matchAll(/(\d+)\s*([a-z]+)/g)].map((m) => ({
    n: m[1],
    u: m[2],
  }));
</script>

{#if parts.length}
  <span class="sr">{text}</span>
  <span class="dur" aria-hidden="true"
    >{#each parts as p, i}<span class="n" class:gap={i > 0}>{p.n}</span><span
        class="u">{p.u}</span
      >{/each}</span
  >
{:else}
  {text}
{/if}

<style>
  .dur {
    white-space: nowrap;
  }
  .n.gap {
    margin-left: 0.3em;
  }
  .u {
    font-family: var(--body);
    font-weight: 800;
    font-size: 0.55em;
    letter-spacing: 0.02em;
    margin-left: 0.1em;
    text-shadow: none;
  }
  .sr {
    position: absolute;
    width: 1px;
    height: 1px;
    overflow: hidden;
    clip: rect(0 0 0 0);
    white-space: nowrap;
  }
</style>
