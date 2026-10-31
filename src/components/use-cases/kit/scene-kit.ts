// Connects a use-case scene to the switcher (../switcher.ts) through DOM
// events on the scene's root, so scenes never reach for the switcher and the
// switcher never reaches into a scene:
//   scene:loopstart  (detail: loop length in ms) as a loop is scheduled
//   scene:loopend    when a loop has played out; the switcher picks what's next
//   scene:restart    sent by the switcher to start the scene from the top
export interface SceneConnection {
  /** Announce a loop of `ms` milliseconds; call as the loop is scheduled */
  loop(ms: number): void;
  /** Announce the loop has ended; true means the switcher decides what plays next */
  done(): boolean;
  /** How the switcher restarts the scene when its tab is chosen */
  register(restart: () => void): void;
}

export function connectScene(root: HTMLElement): SceneConnection {
  return {
    loop(ms) {
      root.dispatchEvent(new CustomEvent('scene:loopstart', { detail: ms, bubbles: true }));
    },
    done() {
      root.dispatchEvent(new CustomEvent('scene:loopend', { bubbles: true }));
      return true;
    },
    register(restart) {
      root.addEventListener('scene:restart', restart);
    },
  };
}

/** Schedules `fn` at `ms` into the current loop (each scene's timeline) */
export type At = (ms: number, fn: () => void) => unknown;
