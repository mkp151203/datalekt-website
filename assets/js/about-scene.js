// About section: one booking, every system. The guest taps Book on their
// phone; the hotel's Live Table is notified, the front desk gets the guest's
// profile, and WhatsApp confirms back to the same phone. Loops while on
// screen. Also loops the headline word: efficient, epic, effortless.
(() => {
  const wrap = document.querySelector('.scene-wrap');
  const scene = wrap.querySelector('.scene');
  const canvas = scene.querySelector('.ripple');
  const ctx = canvas.getContext('2d');
  const phone = scene.querySelector('.phone');
  const book = scene.querySelector('.book-btn');
  const bookLabel = book.querySelector('span');
  const tap = scene.querySelector('.tap');
  const notify = scene.querySelector('.notify');
  const t7 = scene.querySelector('.t7');
  const covers = scene.querySelector('.covers');
  const tablet = scene.querySelector('.tablet');
  const links = [...scene.querySelectorAll('.links path')];
  const packets = [...scene.querySelectorAll('.packet')];

  // Headline word loop: efficient → epic → effortless, letter by letter
  const cycle = document.querySelector('.cycle');
  const words = ['efficient.', 'epic.', 'effortless.'];
  let wordIndex = 0;

  function spell(text) {
    const word = document.createElement('span');
    word.className = 'word';
    [...text].forEach((ch, i) => {
      const s = document.createElement('span');
      s.className = 'ch';
      s.style.setProperty('--i', i);
      s.textContent = ch;
      word.append(s);
    });
    return word;
  }

  if (!matchMedia('(prefers-reduced-motion: reduce)').matches) {
    cycle.replaceChildren(spell(words[0]));
    // Each swap schedules the next once its word is in, so background-tab
    // timer throttling can't run two swaps over each other
    const swap = () => {
      wordIndex = (wordIndex + 1) % words.length;
      const old = cycle.querySelector('.word:not(.is-leaving)');
      if (old) {
        old.classList.add('is-leaving');
        setTimeout(() => old.remove(), 900);
      }
      setTimeout(() => {
        cycle.append(spell(words[wordIndex]));
        setTimeout(swap, 2540);
      }, 260);
    };
    setTimeout(swap, 2800);
  }
  const chip = (name) => scene.querySelector(`.chip-${name}`);
  const chips = [...scene.querySelectorAll('.chip')];
  const messages = [...scene.querySelectorAll('.msg')];
  const tick = scene.querySelector('.ticks');
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;

  let W = 1100, H = 640;
  let stacked = null;
  const origin = { x: 565, y: 440 };
  const spacing = 20;
  let dots = [];

  // Side by side when there is room, a pyramid on phones
  function layout() {
    const stack = wrap.clientWidth < 760;
    if (stack !== stacked) {
      stacked = stack;
      scene.classList.toggle('is-stack', stack);
      W = stack ? 720 : 1100;
      H = stack ? 860 : 640;
      wrap.style.setProperty('--h', `${H}px`);
      const ratio = Math.min(devicePixelRatio || 1, 2);
      canvas.width = W * ratio;
      canvas.height = H * ratio;
      ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
      dots = [];
      for (let y = 10, row = 0; y < H; y += spacing, row++) {
        for (let x = row % 2 ? spacing / 2 : 0; x < W; x += spacing) dots.push({ x, y });
      }
    }
    wrap.style.setProperty('--s', Math.min(1, wrap.clientWidth / W).toFixed(4));
  }

  const activeLinks = () => [...scene.querySelectorAll(stacked ? '.links-stack path' : '.links-wide path')];
  const activePackets = () => [...scene.querySelectorAll(stacked ? '.packet-stack' : '.packet-wide')];

  layout();
  new ResizeObserver(layout).observe(wrap);

  let rippleStart = -1;
  let frame = 0;
  let timers = [];
  let visible = false;

  function drawRipple(now) {
    ctx.clearRect(0, 0, W, H);
    const t = (now - rippleStart) / 1000;
    if (rippleStart < 0 || t > 2.8) return false;
    const radius = t * 460;
    const band = 70;
    const fade = Math.max(0, 1 - t / 2.8);
    for (const d of dots) {
      const dist = Math.hypot(d.x - origin.x, d.y - origin.y);
      let e = 0;
      const c = Math.abs(dist - radius);
      if (c < band) e += (Math.cos((c / band) * Math.PI) + 1) / 2;
      const tr = Math.abs(dist - (radius - band * 1.4));
      if (radius > band * 1.4 && tr < band * 0.8) e += ((Math.cos((tr / (band * 0.8)) * Math.PI) + 1) / 2) * 0.45;
      e *= fade;
      if (e < 0.03) continue;
      ctx.beginPath();
      ctx.arc(d.x, d.y, 1.2 + e * 3, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(17, 107, 174, ${Math.min(e, 1) * 0.55})`;
      ctx.fill();
    }
    return true;
  }

  function loop(now) {
    frame = drawRipple(now) ? requestAnimationFrame(loop) : 0;
  }

  // Where the Book button sits in scene coordinates (the scene is scaled)
  function locateButton() {
    const s = scene.getBoundingClientRect();
    const b = book.getBoundingClientRect();
    const k = s.width / W;
    origin.x = (b.left + b.width / 2 - s.left) / k;
    origin.y = (b.top + b.height / 2 - s.top) / k;
    scene.style.setProperty('--tx', `${origin.x}px`);
    scene.style.setProperty('--ty', `${origin.y}px`);
  }

  function reset() {
    timers.forEach(clearTimeout);
    timers = [];
    phone.classList.remove('is-chat');
    book.classList.remove('is-pressed', 'is-booked');
    bookLabel.textContent = 'Book';
    tap.classList.remove('is-down');
    [notify, ...chips, ...messages].forEach((el) => el.classList.remove('is-in'));
    t7.classList.remove('is-booked');
    covers.textContent = '34';
    tablet.classList.remove('is-live');
    links.forEach((l) => l.classList.remove('is-drawn'));
    packets.forEach((p) => p.classList.remove('is-moving'));
    tick.classList.remove('is-read');
  }

  function play() {
    reset();
    const links = activeLinks();
    const packets = activePackets();
    locateButton();
    const at = (ms, fn) => timers.push(setTimeout(fn, ms));
    const t0 = 900;

    // 1. The guest taps Book
    at(t0 - 250, () => tap.classList.add('is-down'));
    at(t0, () => {
      book.classList.add('is-pressed');
      setTimeout(() => {
        book.classList.remove('is-pressed');
        book.classList.add('is-booked');
        bookLabel.textContent = 'Booked';
        tap.classList.remove('is-down');
        rippleStart = performance.now();
        if (!frame && !reduce) frame = requestAnimationFrame(loop);
      }, 150);
    });

    // 2. The hotel is notified and the table reserved
    at(t0 + 300, () => links[0].classList.add('is-drawn'));
    at(t0 + 500, () => packets[0].classList.add('is-moving'));
    at(t0 + 1000, () => { notify.classList.add('is-in'); chip('notified').classList.add('is-in'); });
    at(t0 + 1400, () => {
      t7.classList.add('is-booked');
      covers.textContent = '38';
      chip('table').classList.add('is-in');
    });

    // 3. The front desk gets the guest's profile
    at(t0 + 600, () => links[1].classList.add('is-drawn'));
    at(t0 + 800, () => packets[1].classList.add('is-moving'));
    at(t0 + 1500, () => { tablet.classList.add('is-live'); chip('profile').classList.add('is-in'); });

    // 4. WhatsApp confirms back to the guest, automatically
    at(t0 + 2100, () => links[2].classList.add('is-drawn'));
    at(t0 + 2300, () => packets[2].classList.add('is-moving'));
    at(t0 + 2800, () => phone.classList.add('is-chat'));
    at(t0 + 3300, () => { messages[0].classList.add('is-in'); chip('whatsapp').classList.add('is-in'); });
    at(t0 + 4100, () => messages[1].classList.add('is-in'));
    at(t0 + 4500, () => tick.classList.add('is-read'));
    at(t0 + 5200, () => { messages[2].classList.add('is-in'); chip('reminder').classList.add('is-in'); });

    at(t0 + 9500, () => {
      if (visible && !reduce) play();
      else idle = true;
    });
  }

  book.addEventListener('click', play);

  // Starts on first view; if a loop ended off screen, resumes on return
  let idle = true;
  new IntersectionObserver(([e]) => {
    visible = e.isIntersecting;
    if (visible && idle) { idle = false; play(); }
  }, { threshold: 0.35 }).observe(wrap);
})();
