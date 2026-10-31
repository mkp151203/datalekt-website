// Where data meets efficiency: each card's scene runs only while the card
// is on screen (.is-live pauses and resumes its CSS loops). The automation
// steps, the tidy-up and tonight's covers are stepped from here.
import { onVisibility } from '../../scripts/lib/in-view';
import { prefersReducedMotion } from '../../scripts/lib/motion';
import { createTimeline, type Timeline } from '../../scripts/lib/timeline';

// Each driver schedules one loop on the card and returns its length in ms
type Driver = (card: HTMLElement, at: Timeline['at']) => number;

const drivers: Record<string, Driver> = {
  'eff-auto'(card, at) {
    const steps = [...card.querySelectorAll('.auto-step')];
    steps.forEach((_, i) =>
      at(400 + i * 1300, () => {
        steps.forEach((s, j) => {
          s.classList.toggle('is-done', j < i);
          s.classList.toggle('is-now', j === i);
        });
      }),
    );
    at(400 + steps.length * 1300, () => steps[steps.length - 1].classList.replace('is-now', 'is-done'));
    at(400 + steps.length * 1300 + 1800, () => steps.forEach((s) => s.classList.remove('is-done', 'is-now')));
    return 400 + steps.length * 1300 + 2400;
  },

  'eff-simple'(card, at) {
    const vis = card.querySelector('.eff-vis');
    at(1400, () => vis?.classList.add('is-tidy'));
    at(5200, () => vis?.classList.remove('is-tidy'));
    return 6200;
  },

  'eff-insight'(card, at) {
    const bars = card.querySelector('.ins-bars');
    const count = card.querySelector<HTMLElement>('.ins-count');
    if (!bars || !count) return 6500;
    const to = Number(count.dataset.to);
    bars.classList.add('is-down');
    count.textContent = '0';
    at(300, () => {
      bars.classList.remove('is-down');
      const start = performance.now();
      const tick = (now: number) => {
        const t = Math.min((now - start) / 1400, 1);
        count.textContent = String(Math.round(to * (1 - (1 - t) ** 3)));
        if (t < 1 && card.classList.contains('is-live')) requestAnimationFrame(tick);
        else count.textContent = String(to);
      };
      requestAnimationFrame(tick);
    });
    return 6500;
  },
};

export function initFeatures(section: HTMLElement): void {
  const reduce = prefersReducedMotion();

  section.querySelectorAll<HTMLElement>('.eff-card').forEach((card) => {
    const name = Object.keys(drivers).find((key) => card.classList.contains(key));

    if (reduce) {
      // Show each scene in its finished state
      card.querySelectorAll('.auto-step').forEach((s) => s.classList.add('is-done'));
      if (name === 'eff-simple') card.querySelector('.eff-vis')?.classList.add('is-tidy');
      return;
    }

    const timeline = createTimeline();
    function run() {
      timeline.clear();
      const length = drivers[name!](card, timeline.at);
      timeline.at(length, run);
    }

    onVisibility(
      card,
      (visible) => {
        card.classList.toggle('is-live', visible);
        if (!name) return;
        if (visible) run();
        else timeline.clear();
      },
      { threshold: 0.25 },
    );
  });
}
