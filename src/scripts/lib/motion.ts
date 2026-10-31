// Whether the visitor asked for reduced motion. Scenes show their finished
// state instead of animating.
export const prefersReducedMotion = (): boolean =>
  window.matchMedia('(prefers-reduced-motion: reduce)').matches;
