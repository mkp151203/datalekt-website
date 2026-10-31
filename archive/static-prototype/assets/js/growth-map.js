// Empowering growth: India as a fine dot grid (assets/js/india-map-data.js)
// with the partner cities from the list beside it. On first view the dots
// spread out from the first city, then the cities light up one by one, each
// linked to the last. A ripple runs through the dots from the active city.
(() => {
  const section = document.querySelector('.growth');
  const data = window.INDIA_MAP;
  if (!section || !data) return;

  const map = section.querySelector('.growth-map');
  const canvas = map.querySelector('.growth-dots');
  const ctx = canvas.getContext('2d');
  const statesGroup = map.querySelector('.growth-states');
  const arcsGroup = map.querySelector('.growth-arcs');
  const pinsLayer = map.querySelector('.growth-pins');
  const buttons = [...section.querySelectorAll('.growth-city')];
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const NS = 'http://www.w3.org/2000/svg';
  const { width: W, height: H, spacing: S, rowHeight: RH, projection: P } = data;

  // Timing
  const introMs = 1300;
  const stepMs = 1500; // between cities on the first pass
  const cycleMs = 3400; // between cities after that
  const rippleSpeed = 0.42; // map units per millisecond
  const rippleBand = 46;

  const project = (lat, lon) => [P.pad + (lon - P.lonMin) * P.cos * P.k, P.pad + (P.latMax - lat) * P.k];

  // Cities, read from the list
  const cities = buttons.map((button) => {
    const [x, y] = project(Number(button.dataset.lat), Number(button.dataset.lon));
    const name = button.querySelector('.growth-city-name').firstChild.textContent.trim();
    const count = button.querySelector('.growth-city-name b').textContent;
    return { button, x, y, name, count, state: button.dataset.state, side: button.dataset.side };
  });
  const partnerStates = new Set(cities.map((c) => c.state));

  // State outlines
  data.states.forEach((state) => {
    const path = document.createElementNS(NS, 'path');
    path.setAttribute('d', state.d);
    if (partnerStates.has(state.name)) path.classList.add('is-partner');
    statesGroup.append(path);
  });

  // Dots
  const dots = [];
  const r = data.runs;
  for (let i = 0; i < r.length; i += 4) {
    const [row, start, length, state] = [r[i], r[i + 1], r[i + 2], r[i + 3]];
    const partner = partnerStates.has(data.states[state - 1].name);
    for (let c = start; c < start + length; c++) {
      dots.push({ x: c * S + (row % 2 ? S / 2 : 0) + S / 4, y: 2 + row * RH + RH / 2, partner });
    }
  }
  for (let i = 0; i < data.islands.length; i += 3) {
    dots.push({ x: data.islands[i], y: data.islands[i + 1], partner: partnerStates.has(data.states[data.islands[i + 2] - 1].name) });
  }
  const origin = cities[0];
  let farthest = 0;
  dots.forEach((dot) => {
    dot.d = Math.hypot(dot.x - origin.x, dot.y - origin.y);
    farthest = Math.max(farthest, dot.d);
  });

  // Pins
  cities.forEach((city) => {
    const pin = document.createElement('span');
    pin.className = 'growth-pin';
    pin.dataset.side = city.side;
    pin.style.left = `${(city.x / W) * 100}%`;
    pin.style.top = `${(city.y / H) * 100}%`;
    pin.innerHTML = `<i></i><b>${city.name}<small>${city.count}</small></b>`;
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
  const baseCtx = base.getContext('2d');
  let scale = 1;
  let ratio = 1;
  const dotRadius = () => Math.max(S * 0.3, 0.85 / scale);
  const restColour = (dot) => (dot.partner ? 'rgba(17, 107, 174, 0.72)' : 'rgba(11, 42, 63, 0.3)');

  function drawDots(target, alphaFor) {
    const radius = dotRadius();
    ['rgba(17, 107, 174, 0.72)', 'rgba(11, 42, 63, 0.3)'].forEach((colour) => {
      target.fillStyle = colour;
      target.beginPath();
      dots.forEach((dot) => {
        if (restColour(dot) !== colour) return;
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
    const width = map.clientWidth;
    if (!width) return;
    ratio = Math.min(window.devicePixelRatio || 1, 2);
    scale = width / W;
    [canvas, base].forEach((c) => {
      c.width = Math.round(width * ratio);
      c.height = Math.round((width * H) / W * ratio);
    });
    ctx.setTransform(ratio * scale, 0, 0, ratio * scale, 0, 0);
    baseCtx.setTransform(ratio * scale, 0, 0, ratio * scale, 0, 0);
    drawDots(baseCtx);
    paint(performance.now());
  }

  // Animation state
  let introStart = null;
  let ripple = null; // { x, y, start }
  let flight = null; // { path, start }
  let frame = 0;

  function paint(now) {
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.restore();

    let busy = false;
    if (introStart === null) return false;
    const intro = now - introStart;
    if (intro < introMs + 300) {
      // Dots spread out from the first city
      busy = true;
      drawDots(ctx, (dot) => Math.min(Math.max((intro - (dot.d / farthest) * introMs) / 300, 0), 1));
    } else {
      ctx.drawImage(base, 0, 0, base.width, base.height, 0, 0, W, H);
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
        ctx.fillStyle = '#45bbce';
        dots.forEach((dot) => {
          const off = Math.abs(Math.hypot(dot.x - ripple.x, dot.y - ripple.y) - radius);
          if (off > rippleBand) return;
          const t = (1 - off / rippleBand) * life;
          ctx.globalAlpha = t * 0.9;
          ctx.beginPath();
          ctx.arc(dot.x, dot.y, size * (1 + t * 0.9), 0, Math.PI * 2);
          ctx.fill();
        });
        ctx.globalAlpha = 1;
      }
    }

    if (flight) {
      const t = Math.min((now - flight.start) / 1000, 1);
      const eased = t < 0.5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2;
      const length = flight.path.getTotalLength();
      const point = flight.path.getPointAtLength(eased * length);
      packet.setAttribute('cx', point.x);
      packet.setAttribute('cy', point.y);
      packet.style.opacity = t < 1 ? 1 : 0;
      if (t < 1) busy = true;
      else flight = null;
    }
    return busy;
  }

  function loop(now) {
    frame = paint(now) ? requestAnimationFrame(loop) : 0;
  }
  const wake = () => { if (!frame && !reduce) frame = requestAnimationFrame(loop); };

  // Cities
  let active = -1;
  function activate(i, { arc = false } = {}) {
    active = i;
    cities.forEach((city, j) => {
      city.pin.classList.toggle('is-active', j === i);
      city.button.setAttribute('aria-pressed', String(j === i));
    });
    const city = cities[i];
    city.pin.classList.add('is-in');
    if (reduce) return;
    if (arc && city.arc) {
      city.arc.classList.add('is-drawn');
      flight = { path: city.arc, start: performance.now() };
    }
    ripple = { x: city.x, y: city.y, start: performance.now() + (arc && city.arc ? 700 : 0) };
    wake();
  }

  let timers = [];
  const at = (ms, fn) => timers.push(setTimeout(fn, ms));
  const clear = () => { timers.forEach(clearTimeout); timers = []; };

  function cycle(from) {
    clear();
    at(cycleMs, () => {
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
    cities.forEach((city, i) => at(introMs * 0.6 + i * stepMs, () => activate(i, { arc: true })));
    at(introMs * 0.6 + (cities.length - 1) * stepMs, () => cycle(cities.length - 1));
  }

  buttons.forEach((button, i) => button.addEventListener('click', () => {
    if (!started) return;
    // Mid first pass, finish building the network at once
    clear();
    cities.forEach((city) => {
      city.pin.classList.add('is-in');
      city.arc?.classList.add('is-drawn');
    });
    activate(i);
    if (!reduce) cycle(i);
  }));

  new ResizeObserver(resize).observe(map);

  if (reduce) {
    introStart = -Infinity;
    cities.forEach((city) => city.arc?.classList.add('is-drawn'));
    started = true;
    activate(0);
    cities.forEach((city) => city.pin.classList.add('is-in'));
    return;
  }

  new IntersectionObserver(([entry]) => {
    if (entry.isIntersecting) {
      if (!started) start();
      else if (!timers.length) cycle(active);
    } else if (started && timers.length) {
      // Out of view, stop moving between cities; the first pass, if still
      // running, finishes building the network at once
      clear();
      cities.forEach((city) => {
        city.pin.classList.add('is-in');
        city.arc?.classList.add('is-drawn');
      });
    }
  }, { threshold: 0.3 }).observe(map);
})();
