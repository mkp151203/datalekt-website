// Use case 1: Datalekt and the restaurant POS, in sync both ways.
// Based on the product recording (video6): a booking made in
// Datalekt opens the table on Oracle Simphony, and the bill rung up
// on the POS flows back into the guest's Datalekt profile.
// The switcher (../../switcher.ts) starts each loop and hears when it ends.
import { connectScene, type At } from '../../kit/scene-kit';

export function initScene(root: HTMLElement): void {
  const ucEmbed = connectScene(root);
  const wrap = root;
  const scene = wrap.querySelector('.uc-scene') as HTMLElement;
  const $ = (s: string) => scene.querySelector(s) as HTMLElement;
  const $$ = (s: string) => [...scene.querySelectorAll<HTMLElement>(s)];
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;

  const panes = { find: $('.uc-find'), book: $('.uc-book'), dash: $('.uc-dash') };
  const posPanes = { checks: $('.uc-checks'), ticket: $('.uc-ticket-pane') };
  const typed = $('.uc-typed');
  const result = $('.uc-result');
  const reserve = $('.uc-reserve');
  const t4 = $('.uc-t4');
  const submit = $('.uc-submit');
  const today = $('.uc-today');
  const spend = $('.uc-spend');
  const synced = $('.uc-synced');
  const newCheck = $('.uc-check.new');
  const items = $$('.uc-item');
  const sum = $('.uc-sum');
  const send = $('.uc-pos-actions .send');
  const tap = $('.uc-tap');
  const chipBook = $('.uc-chip-book');
  const chipBill = $('.uc-chip-bill');
  const prices = [320, 540, 260, 240];
  const number = '98190 43344';

  // Side by side when there is room, stacked on phones
  let stacked: boolean | null = null;
  let W = 1100;
  function layout() {
    const stack = wrap.clientWidth < 760;
    if (stack !== stacked) {
      stacked = stack;
      scene.classList.toggle('is-stack', stack);
      W = stack ? 600 : 1100;
      wrap.style.setProperty('--h', stack ? '980px' : '560px');
    }
    wrap.style.setProperty('--s', Math.min(1, wrap.clientWidth / W).toFixed(4));
  }
  layout();
  new ResizeObserver(layout).observe(wrap);

  const links = () => $$(stacked ? '.uc-links-stack path' : '.uc-links-wide path');
  const packets = () => $$(stacked ? '.uc-packet-stack' : '.uc-packet-wide');

  // Tap at an element's centre, in scene coordinates
  function tapOn(el: HTMLElement) {
    const s = scene.getBoundingClientRect();
    const b = el.getBoundingClientRect();
    const k = s.width / W;
    scene.style.setProperty('--tx', `${(b.left + b.width / 2 - s.left) / k}px`);
    scene.style.setProperty('--ty', `${(b.top + b.height / 2 - s.top) / k}px`);
    tap.classList.add('is-down');
    el.classList.add('is-pressed');
    setTimeout(() => { tap.classList.remove('is-down'); el.classList.remove('is-pressed'); }, 220);
  }

  function show(set: Record<string, HTMLElement>, name: string) {
    Object.entries(set).forEach(([key, pane]) => {
      pane.classList.toggle('is-on', key === name);
      pane.classList.toggle('is-off', key !== name && pane.classList.contains('is-on'));
    });
  }

  let timers: number[] = [];
  let visible = false;
  let idle = true;

  function reset() {
    timers.forEach(clearTimeout);
    timers = [];
    Object.values(panes).forEach((p) => p.classList.remove('is-on', 'is-off'));
    panes.find.classList.add('is-on');
    Object.values(posPanes).forEach((p) => p.classList.remove('is-on'));
    posPanes.checks.classList.add('is-on');
    typed.textContent = '';
    [result, newCheck, spend, synced, chipBook, chipBill, ...items].forEach((el) => el.classList.remove('is-in'));
    t4.classList.remove('is-picked');
    submit.classList.remove('is-done');
    submit.textContent = 'Submit';
    today.textContent = '3';
    sum.textContent = '0';
    $$('.uc-links path').forEach((p) => p.classList.remove('is-drawn'));
    $$('.uc-packet').forEach((p) => p.classList.remove('is-moving'));
  }

  function play() {
    reset();
    const at: At = (ms, fn) => timers.push(window.setTimeout(fn, ms));
    const [linkBook, linkBill] = links();
    const [packetBook, packetBill] = packets();

    // 1. Staff find the guest by mobile number
    [...number].forEach((ch, i) => at(300 + i * 75, () => { typed.textContent += ch; }));
    at(1300, () => result.classList.add('is-in'));
    at(2000, () => tapOn(reserve));

    // 2. Reserve UKIYO, table 4, and submit
    at(2300, () => show(panes, 'book'));
    at(3100, () => { tapOn(t4); t4.classList.add('is-picked'); });
    at(3800, () => tapOn(submit));
    at(4000, () => { submit.classList.add('is-done'); submit.textContent = 'Saved ✓'; });

    // 3. The booking opens the table on the POS
    at(4100, () => linkBook.classList.add('is-drawn'));
    at(4300, () => packetBook.classList.add('is-moving'));
    at(5000, () => { newCheck.classList.add('is-in'); chipBook.classList.add('is-in'); });
    at(5200, () => { show(panes, 'dash'); today.textContent = '4'; });

    // 4. The order is rung up on the POS
    at(6300, () => { posPanes.checks.classList.remove('is-on'); posPanes.ticket.classList.add('is-on'); });
    let running = 0;
    items.forEach((item, i) => at(6900 + i * 520, () => {
      const tile = $(`.uc-menu [data-hit="${i}"]`);
      tile.classList.add('is-hit');
      setTimeout(() => tile.classList.remove('is-hit'), 220);
      item.classList.add('is-in');
      running += prices[i];
      sum.textContent = running.toLocaleString('en-IN');
    }));
    at(9200, () => tapOn(send));

    // 5. The bill comes back to the guest's profile
    at(9400, () => linkBill.classList.add('is-drawn'));
    at(9600, () => packetBill.classList.add('is-moving'));
    at(10400, () => { spend.classList.add('is-in'); synced.classList.add('is-in'); chipBill.classList.add('is-in'); });

    ucEmbed.loop(14500);

    at(14500, () => {
      if (ucEmbed.done()) idle = true;
      else if (visible && !reduce) play();
      else idle = true;
    });
  }

  ucEmbed.register(() => { idle = false; play(); });


  new IntersectionObserver(([e]) => {
    visible = e.isIntersecting;
    if (visible && idle) { idle = false; play(); }
  }, { threshold: 0.35 }).observe(wrap);

}
