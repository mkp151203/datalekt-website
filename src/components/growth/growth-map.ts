// Empowering growth: India as a fine dot grid (data/india-map.json, built by
// tools/build-india-map.py) with the partner cities from the list beside it.
// The map data loads only when the section nears the screen. On first view
// the dots spread out from the first city, then the cities light up one by
// one, each linked to the last. A ripple runs through the dots from the
// active city.
import { prefersReducedMotion } from '../../scripts/lib/motion';
import { createTimeline } from '../../scripts/lib/timeline';

interface IndiaMap {
  width: number;
  height: number;
  spacing: number;
  rowHeight: number;
  projection: { lonMin: number; latMax: number; cos: number; k: number; pad: number };
  states: { name: string; d: string }[];
  /** Dot runs: [row, startCol, length, state index (1-based)] repeated */
  runs: number[];
  /** Island dots: [x, y, state index] repeated */
  islands: number[];
}

interface MapCity {
  button: HTMLElement;
  x: number;
  y: number;
  name: string;
  count: string;
  state: string;
  side: string;
  pin?: HTMLElement;
  arc?: SVGPathElement;
}

interface MapDot {
  x: number;
  y: number;
  partner: boolean;
  /** Distance from the first city, for the intro */
  d: number;
}

// Timing
const introMs = 1300;
const stepMs = 1500; // between cities on the first pass
const cycleMs = 3400; // between cities after that
const rippleSpeed = 0.42; // map units per millisecond
const rippleBand = 46;
const NS = 'http://www.w3.org/2000/svg';
const partnerColour = 'rgba(17, 107, 174, 0.72)';
const otherColour = 'rgba(11, 42, 63, 0.3)';

export function initGrowthMap(section: HTMLElement): void {
  const map = section.querySelector<HTMLElement>('.growth-map');
  if (!map) return;
  // Fetch the 68 KB of map data shortly before the map scrolls into view
  const loader = new IntersectionObserver(
    ([entry]) => {
      if (!entry.isIntersecting) return;
      loader.disconnect();
      import('../../data/india-map.json').then((module) =>
        buildMap(section, map, module.default as IndiaMap),
      );
    },
    { rootMargin: '800px 0px' },
  );
  loader.observe(map);
}

