<script>
  export let name;
  export let size = 24;
</script>

<svg
  width={size}
  height={size}
  viewBox="0 0 24 24"
  fill="none"
  stroke="currentColor"
  stroke-width="1.8"
  stroke-linecap="round"
  stroke-linejoin="round"
  aria-hidden="true"
>
  {#if name === "stats"}
    <rect x="3" y="13" width="4" height="8" /><rect
      x="10"
      y="4"
      width="4"
      height="17"
    /><rect x="17" y="13" width="4" height="8" />
  {:else if name === "drop"}
    <path d="M12 3C12 3 5 10.4 5 15a7 7 0 0 0 14 0C19 10.4 12 3 12 3Z" /><path
      d="M12 3v18"
      opacity=".4"
    />
    <path
      d="M8.6 15.4A3.4 3.4 0 0 0 12 18.8M15.4 15.4A3.4 3.4 0 0 1 12 18.8"
      opacity=".7"
    />
  {:else if name === "moon"}
    <path d="M20 14.6A8.5 8.5 0 1 1 9.4 4a7 7 0 0 0 10.6 10.6Z" /><path
      d="M17.5 2.8l.9 2.2 2.2.9-2.2.9-.9 2.2-.9-2.2-2.2-.9 2.2-.9Z"
    />
  {:else if name === "user"}
    <circle cx="12" cy="8" r="4" /><path d="M4 21c0-4.4 3.6-7 8-7s8 2.6 8 7" />
  {:else if name === "heart"}
    <path
      d="M12 20.5S3.5 15 3.5 8.9A4.6 4.6 0 0 1 12 7a4.6 4.6 0 0 1 8.5 1.9C20.5 15 12 20.5 12 20.5Z"
    />
  {:else if name === "bottle"}
    <path d="M10 2.5h4M10.6 2.5v3.2M13.4 2.5v3.2" />
    <path
      d="M8.5 9.2a2.6 2.6 0 0 1 2.1-3.5h2.8a2.6 2.6 0 0 1 2.1 3.5V20a1.6 1.6 0 0 1-1.6 1.6h-3.8A1.6 1.6 0 0 1 8.5 20Z"
    />
    <path d="M8.5 13h3M8.5 16.5h3" />
  {:else if name === "sun"}
    <circle cx="12" cy="12" r="4" />
    <path
      d="M12 2v2M12 20v2M2 12h2M20 12h2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"
    />
  {:else if name === "refresh"}
    <path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8" /><path
      d="M21 3v5h-5"
    />
    <path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16" /><path
      d="M8 16H3v5"
    />
  {/if}
</svg>
