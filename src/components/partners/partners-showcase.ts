// Partners: one large photograph that changes hotel through a field of
// dots rippling out from the chosen dot, the same drop-and-ripple motif as
// the hero. The hotels come from .partners-roster in the markup (built from
// data/partners.ts); the dots and caption follow it.
// Between reveals the photo slowly pushes in. Hovering the section pauses
// it. Under reduced motion hotels switch instantly and nothing plays.
import { prefersReducedMotion } from '../../scripts/lib/motion';

interface Hotel {
  name: string;
  city: string;
  image: string;
}

const holdTime = 4200; // ms a hotel stays before the next reveal
const revealTime = 1700; // ms for the ripple to cross the photo
const pushIn = 0.05; // how far the photo slowly zooms while shown
const crop = 0.09; // trims the white corners baked into the photographs
const spacing = 15; // dot grid, CSS px
const dotMax = spacing * 0.78; // full-grown dots overlap into a solid photo

const label = (hotel: Hotel) => (hotel.city ? `${hotel.name}, ${hotel.city}` : hotel.name);
const easeOut = (t: number) => 1 - (1 - t) ** 3;
const easeInOut = (t: number) => 0.5 - Math.cos(Math.PI * t) / 2;

export function initPartnersShowcase(section: HTMLElement): void {
  const view = section.querySelector<HTMLElement>('.partners-view');
  const canvas = view?.querySelector<HTMLCanvasElement>('.partners-canvas');
  const ctx = canvas?.getContext('2d');
  const dotsBox = section.querySelector<HTMLElement>('.partners-dots');
  const captionName = section.querySelector<HTMLElement>('.caption-name');
  const captionCity = section.querySelector<HTMLElement>('.caption-city');
  if (!view || !canvas || !ctx || !dotsBox || !captionName || !captionCity) return;

  const roster: Hotel[] = [...section.querySelectorAll<HTMLElement>('.partners-roster li')].map((item) => ({
    name: item.textContent?.trim() ?? '',
    city: item.dataset.city || '',
    image: item.dataset.image ?? '',
  }));
  if (!roster.length) return;

  const reduceMotion = prefersReducedMotion();

  // Controls built from the roster
  const dots = roster.map((hotel, i) => {
    const dot = document.createElement('button');
    dot.type = 'button';
    dot.className = 'partner-dot';
    dot.dataset.name = label(hotel);
    dot.setAttribute('aria-label', `Show ${label(hotel)}`);
    dot.innerHTML = '<span class="partner-ring" aria-hidden="true"></span>';
    dot.addEventListener('click', () => go(i));
    dotsBox.append(dot);
    return dot;
  });

  section.querySelectorAll<HTMLElement>('.partners-arrow').forEach((arrow) => {
    const step = Number(arrow.dataset.step);
    arrow.addEventListener('click', () => {
      const from = pending >= 0 ? pending : next >= 0 ? next : current;
      go((from + step + roster.length) % roster.length);
    });
  });

  const images = roster.map((hotel) => {
    const img = new Image();
    img.decoding = 'async';
    img.src = hotel.image;
    return img;
  });

  let width = 0;
  let height = 0;
  let grid: { x: number; y: number }[] = [];

  let current = 0;
  let next = -1;
  let pending = -1;
  let shownAt = 0; // when the current photo began to appear
  let revealStart = 0;
  let origin = { x: 0, y: 0 };
  let reach = 1; // farthest corner from the ripple's origin

  let visible = false;
  let paused = false;
  let pausedAt = 0;
  let frame = 0;

  section.style.setProperty('--partner-duration', `${holdTime + revealTime}ms`);

  function resize() {
    const ratio = Math.min(window.devicePixelRatio || 1, 2);
    width = view!.clientWidth;
    height = view!.clientHeight;
    canvas!.width = Math.round(width * ratio);
    canvas!.height = Math.round(height * ratio);
    ctx!.setTransform(ratio, 0, 0, ratio, 0, 0);

    // A staggered grid, like the hero's dot field
    grid = [];
    let row = 0;
    for (let y = spacing / 2; y < height + spacing; y += spacing) {
      const shift = row % 2 ? spacing / 2 : 0;
      for (let x = shift; x < width + spacing; x += spacing) grid.push({ x, y });
      row++;
    }
    draw(performance.now());
  }

  // Cover-fit the cropped photo into the view, zoomed by `zoom`
  function drawPhoto(img: HTMLImageElement, zoom: number) {
    if (!img.complete || !img.naturalWidth) return;
    const sx = img.naturalWidth * crop;
    const sy = img.naturalHeight * crop;
    const sw = img.naturalWidth - sx * 2;
    const sh = img.naturalHeight - sy * 2;
    const scale = Math.max(width / sw, height / sh) * zoom;
    const dw = sw * scale;
    const dh = sh * scale;
    ctx!.drawImage(img, sx, sy, sw, sh, (width - dw) / 2, (height - dh) / 2, dw, dh);
  }

  const zoomFor = (since: number) =>
    reduceMotion ? 1 : 1 + pushIn * easeOut(Math.min(Math.max(since, 0) / (holdTime + revealTime), 1));

  function draw(now: number) {
    ctx!.clearRect(0, 0, width, height);
    drawPhoto(images[current], zoomFor(now - shownAt));
    if (next < 0) return;

    // The ripple front travels from the origin; dots just behind it are
    // still growing, which gives the halftone edge
    const progress = Math.min((now - revealStart) / revealTime, 1);
    const band = Math.min(280, reach * 0.45);
    const front = easeInOut(progress) * (reach + band);

    ctx!.save();
    ctx!.beginPath();
    for (const dot of grid) {
      const distance = Math.hypot(dot.x - origin.x, dot.y - origin.y);
      const grow = Math.min(Math.max((front - distance) / band, 0), 1);
      if (!grow) continue;
      const radius = dotMax * grow * grow * (3 - 2 * grow);
      ctx!.moveTo(dot.x + radius, dot.y);
      ctx!.arc(dot.x, dot.y, radius, 0, Math.PI * 2);
    }
    ctx!.clip();
    drawPhoto(images[next], zoomFor(now - revealStart));
    ctx!.restore();

    if (progress >= 1) {
      current = next;
      shownAt = revealStart;
      next = -1;
      const queued = pending;
      pending = -1;
      if (queued >= 0 && queued !== current) go(queued);
    }
  }

  // The point in the photo closest to a dot, so the ripple starts beside it
  function originFor(element: Element) {
    const b = element.getBoundingClientRect();
    const v = view!.getBoundingClientRect();
    const x = Math.min(Math.max(b.left + b.width / 2 - v.left, 0), width);
    const y = Math.min(Math.max(b.top + b.height / 2 - v.top, 0), height);
    return { x, y };
  }

  // Slide the old line up and out while the new one rises into place
  function swapLine(element: HTMLElement, text: string, animate: boolean): HTMLElement {
    if (!animate) {
      element.textContent = text;
      return element;
    }
    const incoming = element.cloneNode(false) as HTMLElement;
    incoming.textContent = text;
    incoming.classList.add('is-arriving');
    element.after(incoming);
    element.classList.add('is-leaving');
    void incoming.offsetWidth;
    incoming.classList.remove('is-arriving');
    element.addEventListener('transitionend', () => element.remove(), { once: true });
    setTimeout(() => element.remove(), 1000);
    return incoming;
  }

  let nameLine = captionName;
  let cityLine = captionCity;

  function mark(index: number, animate: boolean) {
    dots.forEach((dot, i) => {
      if (i === index) dot.setAttribute('aria-current', 'true');
      else dot.removeAttribute('aria-current');
    });
    const hotel = roster[index];
    nameLine = swapLine(nameLine, hotel.name, animate);
    cityLine = swapLine(cityLine, hotel.city, animate);
    view!.setAttribute('aria-label', label(hotel));
  }

  async function go(index: number) {
    if (next >= 0) {
      pending = index;
      return;
    }
    if (index === current) return;

    const img = images[index];
    if (!img.complete) {
      try {
        await img.decode();
      } catch {
        return;
      }
    }
    // Off screen or with reduced motion there is no ripple to watch: switch
    const instant = reduceMotion || !visible || document.hidden;
    mark(index, !instant);

    if (instant) {
      current = index;
      shownAt = performance.now();
      draw(shownAt);
      return;
    }

    origin = originFor(dots[index]);
    reach = Math.max(
      Math.hypot(origin.x, origin.y),
      Math.hypot(width - origin.x, origin.y),
      Math.hypot(origin.x, height - origin.y),
      Math.hypot(width - origin.x, height - origin.y),
    );
    revealStart = performance.now();
    next = index;
    start();
  }

  function tick(now: number) {
    if (!paused && next < 0 && now - shownAt > holdTime + revealTime) {
      go((current + 1) % roster.length);
    }
    draw(now);
    frame = requestAnimationFrame(tick);
  }

  function start() {
    if (frame || reduceMotion || !visible || document.hidden) return;
    frame = requestAnimationFrame(tick);
  }

  function stop() {
    cancelAnimationFrame(frame);
    frame = 0;
  }

  function setPaused(value: boolean) {
    if (value === paused) return;
    paused = value;
    section.classList.toggle('is-paused', paused);
    if (paused) {
      pausedAt = performance.now();
    } else {
      // Shift the clock so the hold resumes where it stopped
      shownAt += performance.now() - pausedAt;
    }
  }

  // Restart the countdown ring so it stays in step with the clock
  function restartProgress() {
    if (reduceMotion) return;
    section.classList.remove('is-playing');
    void section.offsetWidth;
    section.classList.add('is-playing');
  }

  section.addEventListener('pointerenter', (event) => {
    if (event.pointerType === 'mouse') setPaused(true);
  });
  section.addEventListener('pointerleave', () => setPaused(false));
  section.addEventListener('focusin', () => setPaused(true));
  section.addEventListener('focusout', (event) => {
    if (!section.contains(event.relatedTarget as Node | null)) setPaused(false);
  });

  new IntersectionObserver(([entry]) => {
    const wasVisible = visible;
    visible = entry.isIntersecting;
    if (visible && !wasVisible && next < 0 && !paused) {
      shownAt = performance.now();
      restartProgress();
    }
    if (visible) start();
    else stop();
  }).observe(view);

  document.addEventListener('visibilitychange', () => (document.hidden ? stop() : start()));

  new ResizeObserver(resize).observe(view);

  section.classList.add('is-ready');
  mark(0, false);

  images[0]
    .decode()
    .catch(() => {})
    .then(() => {
      view.classList.add('is-live');
      restartProgress();
      draw(performance.now());
    });
}
