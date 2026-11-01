// Dot-grid ripple behind a section, adapted from wave.html. Rings spread from
// the pointer and light up the dots they pass; at rest nothing is drawn.
// Dots near the section's text are switched off so ripples never run behind
// words. Used by every <canvas data-wave> on the page:
//   data-quiet    selectors (inside the section) for text to keep clear of
//   data-ink      dot colour as "r, g, b" (brand blue by default)
//   data-ambient  also start a ripple every few seconds while on screen,
//                 so there is motion on touch screens too
import { initAll } from './lib/in-view';
import { prefersReducedMotion } from './lib/motion';

interface Dot {
  x: number;
  y: number;
  open: number;
}

interface Drop {
  x: number;
  y: number;
  radius: number;
  speed: number;
  maxRadius: number;
  bandWidth: number;
  strength: number;
}

interface Rect {
  left: number;
  right: number;
  top: number;
  bottom: number;
}

// Grid and dot appearance
const spacingX = 46;
const spacingY = 23;
const minRadius = 1.3;
const maxExtraRadius = 3.4;
const maxAlpha = 0.95;
const maxDrops = 14;
const quietPadding = 6; // fully clear this close to text
const quietFeather = 14; // then fade back in over this distance

export function initDotWaves(): void {
  if (prefersReducedMotion()) return;
  initAll('canvas[data-wave]', (canvas) => ripple(canvas as HTMLCanvasElement));
}

