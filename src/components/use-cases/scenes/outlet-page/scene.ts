// Use case 5: the Customisable Web Page. Based on the product recording
// (video5): the hotel's own page on Datalekt (bang.datalekt.com/paradise)
// with a promotions carousel and a card per outlet listing its offers,
// Menu and Reserve. Here staff add a promotion and an offer, publish,
// and the guest's page updates; the guest then reserves from it.
// The switcher (../../switcher.ts) starts each loop and hears when it ends.
import { connectScene, type At } from '../../kit/scene-kit';

export function initScene(root: HTMLElement): void {
  const ucEmbed = connectScene(root);
  const wrap = root;
  const scene = wrap.querySelector('.w-scene') as HTMLElement;
  const $ = (s: string) => scene.querySelector(s) as HTMLElement;
  const $$ = (s: string) => [...scene.querySelectorAll<HTMLElement>(s)];
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;

  const addBtn = $('.w-add');
  const thumbNew = $('.w-thumbs .pst.is-new');
  const input = $('.w-input');
  const editorNew = $('.w-offer.is-new');
  const typed = $('.w-typed');
  const publish = $('.w-publish');
  const track = $('.w-track');
  const posters = $$('.w-track .pst');
  const posterNew = posters[3];
  const dots = $$('.w-dots i');
  const page = $('.w-page');
  const offerNew = $('.w-pg-offer.is-new');
  const reserve = $('.w-reserve');
  const sheet = $('.w-sheet');
  const dim = $('.w-dim');
  const cursor = $('.w-cursor');
  const tap = $('.w-tap');
  const chips = $$('.w-chip');
  const offerText = 'New Year’s Eve Dinner | Dec 31 | 8 PM onwards';

  // Side by side when there is room, stacked on phones
  let stacked: boolean | null = null;
  let W = 1100;
  function layout() {
    const stack = wrap.clientWidth < 760;
    if (stack !== stacked) {
      stacked = stack;
      scene.classList.toggle('is-stack', stack);
      W = stack ? 660 : 1100;
      wrap.style.setProperty('--h', stack ? '1240px' : '640px');
    }
    wrap.style.setProperty('--s', Math.min(1, wrap.clientWidth / W).toFixed(4));
  }
  layout();
  new ResizeObserver(layout).observe(wrap);

  // Centre poster `index` in the phone's carousel (posters are 128 wide, 10 apart)
  function slideTo(index: number) {
    const screen = 252;
    track.style.setProperty('--tx', `${screen / 2 - 64 - index * 138}px`);
    posters.forEach((p, i) => p.classList.toggle('is-active', i === index));
    dots.forEach((d, i) => d.classList.toggle('on', i === index));
  }

  function pointAt(target: Element, prop: string) {
    const s = scene.getBoundingClientRect();
    const b = target.getBoundingClientRect();
    const k = s.width / W;
    scene.style.setProperty(`--${prop}x`, `${(b.left + b.width / 2 - s.left) / k - (prop === 'c' ? 4 : 0)}px`);
    scene.style.setProperty(`--${prop}y`, `${(b.top + b.height / 2 - s.top) / k - (prop === 'c' ? 2 : 0)}px`);
  }

  function click(target: Element, at: At, ms: number) {
    at(ms, () => pointAt(target, 'c'));
    at(ms + 700, () => { cursor.classList.add('is-click'); target.classList.add('is-pressed'); });
    at(ms + 830, () => { cursor.classList.remove('is-click'); target.classList.remove('is-pressed'); });
    return ms + 830;
  }

  let timers: number[] = [];
  let visible = false;
  let idle = true;

  function reset() {
    timers.forEach(clearTimeout);
    timers = [];
    thumbNew.classList.remove('is-in');
    editorNew.classList.remove('is-in');
    input.classList.remove('is-focus');
    typed.innerHTML = '<span class="ph">Add an offer…</span>';
    publish.classList.add('is-idle');
    publish.classList.remove('is-done');
    publish.textContent = 'Publish';
    posterNew.classList.add('is-hidden');
    dots[3].classList.add('is-hidden');
    page.style.transform = '';
    offerNew.classList.remove('is-in');
    sheet.classList.remove('is-open');
    dim.classList.remove('is-on');
    tap.classList.remove('is-down');
    chips.forEach((c) => c.classList.remove('is-in'));
    $$('.w-links path').forEach((p) => p.classList.remove('is-drawn'));
    $$('.w-packet').forEach((p) => p.classList.remove('is-moving'));
    slideTo(0);
  }

  function play() {
    reset();
    const at: At = (ms, fn) => timers.push(window.setTimeout(fn, ms));

    // The guest's page is live: the promotions carousel turns
    at(700, () => slideTo(1));
    at(2200, () => slideTo(2));

    // 1. Staff add a New Year's Eve poster
    let t = click(addBtn, at, 900);
    at(t, () => { thumbNew.classList.add('is-in'); publish.classList.remove('is-idle'); chips[0].classList.add('is-in'); });

    // 2. And a New Year's Eve offer for UKIYO
    t = click(input, at, t + 300);
    at(t, () => { input.classList.add('is-focus'); typed.innerHTML = '<i class="w-caret"></i>'; });
    [...offerText].forEach((_, i) => at(t + 100 + i * 38, () => {
      typed.innerHTML = `${offerText.slice(0, i + 1)}<i class="w-caret"></i>`;
    }));
    t += 100 + offerText.length * 38 + 200;
    at(t, () => { input.classList.remove('is-focus'); typed.textContent = offerText; });

    // 3. One click publishes both to the guest's page
    t = click(publish, at, t + 200);
    at(t, () => {
      publish.classList.add('is-done');
      publish.textContent = 'Published ✓';
      chips[1].classList.add('is-in');
      editorNew.classList.add('is-in');
      typed.innerHTML = '<span class="ph">Add an offer…</span>';
    });
    const link = $(stacked ? '.w-links-stack path' : '.w-links-wide path');
    const packet = $(stacked ? '.w-packet-stack' : '.w-packet-wide');
    at(t + 100, () => link.classList.add('is-drawn'));
    at(t + 300, () => packet.classList.add('is-moving'));
    at(t + 1000, () => { posterNew.classList.remove('is-hidden'); dots[3].classList.remove('is-hidden'); slideTo(3); });
    at(t + 2300, () => { page.style.transform = 'translateY(-266px)'; });
    at(t + 3200, () => offerNew.classList.add('is-in'));

    // 4. The guest reserves straight from the page
    at(t + 4400, () => { pointAt(reserve, 't'); tap.classList.add('is-down'); reserve.classList.add('is-pressed'); });
    at(t + 4650, () => { tap.classList.remove('is-down'); reserve.classList.remove('is-pressed'); dim.classList.add('is-on'); sheet.classList.add('is-open'); chips[2].classList.add('is-in'); });

    ucEmbed.loop(t + 8200);

    at(t + 8200, () => {
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
