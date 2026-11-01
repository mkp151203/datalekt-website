// Preloader: the Datalekt mark grows cell by cell (adapted from mitosis.html).
// One mother cell divides until the full mark stands, then the mark holds
// (breathing gently) until the page has loaded and the screen lifts away.
// The exit runs on timers, not animation frames, so a browser that stalls
// frames (background tabs, some phones while loading) never leaves it stuck.

interface Dot {
  cx: number;
  cy: number;
}

interface Bar {
  x: number;
  y: number;
  w: number;
  h: number;
  rx: number;
}

const R = 40; // cell radius
const BRIDGE = 26; // thickness of the mark's three bars
const FORMED = 3.05; // the full mark stands from here
const EXIT_AT = 3.45; // the mark has settled; hold here until the page loads
const MAX_HOLD = 1600; // ms the formed mark waits for a slow page at most

const ease = (x: number) => (x < 0.5 ? 4 * x * x * x : 1 - (-2 * x + 2) ** 3 / 2);
const clamp = (x: number) => Math.max(0, Math.min(1, x));

// Width of the liquid neck between two cells as they part (p: 0 → 1)
function neck(p: number): number {
  if (p >= 0.82) return 0;
  if (p < 0.6) return 28 * (1 - p * 0.3);
  return 28 * 0.82 * (1 - (p - 0.6) / 0.22);
}

// Vertical and horizontal necks, from the fixed cell to the moving one
const vNeck = (x: number, y1: number, y2: number, w: number): Bar => ({
  x: x - w / 2,
  y: Math.min(y1, y2),
  w,
  h: Math.max(1, Math.abs(y2 - y1)),
  rx: w / 2,
});
const hNeck = (y: number, x1: number, x2: number, h: number): Bar => ({
  x: Math.min(x1, x2),
  y: y - h / 2,
  w: Math.max(1, Math.abs(x2 - x1)),
  h,
  rx: h / 2,
});
const bar = (y: number, x1: number, x2: number): Bar => hNeck(y, x1, x2, BRIDGE);

function frame(t: number): { dots: Dot[]; bars: Bar[] } {
  const dots: Dot[] = [];
  const bars: Bar[] = [];
  const dot = (cx: number, cy: number) => dots.push({ cx, cy });

  if (t < 0.25) {
    // One mother cell, resting
    dot(250, 250);
  } else if (t < 1.15) {
    // It divides up and down
    const p = clamp((t - 0.25) / 0.7);
    const e = ease(p);
    const y1 = 250 - 125 * e;
    const y7 = 250 + 125 * e;
    dot(250, 250);
    dot(250, y1);
    dot(250, y7);
    const w = neck(p);
    if (w > 1) bars.push(vNeck(250, 250, y1, w), vNeck(250, 250, y7, w));
  } else if (t < 2.05) {
    // The middle and bottom cells divide sideways
    const p = clamp((t - 1.15) / 0.7);
    const e = ease(p);
    const x5 = 250 + 125 * e;
    const x6 = 250 - 125 * e;
    [125, 250, 375].forEach((y) => dot(250, y));
    dot(x5, 250);
    dot(x6, 375);
    const h = neck(p);
    if (h > 1) bars.push(hNeck(250, 250, x5, h), hNeck(375, 250, x6, h));
  } else if (t < FORMED) {
    // The last three cells bud out, each held by a bar
    const e = ease(clamp((t - 2.05) / 0.75));
    const x8 = 250 + 125 * e;
    const xl = 250 - 125 * e;
    [125, 250, 375].forEach((y) => dot(250, y));
    dot(375, 250);
    dot(125, 375);
    dot(x8, 375);
    dot(xl, 250);
    dot(xl, 125);
    if (e > 0.01) bars.push(bar(125, xl, 250), bar(250, xl, 250), bar(375, 250, x8));
  } else {
    // The full mark
    [
      [125, 125],
      [250, 125],
      [125, 250],
      [250, 250],
      [375, 250],
      [125, 375],
      [250, 375],
      [375, 375],
    ].forEach(([x, y]) => dot(x, y));
    bars.push(bar(125, 125, 250), bar(250, 125, 250), bar(375, 250, 375));
  }
  return { dots, bars };
}

export function initPreloader(root: HTMLElement): void {
  const cells = root.querySelector('[data-cells]');
  if (!cells) return;
  // Scrolling is blocked with listeners rather than overflow: hidden, so the
  // scrollbar stays put and the page doesn't shift when the preloader lifts
  const keys = new Set([' ', 'PageUp', 'PageDown', 'Home', 'End', 'ArrowUp', 'ArrowDown']);
  const block = (event: Event) => {
    if (event instanceof KeyboardEvent && !keys.has(event.key)) return;
    event.preventDefault();
  };
  const blocked = ['wheel', 'touchmove', 'keydown'] as const;
  blocked.forEach((type) => window.addEventListener(type, block, { passive: false }));
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  let loaded = document.readyState === 'complete';
  if (!loaded) window.addEventListener('load', () => (loaded = true), { once: true });

  function render(t: number) {
    const { dots, bars } = frame(t);
    cells!.innerHTML =
      bars
        .map(
          (b) =>
            `<rect x="${b.x.toFixed(1)}" y="${b.y.toFixed(1)}" width="${b.w.toFixed(1)}" height="${b.h.toFixed(1)}" rx="${b.rx.toFixed(1)}"/>`,
        )
        .join('') +
      dots.map((d) => `<circle cx="${d.cx.toFixed(1)}" cy="${d.cy.toFixed(1)}" r="${R}"/>`).join('');
  }

  let done = false;
  function finish() {
    if (done) return;
    done = true;
    root.classList.add('is-done');
    blocked.forEach((type) => window.removeEventListener(type, block));
    root.addEventListener('transitionend', () => root.remove(), { once: true });
    setTimeout(() => root.remove(), 1200); // in case the transition never runs
  }

  let formed = false;
  function form() {
    if (formed || done) return;
    formed = true;
    render(EXIT_AT);
    root.classList.add('is-formed');
    if (loaded) {
      setTimeout(finish, 450);
      return;
    }
    // Hold the mark for the page, but only briefly: the content streams in
    // on its own after that
    root.classList.add('is-waiting');
    window.addEventListener('load', () => setTimeout(finish, 300), { once: true });
    setTimeout(finish, MAX_HOLD);
  }

  if (reduce) {
    setTimeout(form, 400);
    return;
  }

  // The build-up plays on animation frames; the timer forms the mark on time
  // even if frames stall
  setTimeout(form, EXIT_AT * 1000);
  const start = performance.now();
  function tick(now: number) {
    if (formed || done) return;
    const t = (now - start) / 1000;
    root.classList.toggle('is-formed', t >= FORMED);
    render(Math.min(t, EXIT_AT));
    requestAnimationFrame(tick);
  }
  render(0);
  requestAnimationFrame(tick);
}
