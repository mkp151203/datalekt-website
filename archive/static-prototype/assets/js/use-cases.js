// Use-case switcher. Each scene is its own page in use-cases/, loaded in an
// iframe with ?embed; use-cases/uc-embed.js in that page reports its height
// and when each loop starts and ends. Here we fade between scenes, run the
// tab's progress line, and move on to the next use case when one finishes.
(() => {
  const section = document.querySelector('.cases');
  if (!section) return;

  const tabs = [...section.querySelectorAll('.case-tab')];
  const frames = [...section.querySelectorAll('.case-frame')];
  const stage = section.querySelector('.case-stage');
  const note = section.querySelector('.case-note');
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const fadeMs = 450;

  let current = 0;
  let inView = false;

  function load(i) {
    const frame = frames[i];
    if (frame && !frame.getAttribute('src')) frame.src = frame.dataset.src;
  }

  function fitStage() {
    const height = frames[current].dataset.height;
    if (height) stage.style.height = `${height}px`;
  }

  function startProgress(ms) {
    const tab = tabs[current];
    tab.style.setProperty('--dur', `${ms}ms`);
    tab.classList.remove('is-running');
    void tab.offsetWidth; // restart the animation
    tab.classList.add('is-running');
  }

  function select(i, focus = false) {
    if (i === current) return;
    const previous = frames[current];
    tabs[current].classList.remove('is-running');
    tabs[current].setAttribute('aria-selected', 'false');
    tabs[current].tabIndex = -1;

    current = i;
    const tab = tabs[i];
    const frame = frames[i];
    tab.setAttribute('aria-selected', 'true');
    tab.tabIndex = 0;
    if (focus) tab.focus();
    stage.setAttribute('aria-labelledby', tab.id);
    note.textContent = tab.querySelector('.case-desc').textContent;

    // Fade the old scene out, then take it out of layout so it stops drawing
    previous.classList.remove('is-on');
    setTimeout(() => { if (frames[current] !== previous) previous.hidden = true; }, fadeMs);

    load(i);
    frame.hidden = false;
    requestAnimationFrame(() => {
      frame.classList.add('is-on');
      fitStage();
      // Start from the top; a frame that hasn't loaded yet starts by itself
      frame.contentWindow?.ucRestart?.();
    });
    load((i + 1) % frames.length);
  }

  window.addEventListener('message', (event) => {
    if (event.origin !== location.origin || !event.data?.uc) return;
    const i = frames.findIndex((f) => f.contentWindow === event.source);
    if (i < 0) return;
    const { uc: type, value } = event.data;

    if (type === 'height') {
      frames[i].dataset.height = value;
      if (i === current) fitStage();
    } else if (i !== current) {
      // A scene that was switched away from finishing its loop
    } else if (type === 'start') {
      startProgress(value);
    } else if (type === 'done') {
      // Out of view, the scene restarts itself when it comes back
      if (inView && !reduce) select((current + 1) % frames.length);
    }
  });

  tabs.forEach((tab, i) => {
    tab.addEventListener('click', () => select(i));
    tab.addEventListener('keydown', (event) => {
      const step = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 }[event.key];
      if (!step) return;
      event.preventDefault();
      select((current + step + tabs.length) % tabs.length, true);
    });
  });

  frames[current].classList.add('is-on');

  // Load the first scene shortly before the section scrolls into view
  new IntersectionObserver(([entry]) => {
    if (entry.isIntersecting) load(current);
  }, { rootMargin: '600px 0px' }).observe(section);

  new IntersectionObserver(([entry]) => {
    inView = entry.isIntersecting;
    if (!inView) tabs[current].classList.remove('is-running');
  }, { threshold: 0.2 }).observe(stage);
})();
