// Calls back whenever an element comes into or leaves the screen, so loops
// only run while someone can see them.
export function onVisibility(
  el: Element,
  callback: (visible: boolean) => void,
  options: IntersectionObserverInit = { threshold: 0.35 },
): IntersectionObserver {
  const observer = new IntersectionObserver(([entry]) => callback(entry.isIntersecting), options);
  observer.observe(el);
  return observer;
}

/** Runs `init` for every element matching `selector`, once each */
export function initAll(selector: string, init: (root: HTMLElement) => void): void {
  document.querySelectorAll<HTMLElement>(selector).forEach((root) => {
    if (root.dataset.ready) return;
    root.dataset.ready = 'true';
    init(root);
  });
}
