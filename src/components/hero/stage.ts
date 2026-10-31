// Play the reservation on the product stage: table 7 is booked, the guest
// profile links up, then the WhatsApp confirmation is sent, read and answered.
import { prefersReducedMotion } from '../../scripts/lib/motion';
import { createTimeline } from '../../scripts/lib/timeline';

const steps: [number, string][] = [
  [700, 'show-table'],
  [1500, 'show-link'],
  [2000, 'show-guest'],
  [3000, 'show-message'],
  [3800, 'tick-delivered'],
  [4800, 'tick-read'],
  [5400, 'show-typing'],
  [7200, 'show-reply'],
];
const loopEvery = 15000;

export function initStage(stage: HTMLElement): void {
  if (prefersReducedMotion()) return;
  const covers = stage.querySelector<HTMLElement>('.covers-count');
  if (!covers) return;

  const timeline = createTimeline();

  const setCovers = (value: string) => {
    covers.textContent = value;
    covers.classList.remove('is-bumped');
    void covers.offsetWidth; // restart the bump animation
    covers.classList.add('is-bumped');
  };

  const play = () => {
    timeline.clear();
    stage.classList.remove(...steps.map(([, step]) => step));
    covers.classList.remove('is-bumped');
    covers.textContent = '34';
    steps.forEach(([at, step]) => {
      timeline.at(at, () => {
        stage.classList.add(step);
        if (step === 'show-table') setCovers('38');
      });
    });
    timeline.at(loopEvery, play);
  };

  stage.classList.add('animated');
  play();
  document.addEventListener('visibilitychange', () => (document.hidden ? timeline.clear() : play()));
}
