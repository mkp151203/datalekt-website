// The sticky header picks up a background once the page has scrolled.
export function initStickyHeader(header: HTMLElement): void {
  const markScrolled = () => header.classList.toggle('is-scrolled', window.scrollY > 8);
  markScrolled();
  window.addEventListener('scroll', markScrolled, { passive: true });
}
