// Lets a use-case page run inside the home page's switcher (index.html,
// assets/js/use-cases.js). Opened on its own, the page behaves as before.
// Opened in an iframe with ?embed, it shows only its scene, reports its
// height, and tells the switcher when each loop starts and ends instead
// of looping by itself.
window.ucEmbed = (() => {
  const embedded = window.parent !== window && new URLSearchParams(location.search).has('embed');
  if (!embedded) return { loop() {}, done: () => false, register() {} };

  // Room around the scene so device shadows aren't clipped by the frame;
  // the switcher lets the iframe overhang its stage by the same amount
  const pad = 24;
  const root = document.documentElement;
  root.classList.add('is-embed');
  const style = document.createElement('style');
  style.textContent = `
    html.is-embed, html.is-embed body { background: transparent; overflow: hidden; }
    html.is-embed .uc { padding: ${pad}px; }
    html.is-embed .uc-head { display: none; }
    html.is-embed .uc-wrap { margin: 0 auto; }
  `;
  document.head.append(style);

  const post = (type, value) => parent.postMessage({ uc: type, value }, location.origin);

  let lastHeight = 0;
  function report() {
    const height = Math.ceil(document.body.getBoundingClientRect().height);
    // A hidden frame has no width; keep the last real height
    if (height > pad * 2 && height !== lastHeight) {
      lastHeight = height;
      post('height', height);
    }
  }
  addEventListener('DOMContentLoaded', () => {
    new ResizeObserver(report).observe(document.body);
    report();
  });

  return {
    // Called as a loop is scheduled, with its length in milliseconds
    loop: (ms) => post('start', ms),
    // Called at the end of a loop; true means the switcher decides what plays next
    done: () => { post('done'); return true; },
    // The switcher restarts the scene through this when its tab is chosen
    register: (restart) => { window.ucRestart = restart; },
  };
})();
