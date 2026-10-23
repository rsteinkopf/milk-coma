<script>
  export let size = 200;
  export let a = "var(--magenta)";
  export let b = "var(--cyan)";
  export let spin = false;

  const C = 100;
  const ring = (r, n, off = 0) =>
    Array.from({ length: n }, (_, i) => {
      const t = (Math.PI * 2 * i) / n + off - Math.PI / 2;
      return [C + r * Math.cos(t), C + r * Math.sin(t)];
    });
  const pts = (p) =>
    p.map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join(" ");

  const oct = ring(86, 8, Math.PI / 8);
  const facets = oct.map((p, i) => pts([[C, C], p, oct[(i + 1) % 8]]));
  const octPts = pts(oct);
  const sqA = pts(ring(76, 4));
  const sqB = pts(ring(76, 4, Math.PI / 4));
  const core = pts(ring(52, 8, Math.PI / 8));
  const ticks = Array.from({ length: 48 }, (_, i) => {
    const t = (Math.PI * 2 * i) / 48;
    const long = i % 6 === 0;
    const r1 = long ? 90 : 93;
    return {
      x1: C + r1 * Math.cos(t),
      y1: C + r1 * Math.sin(t),
      x2: C + 98 * Math.cos(t),
      y2: C + 98 * Math.sin(t),
      long,
    };
  });
</script>

<div
  class="emblem"
  class:spin
  style="--ea:{a};--eb:{b};width:{size}px;height:{size}px"
>
  <svg viewBox="0 0 200 200" aria-hidden="true">
    <g class="ticks">
      {#each ticks as t}
        <line x1={t.x1} y1={t.y1} x2={t.x2} y2={t.y2} class:long={t.long} />
      {/each}
    </g>
    {#each facets as f, i}
      <polygon points={f} class={i % 2 ? "fb" : "fa"} />
    {/each}
    <polygon class="oct" points={octPts} />
    <g class="star"><polygon points={sqA} /><polygon points={sqB} /></g>
    <circle class="mid" cx="100" cy="100" r="62" />
    <polygon class="core" points={core} />
  </svg>
  <div class="center"><slot /></div>
</div>

<style>
  .emblem {
    position: relative;
    margin: 0 auto 3rem;
    filter: drop-shadow(0 0 5px var(--ea)) drop-shadow(0 0 16px var(--ea));
  }
  svg {
    width: 100%;
    height: 100%;
    display: block;
  }
  .center {
    position: absolute;
    inset: 0;
    display: grid;
    place-content: center;
    justify-items: center;
    gap: 2px;
    text-align: center;
  }
  .fa {
    fill: var(--ea);
    opacity: 0.22;
  }
  .fb {
    fill: var(--eb);
    opacity: 0.18;
  }
  .oct {
    fill: none;
    stroke: var(--ea);
    stroke-width: 2;
  }
  .star polygon {
    fill: none;
    stroke: var(--eb);
    stroke-width: 1.5;
    stroke-linejoin: miter;
  }
  .mid {
    fill: none;
    stroke: var(--ea);
    stroke-width: 1.2;
    stroke-dasharray: 1 5;
    stroke-linecap: round;
  }
  .core {
    fill: var(--void);
    stroke: var(--eb);
    stroke-width: 2;
  }
  .ticks line {
    stroke: var(--ea);
    stroke-width: 1.5;
    opacity: 0.7;
  }
  .ticks line.long {
    stroke: var(--eb);
    stroke-width: 2.5;
    opacity: 1;
  }
  .spin .ticks,
  .spin .star {
    transform-origin: 100px 100px;
  }
  .spin .ticks {
    animation: cw 40s linear infinite;
  }
  .spin .star {
    animation: ccw 28s linear infinite;
  }
  @keyframes cw {
    to {
      transform: rotate(360deg);
    }
  }
  @keyframes ccw {
    to {
      transform: rotate(-360deg);
    }
  }
</style>
