// Use case 2: the Table Information System. Based on the product
// recording (video2): tonight's bookings with their tables; staff tick
// a guest in, the floor plan turns their tables from reserved to seated,
// and "Who's here" shows everyone in the room.
// The switcher (../../switcher.ts) starts each loop and hears when it ends.
import { connectScene, type At } from '../../kit/scene-kit';

export function initScene(root: HTMLElement): void {
  const ucEmbed = connectScene(root);
  const wrap = root;
  const scene = wrap.querySelector('.t-scene') as HTMLElement;
  const $ = (s: string) => scene.querySelector(s) as HTMLElement;
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;

  // Tonight's bookings and tables, from the product recording
  const guests = [
    { id: 'sanya', name: 'Sanya Suri', initials: 'SS', time: '8:00 pm', pax: 2, tables: ['1', 'A12'], badge: ['ret', 'Returning'], note: '4th visit · prefers table 1' },
    { id: 'kshitij', name: 'Kshitij Rekhi', initials: 'KR', time: '8:00 pm', pax: 3, tables: ['A1', 'A2'], badge: ['vip', 'VIP'], note: 'VIP · birthday this month' },
    { id: 'aariya', name: 'Aariya Sawant', initials: 'AS', time: '8:00 pm', pax: 4, tables: ['BB', 'AB12'], badge: ['ret', 'Returning'], note: '2nd visit this month' },
    { id: 'kamal', name: 'Kamal Harris', initials: 'KH', time: '8:00 pm', pax: 5, tables: ['A'] },
    { id: 'vansh', name: 'Vansh Adwani', initials: 'VA', time: '8:00 pm', pax: 3, tables: ['2', '3'] },
    { id: 'elisa', name: 'Elisa Chopra', initials: 'EC', time: '6:00 pm', pax: 2, tables: [] },
  ];
  type Guest = (typeof guests)[number];

  // Floor plan: square 4-tops and long 6-tops, in plan coordinates
  const tables = [
    { id: '1', x: 70, y: 190, long: false }, { id: '2', x: 70, y: 260, long: false }, { id: '3', x: 70, y: 330, long: false },
    { id: 'A', x: 160, y: 190, long: false }, { id: 'A1', x: 160, y: 260, long: false }, { id: 'A2', x: 160, y: 330, long: false },
    { id: 'C', x: 290, y: 190, long: true }, { id: 'A12', x: 290, y: 260, long: true }, { id: 'AB12', x: 290, y: 330, long: true },
    { id: 'BB', x: 430, y: 190, long: true }, { id: 'D1', x: 430, y: 260, long: true }, { id: 'D2', x: 430, y: 330, long: true },
  ];

  const plan = $('.t-plan');
  const ns = 'http://www.w3.org/2000/svg';
  const el = (tag: string, attrs: Record<string, string | number>, parent: Element) => {
    const node = document.createElementNS(ns, tag);
    Object.entries(attrs).forEach(([k, v]) => node.setAttribute(k, String(v)));
    parent.append(node);
    return node;
  };
  el('rect', { x: 30, y: 26, width: 150, height: 96, rx: 10, fill: '#d9e3ea' }, plan);
  el('rect', { x: 180, y: 26, width: 80, height: 60, rx: 10, fill: '#d9e3ea' }, plan);
  el('text', { x: 105, y: 74, fill: '#7d93a4' }, plan).textContent = 'Bar';
  el('text', { x: 220, y: 56, fill: '#7d93a4' }, plan).textContent = 'Kitchen';

  const tableEls: Record<string, SVGElement> = {};
  tables.forEach((t) => {
    const g = el('g', { class: 'tb' }, plan);
    const w = t.long ? 76 : 36;
    const h = 32;
    const chairs = t.long ? [-24, 0, 24] : [0];
    chairs.forEach((dx) => {
      el('rect', { class: 'chair', x: t.x + dx - 6, y: t.y - h / 2 - 12, width: 12, height: 8, rx: 3 }, g);
      el('rect', { class: 'chair', x: t.x + dx - 6, y: t.y + h / 2 + 4, width: 12, height: 8, rx: 3 }, g);
    });
    if (!t.long) {
      el('rect', { class: 'chair', x: t.x - w / 2 - 12, y: t.y - 6, width: 8, height: 12, rx: 3 }, g);
      el('rect', { class: 'chair', x: t.x + w / 2 + 4, y: t.y - 6, width: 8, height: 12, rx: 3 }, g);
    }
    el('rect', { class: 'pulse', x: t.x - w / 2, y: t.y - h / 2, width: w, height: h, rx: 8 }, g);
    el('rect', { class: 'top', x: t.x - w / 2, y: t.y - h / 2, width: w, height: h, rx: 8 }, g);
    el('text', { x: t.x, y: t.y }, g).textContent = t.id;
    tableEls[t.id] = g;
  });

  // Reservation rows
  const rowsBox = $('.t-rows');
  const rows: Record<string, HTMLElement> = {};
  guests.forEach((g) => {
    const row = document.createElement('div');
    row.className = 't-row';
    const badge = g.badge ? `<span class="${g.badge[0]}">${g.badge[1]}</span>` : '';
    const tablesTag = g.tables.length ? `<span>T ${g.tables.join(', ')}</span>` : '<span>No table yet</span>';
    row.innerHTML = `<span class="t-av">${g.initials}</span><div><b>${g.name}</b><div class="t-tags"><span>${g.time}</span><span>${g.pax} guests</span>${tablesTag}${badge}</div></div><span class="t-check" aria-hidden="true"></span>`;
    rowsBox.append(row);
    rows[g.id] = row;
  });

  const count = $('.t-count');
  const toast = $('.t-toast');
  const toastSub = $('.t-toast-sub');
  const cursor = $('.t-cursor');
  const toggle = $('.t-switch');
  const chips = [...scene.querySelectorAll('.t-chip')];

  // Side by side when there is room, stacked on phones
  let stacked: boolean | null = null;
  let W = 1100;
  function layout() {
    const stack = wrap.clientWidth < 760;
    if (stack !== stacked) {
      stacked = stack;
      scene.classList.toggle('is-stack', stack);
      W = stack ? 640 : 1100;
      wrap.style.setProperty('--h', stack ? '1060px' : '620px');
    }
    wrap.style.setProperty('--s', Math.min(1, wrap.clientWidth / W).toFixed(4));
  }
  layout();
  new ResizeObserver(layout).observe(wrap);

  function aimAt(target: Element) {
    const s = scene.getBoundingClientRect();
    const b = target.getBoundingClientRect();
    const k = s.width / W;
    scene.style.setProperty('--cx', `${(b.left + b.width / 2 - s.left) / k - 4}px`);
    scene.style.setProperty('--cy', `${(b.top + b.height / 2 - s.top) / k - 2}px`);
  }

  let timers: number[] = [];
  let toastTimer = 0;
  let seated = 0;
  let visible = false;
  let idle = true;

  function setTables(ids: string[], state: string) {
    ids.forEach((id) => tableEls[id].setAttribute('class', `tb ${state}`));
  }

  function reset() {
    timers.forEach(clearTimeout);
    timers = [];
    seated = 0;
    count.textContent = '0';
    toggle.classList.remove('is-on');
    toast.classList.remove('is-in');
    chips.forEach((c) => c.classList.remove('is-in'));
    Object.keys(tableEls).forEach((id) => tableEls[id].setAttribute('class', 'tb'));
    guests.forEach((g) => {
      rows[g.id].classList.remove('is-seated', 'is-hidden');
      rows[g.id].querySelector('.t-check')!.classList.remove('is-on');
      setTables(g.tables, 'reserved');
    });
    scene.style.setProperty('--cx', stacked ? '560px' : '760px');
    scene.style.setProperty('--cy', stacked ? '900px' : '560px');
  }

  function checkIn(g: Guest, at: At, start: number) {
    const box = rows[g.id].querySelector('.t-check')!;
    at(start, () => aimAt(box));
    at(start + 800, () => {
      cursor.classList.add('is-click');
      box.classList.add('is-pressed');
    });
    at(start + 930, () => {
      cursor.classList.remove('is-click');
      box.classList.remove('is-pressed');
      box.classList.add('is-on');
      rows[g.id].classList.add('is-seated');
      toastSub.textContent = `${g.name} · ${g.note}`;
      toast.classList.add('is-in');
      clearTimeout(toastTimer);
      toastTimer = window.setTimeout(() => toast.classList.remove('is-in'), 1500);
    });
    at(start + 1150, () => {
      setTables(g.tables, 'seated just-seated');
      seated += g.pax;
      count.textContent = String(seated);
    });
  }

  function play() {
    reset();
    const at: At = (ms, fn) => timers.push(window.setTimeout(fn, ms));
    checkIn(guests[0], at, 500);
    at(1900, () => chips[0].classList.add('is-in'));
    checkIn(guests[2], at, 2400);
    at(3800, () => chips[1].classList.add('is-in'));
    checkIn(guests[1], at, 4300);
    at(5700, () => chips[2].classList.add('is-in'));

    // Show only who's here
    at(6500, () => aimAt(toggle));
    at(7300, () => { cursor.classList.add('is-click'); toggle.classList.add('is-on'); });
    at(7430, () => cursor.classList.remove('is-click'));
    at(7550, () => guests.forEach((g) => {
      if (!rows[g.id].classList.contains('is-seated')) rows[g.id].classList.add('is-hidden');
    }));
    at(10200, () => {
      toggle.classList.remove('is-on');
      guests.forEach((g) => rows[g.id].classList.remove('is-hidden'));
    });

    ucEmbed.loop(12500);

    at(12500, () => {
      if (ucEmbed.done()) idle = true;
      else if (visible && !reduce) play();
      else idle = true;
    });
  }

  reset();
  ucEmbed.register(() => { idle = false; play(); });

  new IntersectionObserver(([e]) => {
    visible = e.isIntersecting;
    if (visible && idle && !reduce) { idle = false; play(); }
  }, { threshold: 0.35 }).observe(wrap);

}
