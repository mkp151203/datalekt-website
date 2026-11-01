// The sticky header picks up a background once the page has scrolled.
export function initStickyHeader(header: HTMLElement): void {
  const markScrolled = () => header.classList.toggle('is-scrolled', window.scrollY > 8);
  markScrolled();
  window.addEventListener('scroll', markScrolled, { passive: true });
}

// While the hero's own "Schedule a demo" is on screen, the header's copy
// steps aside so the page never shows two at once.
export function initNavCtaHandoff(header: HTMLElement): void {
  const heroCta = document.querySelector('.hero-actions .button');
  const navCta = header.querySelector<HTMLElement>('.nav-cta');
  if (!heroCta || !navCta) return;
  new IntersectionObserver(
    ([entry]) => navCta.classList.toggle('is-away', entry.isIntersecting),
    { rootMargin: '-64px 0px 0px 0px' },
  ).observe(heroCta);
}

// Marks the nav link of the section in view (the one crossing the line a
// little below the header) so visitors can see where they are.
export function initActiveSection(header: HTMLElement): void {
  const links = [...header.querySelectorAll<HTMLAnchorElement>('.nav-links a, .nav-mobile-panel a:not(.button)')];
  const targets = links
    .map((link) => {
      const hash = link.hash;
      const section = hash && link.pathname === location.pathname ? document.querySelector(hash) : null;
      return section ? { link, section } : null;
    })
    .filter((t): t is { link: HTMLAnchorElement; section: Element } => !!t);
  if (!targets.length) return;

  const update = () => {
    const line = window.innerHeight * 0.35;
    let current: Element | null = null;
    for (const { section } of targets) {
      const r = section.getBoundingClientRect();
      if (r.top <= line && r.bottom > line) current = section;
    }
    links.forEach((link) => {
      const on = !!current && link.hash === `#${current.id}`;
      link.classList.toggle('is-current', on);
      if (on) link.setAttribute('aria-current', 'location');
      else link.removeAttribute('aria-current');
    });
  };
  update();
  window.addEventListener('scroll', update, { passive: true });
  window.addEventListener('resize', update);
}
