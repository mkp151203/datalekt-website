// Play reservations on the product stage, one table after another: the table
// is booked, the guest profile links up, the WhatsApp card slides in with the
// confirmation, which is read and answered. Then the stage clears and the
// next table takes its turn.
import { prefersReducedMotion } from '../../scripts/lib/motion';
import { createTimeline } from '../../scripts/lib/timeline';

const steps: [number, string][] = [
  [600, 'show-table'],
  [1200, 'show-link'],
  [1600, 'show-guest'],
  [2300, 'show-wa'],
  [2600, 'show-message'],
  [3300, 'tick-delivered'],
  [4000, 'tick-read'],
  [4400, 'show-typing'],
  [5800, 'show-reply'],
];
const clearAt = 9000; // everything fades out
const loopEvery = 9800; // then the next table starts

interface Booking {
  table: string;
  /** Radius of the highlight ring around the table */
  ring: number;
  /** Covers added to tonight's count */
  guests: number;
  /** Link to the guest card, in stage units: start, bend and end heights */
  link: { sx: number; sy: number; mx: number; ey: number };
  guest: {
    initials: string;
    name: string;
    sub: string;
    status: string;
    room: string;
    table: string;
    bill: string;
    tags: string[];
  };
  message: string;
  reply: string;
}

const bookings: Booking[] = [
  {
    table: 't7',
    ring: 44,
    guests: 4,
    link: { sx: 456, sy: 320, mx: 420, ey: 372 },
    guest: {
      initials: 'AR',
      name: 'Ananya Rao',
      sub: 'Returning guest, 6th visit',
      status: 'In-house',
      room: 'Room 1204, checks out Monday',
      table: 'Table 7, 7:30 pm, 4 guests',
      bill: 'Last visit 12 Oct, ₹14,800',
      tags: ['Window seat', 'No shellfish', 'Anniversary 14 Nov'],
    },
    message:
      'Hi Ananya, your table for 4 on the Terrace is confirmed for 7:30 pm tonight. We’ve kept your usual window seat.',
    reply: 'Lovely, thank you! See you then.',
  },
  {
    table: 't8',
    ring: 38,
    guests: 2,
    link: { sx: 346, sy: 430, mx: 346, ey: 430 },
    guest: {
      initials: 'VS',
      name: 'Vikram Shah',
      sub: 'Returning guest, 3rd visit',
      status: 'In-house',
      room: 'Room 806, checks out Friday',
      table: 'Table 8, 8:15 pm, 2 guests',
      bill: 'Last visit 3 Nov, ₹9,200',
      tags: ['Quiet corner', 'Vegetarian'],
    },
    message:
      'Hi Vikram, your table for 2 on the Terrace is confirmed for 8:15 pm tonight. We’ve saved a quiet corner for you.',
    reply: 'Perfect, see you at 8:15.',
  },
  {
    table: 't3',
    ring: 44,
    guests: 4,
    link: { sx: 396, sy: 200, mx: 330, ey: 372 },
    guest: {
      initials: 'MI',
      name: 'Meera Iyer',
      sub: 'Returning guest, 2nd visit',
      status: 'Arriving',
      room: 'Room 1512, checks out Sunday',
      table: 'Table 3, 9:00 pm, 4 guests',
      bill: 'Last visit 21 Sep, ₹21,450',
      tags: ['Birthday dinner', 'Gluten free', 'Sea view'],
    },
    message:
      'Hi Meera, your table for 4 on the Terrace is confirmed for 9:00 pm tonight. We’ll have a birthday surprise ready.',
    reply: 'That is so thoughtful, thank you!',
  },
];

const baseCovers = 34;

export function initStage(stage: HTMLElement): void {
  if (prefersReducedMotion()) return;
  const covers = stage.querySelector<HTMLElement>('.covers-count');
  if (!covers) return;

  const text = (key: string) => stage.querySelector<HTMLElement>(`[data-g="${key}"]`);
  const ring = stage.querySelector<SVGCircleElement>('.book-ring');
  const ping = stage.querySelector<SVGCircleElement>('.book-ping');
  const tags = text('tags');
  const groups = [...stage.querySelectorAll<SVGGElement>('.bookable')];
  const timeline = createTimeline();
  let turn = 0;

  const setCovers = (value: number, bump: boolean) => {
    covers.textContent = String(value);
    covers.classList.remove('is-bumped');
    if (!bump) return;
    void covers.offsetWidth; // restart the bump animation
    covers.classList.add('is-bumped');
  };

  // Everything the sequence shows for one booking, swapped in while hidden
  function setUp(booking: Booking) {
    const g = booking.guest;
    const set = (key: string, value: string) => {
      const el = text(key);
      if (el) el.textContent = value;
    };
    set('initials', g.initials);
    set('name', g.name);
    set('sub', g.sub);
    set('status', g.status);
    set('room', g.room);
    set('table', g.table);
    set('bill', g.bill);
    set('wa-text', booking.message);
    set('wa-reply', booking.reply);
    if (tags) tags.replaceChildren(...g.tags.map((tag) => Object.assign(document.createElement('span'), { textContent: tag })));

    const table = stage.querySelector<SVGCircleElement>(`[data-table="${booking.table}"] .table`);
    if (table) {
      [ring, ping].forEach((el) => {
        el?.setAttribute('cx', table.getAttribute('cx') ?? '0');
        el?.setAttribute('cy', table.getAttribute('cy') ?? '0');
        el?.setAttribute('r', String(booking.ring));
      });
    }

    // The dashed link from the table to the guest card, wide and phone layouts
    const { sx, sy, mx, ey } = booking.link;
    (['wide', 'narrow'] as const).forEach((layout) => {
      const shift = layout === 'narrow' ? -40 : 0; // the Live Table sits 4em further left
      const d = `M${sx + shift} ${sy} H${mx + shift} V${ey} H304`;
      stage
        .querySelectorAll(`.link-${layout} .link-line, #link-mask-${layout} .link-reveal`)
        .forEach((path) => path.setAttribute('d', d));
      const end = stage.querySelector(`.link-${layout} .link-end`);
      end?.setAttribute('cx', '304');
      end?.setAttribute('cy', String(ey));
    });
  }

  const clear = () => {
    stage.classList.remove(...steps.map(([, step]) => step));
    groups.forEach((group) => group.classList.remove('is-booked'));
    setCovers(baseCovers, false);
  };

  const play = () => {
    timeline.clear();
    clear();
    const booking = bookings[turn % bookings.length];
    setUp(booking);
    steps.forEach(([at, step]) => {
      timeline.at(at, () => {
        stage.classList.add(step);
        if (step === 'show-table') {
          stage.querySelector(`[data-table="${booking.table}"]`)?.classList.add('is-booked');
          setCovers(baseCovers + booking.guests, true);
        }
      });
    });
    timeline.at(clearAt, clear);
    timeline.at(loopEvery, () => {
      turn += 1;
      play();
    });
  };

  stage.classList.add('animated');
  play();
  document.addEventListener('visibilitychange', () => (document.hidden ? timeline.clear() : play()));
}
