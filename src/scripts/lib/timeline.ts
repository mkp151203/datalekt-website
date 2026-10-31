// A set of timers that can be cleared together: the `at(ms, fn)` pattern
// every looping scene uses to script its steps.
export interface Timeline {
  at(ms: number, fn: () => void): void;
  clear(): void;
  readonly size: number;
}

export function createTimeline(): Timeline {
  let timers: number[] = [];
  return {
    at(ms, fn) {
      timers.push(window.setTimeout(fn, ms));
    },
    clear() {
      timers.forEach(clearTimeout);
      timers = [];
    },
    get size() {
      return timers.length;
    },
  };
}