function buildMap(section: HTMLElement, map: HTMLElement, data: IndiaMap): void {
  const canvas = map.querySelector<HTMLCanvasElement>('.growth-dots');
  const ctx = canvas?.getContext('2d');
  const statesGroup = map.querySelector('.growth-states');
  const arcsGroup = map.querySelector('.growth-arcs');
  const pinsLayer = map.querySelector('.growth-pins');
  if (!canvas || !ctx || !statesGroup || !arcsGroup || !pinsLayer) return;

  const buttons = [...section.querySelectorAll<HTMLElement>('.growth-city')];
  const reduce = prefersReducedMotion();
  const { width: W, height: H, spacing: S, rowHeight: RH, projection: P } = data;

  const project = (lat: number, lon: number) => [
    P.pad + (lon - P.lonMin) * P.cos * P.k,
    P.pad + (P.latMax - lat) * P.k,
  ];

  // Cities, read from the list
  const cities: MapCity[] = buttons.map((button) => {
    const [x, y] = project(Number(button.dataset.lat), Number(button.dataset.lon));
    const nameEl = button.querySelector('.growth-city-name');
    const name = nameEl?.firstChild?.textContent?.trim() ?? '';
    const count = nameEl?.querySelector('b')?.textContent ?? '';
    return {
      button,
      x,
      y,
      name,
      count,
      state: button.dataset.state ?? '',
      side: button.dataset.side ?? 'right',
    };
  });
  if (!cities.length) return;
  const partnerStates = new Set(cities.map((c) => c.state));

  // State outlines
  data.states.forEach((state) => {
    const path = document.createElementNS(NS, 'path');
    path.setAttribute('d', state.d);
    if (partnerStates.has(state.name)) path.classList.add('is-partner');
    statesGroup.append(path);
  });

  // Dots
  const origin = cities[0];
  const dots: MapDot[] = [];
  const addDot = (x: number, y: number, state: number) =>
    dots.push({
      x,
      y,
      partner: partnerStates.has(data.states[state - 1].name),
      d: Math.hypot(x - origin.x, y - origin.y),
    });
  const r = data.runs;
  for (let i = 0; i < r.length; i += 4) {
    const [row, start, length, state] = [r[i], r[i + 1], r[i + 2], r[i + 3]];
    for (let c = start; c < start + length; c++) {
      addDot(c * S + (row % 2 ? S / 2 : 0) + S / 4, 2 + row * RH + RH / 2, state);
    }
  }
  for (let i = 0; i < data.islands.length; i += 3) {
    addDot(data.islands[i], data.islands[i + 1], data.islands[i + 2]);
  }
  const farthest = Math.max(...dots.map((dot) => dot.d));

  // Pins
  cities.forEach((city) => {
    const pin = document.createElement('span');
    pin.className = 'growth-pin';
    pin.dataset.side = city.side;
    pin.style.left = `${(city.x / W) * 100}%`;
    pin.style.top = `${(city.y / H) * 100}%`;
    pin.innerHTML = '<i></i><b></b>';
    const label = pin.querySelector('b')!;
    label.textContent = city.name;
    const count = document.createElement('small');
    count.textContent = city.count;
    label.append(count);
    pinsLayer.append(pin);
    city.pin = pin;
  });

  // Arcs from each city to the next, bowed to the left of travel
  cities.forEach((city, i) => {
    if (!i) return;
    const from = cities[i - 1];
    const dx = city.x - from.x;
    const dy = city.y - from.y;
    const bow = 0.24;
    const cx = (from.x + city.x) / 2 + dy * bow;
    const cy = (from.y + city.y) / 2 - dx * bow;
    const path = document.createElementNS(NS, 'path');
    path.setAttribute('d', `M${from.x} ${from.y}Q${cx} ${cy} ${city.x} ${city.y}`);
    path.setAttribute('pathLength', '1');
    arcsGroup.append(path);
    city.arc = path;
  });
  const packet = document.createElementNS(NS, 'circle');
  packet.setAttribute('r', '5');
  arcsGroup.append(packet);

  // Canvas: the resting dots are drawn once to an offscreen layer
  const base = document.createElement('canvas');
  const baseCtx = base.getContext('2d')!;
  let scale = 1;
  let ratio = 1;
  const dotRadius = () => Math.max(S * 0.3, 0.85 / scale);

  function drawDots(target: CanvasRenderingContext2D, alphaFor?: (dot: MapDot) => number) {
    const radius = dotRadius();
    [true, false].forEach((partner) => {
      target.fillStyle = partner ? partnerColour : otherColour;
      target.beginPath();
      dots.forEach((dot) => {
        if (dot.partner !== partner) return;
        const a = alphaFor ? alphaFor(dot) : 1;
        if (a <= 0) return;
        const rr = radius * a;
        target.moveTo(dot.x + rr, dot.y);
        target.arc(dot.x, dot.y, rr, 0, Math.PI * 2);
      });
      target.fill();
    });
  }

  function resize() {
    const width = map!.clientWidth;
    if (!width) return;
    ratio = Math.min(window.devicePixelRatio || 1, 2);
    scale = width / W;
    [canvas!, base].forEach((c) => {
      c.width = Math.round(width * ratio);
      c.height = Math.round(((width * H) / W) * ratio);
    });
    ctx!.setTransform(ratio * scale, 0, 0, ratio * scale, 0, 0);
    baseCtx.setTransform(ratio * scale, 0, 0, ratio * scale, 0, 0);
    drawDots(baseCtx);
    paint(performance.now());
  }

  // Animation state
  let introStart: number | null = null;
  let ripple: { x: number; y: number; start: number } | null = null;
  let flight: { path: SVGPathElement; start: number } | null = null;
  let frame = 0;

  function paint(now: number): boolean {
    ctx!.save();
    ctx!.setTransform(1, 0, 0, 1, 0, 0);
    ctx!.clearRect(0, 0, canvas!.width, canvas!.height);
    ctx!.restore();

    let busy = false;
    if (introStart === null) return false;
    const intro = now - introStart;
    if (intro < introMs + 300) {
      // Dots spread out from the first city
      busy = true;
      drawDots(ctx!, (dot) => Math.min(Math.max((intro - (dot.d / farthest) * introMs) / 300, 0), 1));
    } else {
      ctx!.drawImage(base, 0, 0, base.width, base.height, 0, 0, W, H);
    }

    if (ripple) {
      const radius = (now - ripple.start) * rippleSpeed;
      const life = 1 - radius / 900;
      if (life <= 0) {
        ripple = null;
      } else if (radius < 0) {
        busy = true; // waiting for the arc to land
      } else {
        busy = true;
        const size = dotRadius();
        const { x, y } = ripple;
        ctx!.fillStyle = '#45bbce';
        dots.forEach((dot) => {
          const off = Math.abs(Math.hypot(dot.x - x, dot.y - y) - radius);
          if (off > rippleBand) return;
          const t = (1 - off / rippleBand) * life;
          ctx!.globalAlpha = t * 0.9;
          ctx!.beginPath();
          ctx!.arc(dot.x, dot.y, size * (1 + t * 0.9), 0, Math.PI * 2);
          ctx!.fill();
        });
        ctx!.globalAlpha = 1;
      }
    }

    if (flight) {
      const t = Math.min((now - flight.start) / 1000, 1);
      const eased = t < 0.5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2;
      const length = flight.path.getTotalLength();
      const point = flight.path.getPointAtLength(eased * length);
      packet.setAttribute('cx', String(point.x));
      packet.setAttribute('cy', String(point.y));
      packet.style.opacity = t < 1 ? '1' : '0';
      if (t < 1) busy = true;
      else flight = null;
    }
    return busy;
  }

  function loop(now: number) {
    frame = paint(now) ? requestAnimationFrame(loop) : 0;
  }
  const wake = () => {
    if (!frame && !reduce) frame = requestAnimationFrame(loop);
  };

  // Cities
  let active = -1;
  function activate(i: number, { arc = false } = {}) {
    active = i;
    cities.forEach((city, j) => {
      city.pin?.classList.toggle('is-active', j === i);
      city.button.setAttribute('aria-pressed', String(j === i));
    });
    const city = cities[i];
    city.pin?.classList.add('is-in');
    if (reduce) return;
    if (arc && city.arc) {
      city.arc.classList.add('is-drawn');
      flight = { path: city.arc, start: performance.now() };
    }
    ripple = { x: city.x, y: city.y, start: performance.now() + (arc && city.arc ? 700 : 0) };
    wake();
  }

  const timeline = createTimeline();
  const showWholeNetwork = () =>
    cities.forEach((city) => {
      city.pin?.classList.add('is-in');
      city.arc?.classList.add('is-drawn');
    });

  function cycle(from: number) {
    timeline.clear();
    timeline.at(cycleMs, () => {
      activate((from + 1) % cities.length);
      cycle((from + 1) % cities.length);
    });
  }

  let started = false;
  function start() {
    started = true;
    introStart = performance.now();
    wake();
    // First pass: each city joins the network in turn
    cities.forEach((_, i) => timeline.at(introMs * 0.6 + i * stepMs, () => activate(i, { arc: true })));
    timeline.at(introMs * 0.6 + (cities.length - 1) * stepMs, () => cycle(cities.length - 1));
  }

  buttons.forEach((button, i) =>
    button.addEventListener('click', () => {
      if (!started) return;
      // Mid first pass, finish building the network at once
      timeline.clear();
      showWholeNetwork();
      activate(i);
      if (!reduce) cycle(i);
    }),
  );

  new ResizeObserver(resize).observe(map);

  if (reduce) {
    introStart = -Infinity;
    started = true;
    showWholeNetwork();
    activate(0);
    return;
  }

  new IntersectionObserver(
    ([entry]) => {
      if (entry.isIntersecting) {
        if (!started) start();
        else if (!timeline.size) cycle(active);
      } else if (started && timeline.size) {
        // Out of view, stop moving between cities; the first pass, if still
        // running, finishes building the network at once
        timeline.clear();
        showWholeNetwork();
      }
    },
    { threshold: 0.3 },
  ).observe(map);
}
