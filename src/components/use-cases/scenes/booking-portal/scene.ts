// Use case 3: the Reservation Booking Portal. Based on the product
// recording (video3): a guest books on the hotel's own booking page,
// staff approve the request in Datalekt with one click, and the guest
// gets a branded confirmation ticket on WhatsApp.
// The switcher (../../switcher.ts) starts each loop and hears when it ends.
import { connectScene, type At } from '../../kit/scene-kit';

export function initScene(root: HTMLElement): void {
  const ucEmbed = connectScene(root);
  const wrap = root;
  const scene = wrap.querySelector('.b-scene') as HTMLElement;
  const $ = (s: string) => scene.querySelector(s) as HTMLElement;
  const $$ = (s: string) => [...scene.querySelectorAll<HTMLElement>(s)];
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;

  // A small QR-style pattern for the payment code
  (() => {
    const qr = ($('.b-qr') as HTMLCanvasElement).getContext('2d')!;
    qr.fillStyle = '#fff';
    qr.fillRect(0, 0, 21, 21);
    qr.fillStyle = '#111';
    let seed = 7;
    const rand = () => (seed = (seed * 9301 + 49297) % 233280) / 233280;
    for (let y = 0; y < 21; y++) for (let x = 0; x < 21; x++) if (rand() > 0.55) qr.fillRect(x, y, 1, 1);
    [
      [0, 0],
      [14, 0],
      [0, 14],
    ].forEach(([x, y]) => {
      qr.fillStyle = '#111';
      qr.fillRect(x, y, 7, 7);
      qr.fillStyle = '#fff';
      qr.fillRect(x + 1, y + 1, 5, 5);
      qr.fillStyle = '#111';
      qr.fillRect(x + 2, y + 2, 3, 3);
    });
  })();

  const restaurant = $('.b-restaurant');
  const list = $('.b-list');
  const ukiyo = $('.b-ukiyo');
  const fields = {
    name: $('.b-name'),
    phone: $('.b-phone-field'),
    note: $('.b-note-field'),
  };
  const pax = $('.b-pax');
  const date = $('.b-date');
  const time = $('.b-time');
  const submit = $('.b-btn.submit');
  const thanks = $('.b-thanks');
  const tablet = $('.b-tablet');
  const reserve = $('.b-note .reserve');
  const ticket = $('.b-ticket');
  const msg = $('.b-msg');
  const cursor = $('.b-cursor');
  const chips = $$('.b-chip');

  // Side by side when there is room, stacked on phones
  let stacked: boolean | null = null;
  let W = 1100;
  function layout() {
    const stack = wrap.clientWidth < 760;
    if (stack !== stacked) {
      stacked = stack;
      scene.classList.toggle('is-stack', stack);
      W = stack ? 680 : 1100;
      wrap.style.setProperty('--h', stack ? '940px' : '650px');
    }
    wrap.style.setProperty('--s', Math.min(1, wrap.clientWidth / W).toFixed(4));
  }
  layout();
  new ResizeObserver(layout).observe(wrap);

  const links = () => $$(stacked ? '.b-links-stack path' : '.b-links-wide path');
  const packets = () => $$(stacked ? '.b-packet-stack' : '.b-packet-wide');

  function aimAt(target: Element) {
    const s = scene.getBoundingClientRect();
    const b = target.getBoundingClientRect();
    const k = s.width / W;
    scene.style.setProperty('--cx', `${(b.left + b.width / 2 - s.left) / k - 4}px`);
    scene.style.setProperty('--cy', `${(b.top + b.height / 2 - s.top) / k - 2}px`);
  }

  function click(target: Element, at: At, ms: number) {
    at(ms, () => aimAt(target));
    at(ms + 750, () => {
      cursor.classList.add('is-click');
      target.classList.add('is-pressed');
    });
    at(ms + 880, () => {
      cursor.classList.remove('is-click');
      target.classList.remove('is-pressed');
    });
  }

  // Type into a field, one character at a time
  function type(field: HTMLElement, text: string, at: At, start: number, step = 70) {
    const val = field.querySelector('.val') as HTMLElement;
    const ph = field.querySelector<HTMLElement>('.ph');
    at(start, () => {
      field.classList.add('is-focus');
      if (ph) ph.style.display = 'none';
      val.innerHTML = '<i class="b-caret"></i>';
    });
    [...text].forEach((_, i) =>
      at(start + 80 + i * step, () => {
        val.innerHTML = `${text.slice(0, i + 1)}<i class="b-caret"></i>`;
      }),
    );
    at(start + 80 + text.length * step + 150, () => {
      field.classList.remove('is-focus');
      val.textContent = text;
    });
  }

  let timers: number[] = [];
  let visible = false;
  let idle = true;

  function reset() {
    timers.forEach(clearTimeout);
    timers = [];
    (restaurant.querySelector('.val') as HTMLElement).textContent = 'AASMANA';
    list.classList.remove('is-open');
    ukiyo.classList.remove('is-hit');
    Object.values(fields).forEach((f) => {
      f.classList.remove('is-focus');
      (f.querySelector('.val') as HTMLElement).textContent = '';
      const ph = f.querySelector<HTMLElement>('.ph');
      if (ph) ph.style.display = '';
    });
    pax.textContent = '2';
    date.classList.remove('on');
    time.classList.remove('on');
    submit.classList.remove('is-done');
    submit.textContent = 'Submit';
    thanks.classList.remove('is-in');
    tablet.classList.remove('has-note');
    reserve.classList.remove('is-done');
    reserve.textContent = 'Reserve';
    ticket.classList.remove('is-in');
    msg.classList.remove('is-in');
    chips.forEach((c) => c.classList.remove('is-in'));
    $$('.b-links path').forEach((p) => p.classList.remove('is-drawn'));
    $$('.b-packet').forEach((p) => p.classList.remove('is-moving'));
  }

  function play() {
    reset();
    const at: At = (ms, fn) => timers.push(window.setTimeout(fn, ms));
    const [linkIn, linkOut] = links();
    const [packetIn, packetOut] = packets();

    // 1. The guest fills the booking overlay
    click(restaurant, at, 200);
    at(1000, () => list.classList.add('is-open'));
    at(1450, () => ukiyo.classList.add('is-hit'));
    at(1700, () => {
      list.classList.remove('is-open');
      (restaurant.querySelector('.val') as HTMLElement).textContent = 'UKIYO';
    });
    type(fields.name, 'Elisha Suri', at, 1900);
    type(fields.phone, '+91 97232 32356', at, 2950, 55);
    [3, 4, 5].forEach((n, i) =>
      at(4000 + i * 180, () => {
        pax.textContent = String(n);
      }),
    );
    at(4600, () => date.classList.add('on'));
    at(4850, () => time.classList.add('on'));
    type(fields.note, 'Corner table', at, 5100);
    click(submit, at, 5700);
    at(6600, () => {
      submit.classList.add('is-done');
      submit.textContent = 'Sent ✓';
    });
    at(6800, () => thanks.classList.add('is-in'));

    // 2. The request reaches the hotel; staff approve it
    at(6900, () => linkIn.classList.add('is-drawn'));
    at(7100, () => packetIn.classList.add('is-moving'));
    at(7800, () => {
      tablet.classList.add('has-note');
      chips[0].classList.add('is-in');
    });
    click(reserve, at, 8100);
    at(9000, () => {
      reserve.classList.add('is-done');
      reserve.textContent = 'Reserved ✓';
      chips[1].classList.add('is-in');
    });

    // 3. The guest gets a branded confirmation on WhatsApp
    at(9200, () => linkOut.classList.add('is-drawn'));
    at(9400, () => packetOut.classList.add('is-moving'));
    at(10100, () => ticket.classList.add('is-in'));
    at(10900, () => {
      msg.classList.add('is-in');
      chips[2].classList.add('is-in');
    });

    ucEmbed.loop(15000);

    at(15000, () => {
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