function ripple(canvas: HTMLCanvasElement): void {
  const host = canvas.parentElement;
  const ctx = canvas.getContext('2d');
  if (!host || !ctx) return;

  const ink = canvas.dataset.ink || '17, 107, 174'; // brand blue
  const quietSelector = canvas.dataset.quiet || '';

  let dots: Dot[] = [];
  let drops: Drop[] = [];
  let width = 0;
  let height = 0;
  let frame = 0;
  let lastMoveDrop = 0;
  let lastMoveX = -1e4;
  let lastMoveY = -1e4;
  const MOVE_COOLDOWN = 450; // ms between hover waves
  const MOVE_MIN_DISTANCE = 36; // px the pointer must travel to start another

  // Rendered boxes of the section's text, relative to the canvas
  function quietRects(): Rect[] {
    if (!quietSelector || !host) return [];
    const origin = canvas.getBoundingClientRect();
    const rects: Rect[] = [];
    host.querySelectorAll(quietSelector).forEach((el) => {
      // Measure the text itself, not the full width of block elements
      const range = document.createRange();
      range.selectNodeContents(el);
      for (const r of range.getClientRects()) {
        if (!r.width || !r.height) continue;
        rects.push({
          left: r.left - origin.left,
          right: r.right - origin.left,
          top: r.top - origin.top,
          bottom: r.bottom - origin.top,
        });
      }
    });
    return rects;
  }

  // 0 inside a text zone, easing up to 1 at the end of the feather
  function openness(x: number, y: number, rects: Rect[]): number {
    let nearest = Infinity;
    for (const r of rects) {
      const dx = Math.max(r.left - x, 0, x - r.right);
      const dy = Math.max(r.top - y, 0, y - r.bottom);
      nearest = Math.min(nearest, Math.hypot(dx, dy));
    }
    const t = Math.min(Math.max((nearest - quietPadding) / quietFeather, 0), 1);
    return t * t * (3 - 2 * t);
  }

  function initGrid() {
    const ratio = Math.min(window.devicePixelRatio || 1, 2);
    width = canvas.clientWidth;
    height = canvas.clientHeight;
    canvas.width = Math.round(width * ratio);
    canvas.height = Math.round(height * ratio);
    ctx!.setTransform(ratio, 0, 0, ratio, 0, 0);

    const rects = quietRects();
    dots = [];
    let row = 0;
    for (let y = spacingY; y < height; y += spacingY) {
      // Offset every other row by half a step for the diagonal stagger
      const xOffset = row % 2 === 0 ? 0 : spacingX / 2;
      for (let x = spacingX / 2 + xOffset; x < width; x += spacingX) {
        const open = openness(x, y, rects);
        if (open > 0) dots.push({ x, y, open });
      }
      row++;
    }
    draw();
  }

  function createDrop(x: number, y: number, strength: number) {
    if (drops.length >= maxDrops) drops.shift();
    drops.push({
      x,
      y,
      radius: 0,
      speed: 2.6,
      maxRadius: Math.max(width, height) * 0.55,
      bandWidth: 65,
      strength,
    });
    if (!frame) frame = requestAnimationFrame(tick);
  }

  function draw() {
    ctx!.clearRect(0, 0, width, height);
    if (!drops.length) return;

    for (const dot of dots) {
      let waveEffect = 0;

      for (const drop of drops) {
        const dx = dot.x - drop.x;
        const dy = dot.y - drop.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        const fromCrest = Math.abs(distance - drop.radius);
        const fromTrail = Math.abs(distance - (drop.radius - drop.bandWidth * 1.3));
        const lifeFade = Math.max(0, 1 - drop.radius / drop.maxRadius);

        // Primary ring: a cosine bell so dots swell and shrink smoothly
        if (fromCrest < drop.bandWidth) {
          const curve = (Math.cos((fromCrest / drop.bandWidth) * Math.PI) + 1) / 2;
          waveEffect += curve * lifeFade * drop.strength;
        }

        // Softer trailing ring
        if (drop.radius > drop.bandWidth * 1.3 && fromTrail < drop.bandWidth * 0.8) {
          const curve = (Math.cos((fromTrail / (drop.bandWidth * 0.8)) * Math.PI) + 1) / 2;
          waveEffect += curve * lifeFade * drop.strength * 0.45;
        }
      }

      // Clamp so overlapping rings don't make blobs, then quiet it near text
      waveEffect = Math.min(waveEffect, 1.35) * dot.open;
      if (waveEffect < 0.03) continue;

      ctx!.beginPath();
      ctx!.arc(dot.x, dot.y, minRadius + waveEffect * maxExtraRadius, 0, Math.PI * 2);
      ctx!.fillStyle = `rgba(${ink}, ${Math.sqrt(Math.min(waveEffect, 1)) * maxAlpha})`;
      ctx!.fill();
    }
  }

  function tick() {
    for (let i = drops.length - 1; i >= 0; i--) {
      drops[i].radius += drops[i].speed;
      if (drops[i].radius > drops[i].maxRadius) drops.splice(i, 1);
    }
    draw();
    frame = drops.length ? requestAnimationFrame(tick) : 0;
  }

  function pointFrom(event: PointerEvent): [number, number] {
    const rect = canvas.getBoundingClientRect();
    return [event.clientX - rect.left, event.clientY - rect.top];
  }

  host.addEventListener('pointermove', (event) => {
    // Wait for the last wave to settle and ignore tiny movements
    const now = performance.now();
    if (now - lastMoveDrop < MOVE_COOLDOWN) return;
    const [x, y] = pointFrom(event);
    if (Math.hypot(x - lastMoveX, y - lastMoveY) < MOVE_MIN_DISTANCE) return;
    createDrop(x, y, 0.7);
    lastMoveDrop = now;
    lastMoveX = x;
    lastMoveY = y;
  });
  host.addEventListener('pointerdown', (event) => createDrop(...pointFrom(event), 1.2));

  // A ripple from a random open spot every few seconds while on screen
  if ('ambient' in canvas.dataset) {
    let timer = 0;
    const pulse = () => {
      const spot = dots[Math.floor(Math.random() * dots.length)];
      if (spot && spot.open === 1) createDrop(spot.x, spot.y, 0.9);
      timer = window.setTimeout(pulse, 2600);
    };
    new IntersectionObserver(([entry]) => {
      clearTimeout(timer);
      if (entry.isIntersecting) timer = window.setTimeout(pulse, 600);
    }).observe(host);
  }

  // Text zones move when the layout or the web fonts change
  const layout = new ResizeObserver(initGrid);
  layout.observe(canvas);
  layout.observe(host);
  document.fonts.ready.then(initGrid);
}
