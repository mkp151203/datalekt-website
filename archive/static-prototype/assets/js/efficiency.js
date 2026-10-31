// Where data meets efficiency: each card's scene runs only while the card
// is on screen (.is-live pauses and resumes its CSS loops). The automation
// steps, the tidy-up and tonight's covers are stepped from here.
(() => {
  const section = document.querySelector('.eff');
  if (!section) return;

  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;

  // Each driver gets a scheduler and returns nothing; it loops by itself
  const drivers = {
    'eff-auto'(card, at) {
      const steps = [...card.querySelectorAll('.auto-step')];
      steps.forEach((step, i) => at(400 + i * 1300, () => {
        steps.forEach((s, j) => {
          s.classList.toggle('is-done', j < i);
          s.classList.toggle('is-now', j === i);
        });
      }));
      at(400 + steps.length * 1300, () => steps[steps.length - 1].classList.replace('is-now', 'is-done'));
      at(400 + steps.length * 1300 + 1800, () => steps.forEach((s) => s.classList.remove('is-done', 'is-now')));
      return 400 + steps.length * 1300 + 2400;
    },

    'eff-simple'(card, at) {
      const vis = card.querySelector('.eff-vis');
      at(1400, () => vis.classList.add('is-tidy'));
      at(5200, () => vis.classList.remove('is-tidy'));
      return 6200;
    },

    'eff-insight'(card, at) {
      const bars = card.querySelector('.ins-bars');
      const count = card.querySelector('.ins-count');
      const to = Number(count.dataset.to);
      bars.classList.add('is-down');
      count.textContent = '0';
      at(300, () => {
        bars.classList.remove('is-down');
        const start = performance.now();
        const tick = (now) => {
          const t = Math.min((now - start) / 1400, 1);
          count.textContent = Math.round(to * (1 - (1 - t) ** 3));
          if (t < 1 && card.classList.contains('is-live')) requestAnimationFrame(tick);
          else count.textContent = to;
        };
        requestAnimationFrame(tick);
      });
      return 6500;
    },
  };

  section.querySelectorAll('.eff-card').forEach((card) => {
    const name = Object.keys(drivers).find((key) => card.classList.contains(key));

    if (reduce) {
      // Show each scene in its finished state
      card.querySelectorAll('.auto-step').forEach((s) => s.classList.add('is-done'));
      if (name === 'eff-simple') card.querySelector('.eff-vis').classList.add('is-tidy');
      return;
    }

    let timers = [];
    const at = (ms, fn) => timers.push(setTimeout(fn, ms));
    function run() {
      timers.forEach(clearTimeout);
      timers = [];
      const length = drivers[name](card, at);
      at(length, run);
    }

    new IntersectionObserver(([entry]) => {
      card.classList.toggle('is-live', entry.isIntersecting);
      if (!name) return;
      if (entry.isIntersecting) run();
      else { timers.forEach(clearTimeout); timers = []; }
    }, { threshold: 0.25 }).observe(card);
  });
})();
