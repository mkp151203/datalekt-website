// Use-case switcher. Each scene sits in its own panel; scenes report through
// DOM events (kit/scene-kit.ts) when a loop starts and ends. Here we crossfade
// between panels, size the stage to the active scene, run the tab's progress
// line, and move on to the next use case when one finishes.
import { onVisibility } from '../../scripts/lib/in-view';
import { prefersReducedMotion } from '../../scripts/lib/motion';

const fadeMs = 450;

export function initUseCaseSwitcher(section: HTMLElement): void {
  const tabs = [...section.querySelectorAll<HTMLElement>('.case-tab')];
  const panels = [...section.querySelectorAll<HTMLElement>('.case-panel')];
  const stage = section.querySelector<HTMLElement>('.case-stage');
  const note = section.querySelector<HTMLElement>('.case-note');
  if (!stage || !tabs.length || tabs.length !== panels.length) return;

  const reduce = prefersReducedMotion();
  const sceneOf = (panel: HTMLElement) => panel.querySelector<HTMLElement>('[data-scene]');

  let current = panels.findIndex((panel) => !panel.hidden);
  if (current < 0) current = 0;
  let inView = false;

  function fitStage() {
    const height = panels[current].offsetHeight;
    if (height) stage!.style.height = `${height}px`;
  }

  // The active scene's height changes with the layout (side by side or stacked)
  const sizes = new ResizeObserver(fitStage);
  panels.forEach((panel) => sizes.observe(panel));

  function startProgress(ms: number) {
    const tab = tabs[current];
    tab.style.setProperty('--dur', `${ms}ms`);
    tab.classList.remove('is-running');
    void tab.offsetWidth; // restart the animation
    tab.classList.add('is-running');
  }

  function select(i: number, focus = false) {
    if (i === current) return;
    const previous = panels[current];
    tabs[current].classList.remove('is-running');
    tabs[current].setAttribute('aria-selected', 'false');
    tabs[current].tabIndex = -1;

    current = i;
    const tab = tabs[i];
    const panel = panels[i];
    tab.setAttribute('aria-selected', 'true');
    tab.tabIndex = 0;
    if (focus) tab.focus();
    if (note) note.textContent = tab.querySelector('.case-desc')?.textContent ?? '';

    // Fade the old scene out, then hide it so it stops playing
    previous.classList.remove('is-on');
    setTimeout(() => {
      if (panels[current] !== previous) previous.hidden = true;
    }, fadeMs);

    panel.hidden = false;
    requestAnimationFrame(() => {
      panel.classList.add('is-on');
      fitStage();
      // Start from the top
      sceneOf(panel)?.dispatchEvent(new CustomEvent('scene:restart'));
    });
  }

  section.addEventListener('scene:loopstart', (event) => {
    if (!panels[current].contains(event.target as Node)) return;
    startProgress((event as CustomEvent<number>).detail);
  });

  section.addEventListener('scene:loopend', (event) => {
    // A scene that was switched away from finishing its loop is ignored.
    // Out of view, the scene restarts itself when it comes back.
    if (!panels[current].contains(event.target as Node)) return;
    if (inView && !reduce) select((current + 1) % panels.length);
  });

  tabs.forEach((tab, i) => {
    tab.addEventListener('click', () => select(i));
    tab.addEventListener('keydown', (event) => {
      const step = ({ ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 } as Record<string, number>)[event.key];
      if (!step) return;
      event.preventDefault();
      select((current + step + tabs.length) % tabs.length, true);
    });
  });

  onVisibility(
    stage,
    (visible) => {
      inView = visible;
      if (!visible) tabs[current].classList.remove('is-running');
    },
    { threshold: 0.2 },
  );

  fitStage();
}
