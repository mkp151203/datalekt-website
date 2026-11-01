// Use case 6: Guest Database Management. Based on the product recording
// (video1): All Clients (Total 1098 · Pending 251 · Completed 847), the
// client list with category tags, the database filter (dates, rating,
// age, categories, do-not-disturb) narrowing to 18 guests, and the
// filtered list. Each guest is drawn as a dot so the narrowing shows.
// The switcher (../../switcher.ts) starts each loop and hears when it ends.
import { connectScene, type At } from '../../kit/scene-kit';

export function initScene(root: HTMLElement): void {
  const ucEmbed = connectScene(root);
  const wrap = root;
  const scene = wrap.querySelector('.g-scene') as HTMLElement;
  const $ = (s: string) => scene.querySelector(s) as HTMLElement;
  const $$ = (s: string) => [...scene.querySelectorAll<HTMLElement>(s)];
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;

  const TOTAL = 1098;
  // Guests left after each filter: 4★, AASMANA, UKIYO, REGULAR, VIP, no DND
  const steps = [412, 188, 74, 39, 21, 18];

  // Client lists, from the product recording
  const allClients = [
    ['Manusha', 'M', 'U'],
    ['Ankur Walia', 'AW', 'USCMH'],
    ['Ashish Ray', 'AR', 'USCMH'],
    ['Ramandeep', 'R', 'U'],
    ['Illisha Kala', 'IK', 'AUSCIV'],
    ['Anirudhya Basu', 'AB', 'UASCMH'],
    ['Saniya Shriyan', 'SS', 'A'],
    ['Praveen Singh', 'PS', 'AU'],
  ];
  const filtered = [
    ['Illisha Kala', 'IK', 'AURSV'],
    ['Calissa Fernandez', 'CF', 'AUREHV'],
    ['Jesicca Parti', 'JP', 'AURIV'],
    ['Nishita D’silva', 'ND', 'AURCSV'],
    ['Charles James', 'CJ', 'AURSV'],
    ['Sanya Suri', 'SS', 'KAURVSCMH'],
    ['Shilpi Khanna', 'SK', 'AURIV'],
    ['Aarthi Khanna', 'AK', 'AURCV'],
  ];
  const row = ([name, initials, tags]: string[]) =>
    `<div class="g-row"><span class="g-av">${initials}</span><div><b>${name}</b><span class="g-tags">${[...tags].map((t) => `<i>${t}</i>`).join('')}</span></div></div>`;
  $('.g-rows-all').innerHTML = allClients.map(row).join('');
  $('.g-rows-filtered').innerHTML = filtered.map(row).join('');

  const stars = $$('.g-stars i');
  const cats = $$('.g-chips [data-k]');
  const dnd = $('.g-switch');
  const apply = $('.g-apply');
  const listAll = $('.g-all');
  const listFiltered = $('.g-filtered');
  const filteredRows = $$('.g-rows-filtered .g-row');
  const sanya = filteredRows[5];
  const profile = $('.g-profile');
  const count = $('.g-count');
  const stats: [HTMLElement, number][] = [
    [$('.g-total'), 1098],
    [$('.g-pending'), 251],
    [$('.g-completed'), 847],
  ];
  const chips = $$('.g-chip');
  const cursor = $('.g-cursor');

  // Side by side when there is room, stacked on phones
  let stacked: boolean | null = null;
  let W = 1100;
  function layout() {
    const stack = wrap.clientWidth < 760;
    if (stack !== stacked) {
      stacked = stack;
      scene.classList.toggle('is-stack', stack);
      W = stack ? 660 : 1100;
      wrap.style.setProperty('--h', stack ? '1330px' : '650px');
    }
    wrap.style.setProperty('--s', Math.min(1, wrap.clientWidth / W).toFixed(4));
  }
  layout();
  new ResizeObserver(layout).observe(wrap);

  // ---- The dot field: one dot per guest ----
  const canvas = $('.g-canvas') as HTMLCanvasElement;
  const ctx = canvas.getContext('2d')!;
  let cw = 0;
  let ch = 0;
  // One dot per guest: v is its current size (0-1), easing from `from` to `to`
  let dots: { x: number; y: number; rank: number; v: number; from: number; to: number; start: number }[] = [];
  let shown = 0; // how many guests currently match
  let finalGlow = false;
  let glowStart = 0;

  // A fixed shuffle, so the same guests survive each filter every loop
  const order = Array.from({ length: TOTAL }, (_, i) => i);
  let seed = 42;
  const rand = () => (seed = (seed * 1103515245 + 12345) % 2147483648) / 2147483648;
  for (let i = TOTAL - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [order[i], order[j]] = [order[j], order[i]];
  }

  function buildField() {
    // Canvas size in scene pixels (the scene itself may be scaled)
    cw = canvas.offsetWidth;
    ch = canvas.offsetHeight;
    const ratio = Math.min(devicePixelRatio || 1, 2);
    canvas.width = Math.round(cw * ratio);
    canvas.height = Math.round(ch * ratio);
    ctx.setTransform(ratio, 0, 0, ratio, 0, 0);

    const cols = Math.round(Math.sqrt((TOTAL * cw) / ch));
    const rows = Math.ceil(TOTAL / cols);
    const gx = cw / cols;
    const gy = ch / rows;
    const old = dots;
    dots = [];
    for (let i = 0; i < TOTAL; i++) {
      const c = i % cols;
      const r = Math.floor(i / cols);
      dots.push({
        x: gx * (c + 0.5),
        y: gy * (r + 0.5),
        rank: order[i],
        v: old[i] ? old[i].v : 0,
        from: 0,
        to: old[i] ? old[i].to : 0,
        start: 0,
      });
    }
  }

  // Narrow (or fill) the field to `n` guests, sweeping left to right
  function setShown(n: number, sweep = 450) {
    const now = performance.now();
    dots.forEach((d) => {
      const target = d.rank < n ? 1 : 0;
      if (target !== d.to) {
        d.from = d.v;
        d.to = target;
        d.start = now + (d.x / cw) * sweep;
      }
    });
    shown = n;
  }

  const ease = (t: number) => 1 - (1 - t) ** 3;

  function draw(now: number) {
    ctx.clearRect(0, 0, cw, ch);
    const pulse = finalGlow ? (Math.sin((now - glowStart) / 260) + 1) / 2 : 0;
    for (const d of dots) {
      const p = Math.min(Math.max((now - d.start) / 380, 0), 1);
      d.v = d.from + (d.to - d.from) * ease(p);
      const keep = finalGlow && d.rank < shown;
      if (keep) {
        ctx.beginPath();
        ctx.arc(d.x, d.y, 7 + pulse * 4, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(69, 187, 206, ${0.18 + (1 - pulse) * 0.14})`;
        ctx.fill();
        ctx.beginPath();
        ctx.arc(d.x, d.y, 4.2, 0, Math.PI * 2);
        ctx.fillStyle = '#45bbce';
        ctx.fill();
        continue;
      }
      ctx.beginPath();
      ctx.arc(d.x, d.y, 0.9 + d.v * 1.9, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(17, 107, 174, ${0.1 + d.v * 0.72})`;
      ctx.fill();
    }
  }

  let frame = 0;
  function loop(now: number) {
    draw(now);
    frame = requestAnimationFrame(loop);
  }

  // Count a number smoothly to a new value
  const counters = new Map<HTMLElement, number>();
  function countTo(el: HTMLElement, to: number, ms = 500) {
    const from = parseInt((el.textContent ?? '').replace(/\D/g, ''), 10) || 0;
    const start = performance.now();
    cancelAnimationFrame(counters.get(el) ?? 0);
    const step = (now: number) => {
      const t = Math.min((now - start) / ms, 1);
      el.textContent = Math.round(from + (to - from) * ease(t)).toLocaleString('en-IN');
      if (t < 1) counters.set(el, requestAnimationFrame(step));
    };
    counters.set(el, requestAnimationFrame(step));
  }

  function aimAt(target: Element) {
    const s = scene.getBoundingClientRect();
    const b = target.getBoundingClientRect();
    const k = s.width / W;
    scene.style.setProperty('--cx', `${(b.left + b.width / 2 - s.left) / k - 4}px`);
    scene.style.setProperty('--cy', `${(b.top + b.height / 2 - s.top) / k - 2}px`);
  }

  function click(target: Element, at: At, ms: number, travel = 600) {
    at(ms, () => aimAt(target));
    at(ms + travel, () => {
      cursor.classList.add('is-click');
      target.classList.add('is-pressed');
    });
    at(ms + travel + 130, () => {
      cursor.classList.remove('is-click');
      target.classList.remove('is-pressed');
    });
    return ms + travel + 130;
  }

  let timers: number[] = [];
  let visible = false;
  let idle = true;

  function reset() {
    timers.forEach(clearTimeout);
    timers = [];
    finalGlow = false;
    stars.forEach((s) => s.classList.remove('on'));
    cats.forEach((c) => c.classList.remove('on'));
    dnd.classList.remove('on');
    apply.classList.remove('is-done');
    apply.textContent = 'Apply';
    listAll.classList.remove('is-off');
    listFiltered.classList.add('is-off');
    filteredRows.forEach((r) => r.classList.remove('in'));
    profile.classList.remove('is-in');
    chips.forEach((c) => c.classList.remove('is-in'));
    stats.forEach(([el]) => {
      el.textContent = '0';
    });
    count.textContent = '0';
    dots.forEach((d) => {
      d.v = 0;
      d.from = 0;
      d.to = 0;
      d.start = 0;
    });
    shown = 0;
  }

  function play() {
    reset();
    const at: At = (ms, fn) => timers.push(window.setTimeout(fn, ms));

    // 1. The whole database: every guest, one dot
    at(200, () => {
      setShown(TOTAL, 900);
      stats.forEach(([el, n]) => countTo(el, n, 1100));
      countTo(count, TOTAL, 1100);
      chips[0].classList.add('is-in');
    });

    // 2. Each filter narrows it
    let t = click(stars[3], at, 1700);
    at(t, () => {
      stars.slice(0, 4).forEach((s) => s.classList.add('on'));
      setShown(steps[0]);
      countTo(count, steps[0]);
    });
    cats.forEach((cat, i) => {
      t = click(cat, at, t + 250, 480);
      const n = steps[i + 1];
      at(t, () => {
        cat.classList.add('on');
        setShown(n);
        countTo(count, n);
      });
    });
    t = click(dnd, at, t + 250);
    at(t, () => {
      dnd.classList.add('on');
      setShown(steps[5]);
      countTo(count, steps[5]);
      chips[1].classList.add('is-in');
    });

    // 3. Apply: the 18 light up and the list shows them
    t = click(apply, at, t + 300);
    at(t, () => {
      apply.classList.add('is-done');
      apply.textContent = 'Applied ✓';
      finalGlow = true;
      glowStart = performance.now();
      listAll.classList.add('is-off');
      listFiltered.classList.remove('is-off');
      filteredRows.forEach((r, i) => {
        r.style.animationDelay = `${i * 60}ms`;
        r.classList.add('in');
      });
      chips[2].classList.add('is-in');
    });

    // 4. Open one guest's full profile
    t = click(sanya, at, t + 1200);
    at(t + 100, () => {
      profile.classList.add('is-in');
      chips[3].classList.add('is-in');
    });

    ucEmbed.loop(t + 5200);

    at(t + 5200, () => {
      if (ucEmbed.done()) idle = true;
      else if (visible && !reduce) play();
      else idle = true;
    });
  }

  buildField();
  new ResizeObserver(() => {
    buildField();
    draw(performance.now());
  }).observe(canvas);

  if (reduce) {
    // A still picture: the narrowed result
    setShown(steps[5], 0);
    dots.forEach((d) => {
      d.v = d.to;
      d.from = d.to;
      d.start = 0;
    });
    finalGlow = true;
    stats.forEach(([el, n]) => {
      el.textContent = n.toLocaleString('en-IN');
    });
    count.textContent = String(steps[5]);
    stars.slice(0, 4).forEach((s) => s.classList.add('on'));
    cats.forEach((c) => c.classList.add('on'));
    dnd.classList.add('on');
    apply.classList.add('is-done');
    apply.textContent = 'Applied ✓';
    cursor.style.display = 'none';
    listAll.classList.add('is-off');
    listFiltered.classList.remove('is-off');
    draw(performance.now());
    return;
  }

  ucEmbed.register(() => {
    idle = false;
    play();
  });

  new IntersectionObserver(
    ([e]) => {
      visible = e.isIntersecting;
      if (visible) {
        if (!frame) frame = requestAnimationFrame(loop);
        if (idle) {
          idle = false;
          play();
        }
      } else {
        cancelAnimationFrame(frame);
        frame = 0;
      }
    },
    { threshold: 0.3 },
  ).observe(wrap);
}
