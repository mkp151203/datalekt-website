// Use case 4: Messaging Integration. Based on the product recording
// (video4): filter the guest database by rating, age and category, select
// the matching guests, pick a ready-made template and send it; each guest
// gets a personalised WhatsApp message.
// The switcher (../../switcher.ts) starts each loop and hears when it ends.
import { connectScene, type At } from '../../kit/scene-kit';

export function initScene(root: HTMLElement): void {
  const ucEmbed = connectScene(root);
  const wrap = root;
  const scene = wrap.querySelector('.m-scene') as HTMLElement;
  const $ = (s: string) => scene.querySelector(s) as HTMLElement;
  const $$ = (s: string) => [...scene.querySelectorAll<HTMLElement>(s)];
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;

  // Guests and templates, from the product recording
  const guests = [
    ['Vansh Adwani', 'VA', 'AURV'],
    ['Illisha Kala', 'IK', 'AUSCIV'],
    ['Jesicca Parti', 'JP', 'AURIV'],
    ['Nishita D’silva', 'ND', 'AURCSV'],
    ['Sanya Suri', 'SS', 'KAURSC'],
    ['Shilpi Khanna', 'SK', 'AURIV'],
    ['Lijo Thankachan', 'LT', 'KAURIV'],
    ['Aariya Sawant', 'AS', 'KAURAL'],
  ];
  // Optimised partner photos by file name, from the component
  const images: Record<string, string> = JSON.parse(wrap.dataset.images ?? '{}');
  const templates = [
    ['Chef Special', 'jw-marriott-pune.jpg'],
    ['Marriott Bonvoy Delights', 'jw-marriott-kolkata.jpg'],
    ['Saturday Sundowner', 'conrad-pune.jpg'],
    ['Bar Takeover', 'st-regis-mumbai.jpg'],
    ['Flavors of Italy', 'ritz-carlton-bangalore.jpg'],
    ['Sea Side Brunch', 'marriott-resort-goa.jpg'],
    ['Coldplay After-Party', 'hyatt-centric-hebbal-bengaluru.jpg'],
    ['Chivas Member Exclusive', 'leela-bhartiya-city-bengaluru.jpg'],
  ];

  $('.m-guests').innerHTML = guests
    .map(
      ([n, i, tags]) =>
        `<div class="m-guest"><span class="m-box"></span><span class="m-av">${i}</span><div><b>${n}</b><span class="m-dots">${[...tags].map((t) => `<i>${t}</i>`).join('')}</span></div></div>`,
    )
    .join('');
  $('.m-tpls').innerHTML = templates
    .map(([n, f]) => `<span class="m-tpl"><i style="background-image:url('${images[f]}')"></i>${n}</span>`)
    .join('');

  // Each phone shows the same template, addressed to that guest
  $$('.m-phone').forEach((phone) => {
    phone.innerHTML = `<div class="m-wa"><div class="m-wa-top"><i><img src="/brand/datalekt-mark.svg" alt=""></i>Datalekt <em class="m-tick">✓</em></div>
      <div class="m-msg"><img src="${images['marriott-resort-goa.jpg']}" alt=""><p>Hi <b>${phone.dataset.name}</b>, join us this Sunday for a slow seaside brunch with live music.</p><small>11:02 am</small><span class="m-cta">Reserve a table</span></div></div>`;
  });

  const panes = { filter: $('.m-filter'), list: $('.m-list'), tpl: $('.m-tpl-pane') };
  const steps = [$('.m-s1'), $('.m-s2'), $('.m-s3')];
  const stars = $$('.m-stars i');
  const cats = $$('.m-cats [data-k]');
  const match = $('.m-match');
  const applyBtn = $('.m-apply-btn');
  const boxAll = $('.m-all');
  const rows = $$('.m-guest');
  const selected = $('.m-selected');
  const nextBtn = $('.m-next');
  const tpls = $$('.m-tpl');
  const seaside = tpls[5];
  const preview = $('.m-preview');
  const sendBtn = $('.m-send-btn');
  const phones = $$('.m-phone');
  const delivered = $('.m-delivered');
  const chips = $$('.m-chip');
  const cursor = $('.m-cursor');

  // Side by side when there is room, stacked on phones
  let stacked: boolean | null = null;
  let W = 1100;
  function layout() {
    const stack = wrap.clientWidth < 760;
    if (stack !== stacked) {
      stacked = stack;
      scene.classList.toggle('is-stack', stack);
      W = stack ? 640 : 1100;
      wrap.style.setProperty('--h', stack ? '1000px' : '620px');
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

  function click(target: Element, at: At, ms: number, travel = 650) {
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

  function show(name: string, step: number) {
    Object.entries(panes).forEach(([key, pane]) => {
      const was = pane.classList.contains('is-on');
      pane.classList.toggle('is-on', key === name);
      pane.classList.toggle('is-off', key !== name && was);
    });
    steps.forEach((s, i) => {
      s.classList.toggle('on', i === step);
      s.classList.toggle('done', i < step);
    });
  }

  // Count a number smoothly to a new value
  function countTo(el: HTMLElement, from: number, to: number, ms: number) {
    const start = performance.now();
    const step = (now: number) => {
      const t = Math.min((now - start) / ms, 1);
      el.textContent = Math.round(from + (to - from) * (1 - (1 - t) ** 3)).toLocaleString('en-IN');
      if (t < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }

  let timers: number[] = [];
  let visible = false;
  let idle = true;

  function reset() {
    timers.forEach(clearTimeout);
    timers = [];
    show('filter', 0);
    Object.values(panes).forEach((p) => p.classList.remove('is-off'));
    stars.forEach((s) => s.classList.remove('on'));
    cats.forEach((c) => c.classList.remove('on'));
    match.textContent = '1,284';
    [applyBtn, nextBtn, sendBtn].forEach((b) => b.classList.remove('is-done'));
    applyBtn.textContent = 'Apply';
    sendBtn.textContent = 'Send';
    boxAll.classList.remove('on');
    rows.forEach((r) => {
      r.classList.remove('on');
      r.querySelector('.m-box')!.classList.remove('on');
    });
    selected.textContent = '0 selected';
    tpls.forEach((t) => t.classList.remove('on'));
    preview.classList.remove('is-in');
    phones.forEach((p) => p.querySelector('.m-msg')!.classList.remove('is-in'));
    delivered.textContent = '0';
    chips.forEach((c) => c.classList.remove('is-in'));
    $$('.m-links path').forEach((p) => p.classList.remove('is-drawn'));
    $$('.m-packet').forEach((p) => p.classList.remove('is-moving'));
  }

  function play() {
    reset();
    const at: At = (ms, fn) => timers.push(window.setTimeout(fn, ms));

    // 1. Narrow the audience: rating, then categories
    at(300, () => aimAt(stars[3]));
    stars.slice(0, 4).forEach((s, i) => at(900 + i * 90, () => s.classList.add('on')));
    at(1300, () => countTo(match, 1284, 312, 500));
    const counts = [146, 88, 41, 19];
    let t = 1500;
    cats.forEach((cat, i) => {
      const done = click(cat, at, t, 520);
      at(done - 130, () => {
        cat.classList.add('on');
        countTo(match, i ? counts[i - 1] : 312, counts[i], 420);
      });
      t = done + 80;
    });
    t = click(applyBtn, at, t + 150);
    at(t, () => {
      applyBtn.classList.add('is-done');
      applyBtn.textContent = 'Applied ✓';
      chips[0].classList.add('is-in');
    });

    // 2. Select every matching guest
    at(t + 300, () => show('list', 1));
    t = click(boxAll, at, t + 800);
    at(t, () => boxAll.classList.add('on'));
    rows.forEach((r, i) =>
      at(t + 60 + i * 55, () => {
        r.classList.add('on');
        r.querySelector('.m-box')!.classList.add('on');
        selected.textContent = `${Math.round(((i + 1) / rows.length) * 19)} selected`;
      }),
    );
    t = click(nextBtn, at, t + 650);

    // 3. Pick the template and send
    at(t + 150, () => show('tpl', 2));
    t = click(seaside, at, t + 700);
    at(t, () => {
      tpls.forEach((x) => x.classList.toggle('on', x === seaside));
      preview.classList.add('is-in');
    });
    t = click(sendBtn, at, t + 600);
    at(t, () => {
      sendBtn.classList.add('is-done');
      sendBtn.textContent = 'Sent ✓';
    });

    // 4. Every guest receives it, by name
    const link = $(stacked ? '.m-links-stack path' : '.m-links-wide path');
    const packet = $(stacked ? '.m-packet-stack' : '.m-packet-wide');
    at(t + 100, () => link.classList.add('is-drawn'));
    at(t + 300, () => {
      packet.classList.add('is-moving');
      chips[1].classList.add('is-in');
      countTo(delivered, 0, 19, 1800);
    });
    [1, 0, 2].forEach((p, i) =>
      at(t + 900 + i * 380, () => {
        phones[p].querySelector('.m-msg')!.classList.add('is-in');
        phones[p].classList.add('is-ping');
        setTimeout(() => phones[p].classList.remove('is-ping'), 350);
      }),
    );

    ucEmbed.loop(t + 6000);

    at(t + 6000, () => {
      if (ucEmbed.done()) idle = true;
      else if (visible && !reduce) play();
      else idle = true;
    });
  }

  ucEmbed.register(() => {
    idle = false;
    play();
  });

  new IntersectionObserver(
    ([e]) => {
      visible = e.isIntersecting;
      if (visible && idle && !reduce) {
        idle = false;
        play();
      }
    },
    { threshold: 0.35 },
  ).observe(wrap);
}
