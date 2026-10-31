// Use cases, in tab order. `scene` names the folder in
// components/use-cases/scenes/ that holds its animation.

export interface UseCase {
  scene: 'pos' | 'table-view' | 'booking-portal' | 'messaging' | 'outlet-page' | 'guest-database';
  name: string;
  description: string;
}

const useCases: UseCase[] = [
  {
    scene: 'pos',
    name: 'POS & PMS integration',
    description: 'A booking opens the table on your POS, and the bill flows back to the guest’s profile.',
  },
  {
    scene: 'table-view',
    name: 'Live table view',
    description: 'Every table on one floor plan. Tick a guest in and see who’s returning before they sit.',
  },
  {
    scene: 'booking-portal',
    name: 'Booking portal',
    description: 'Guests book on your own website. Approve in one click and they’re confirmed on WhatsApp.',
  },
  {
    scene: 'messaging',
    name: 'WhatsApp messaging',
    description: 'Pick an audience and a template. Every guest gets it on WhatsApp, by name.',
  },
  {
    scene: 'outlet-page',
    name: 'Outlet web page',
    description: 'Publish offers and menus for every outlet. Guests see them straight away.',
  },
  {
    scene: 'guest-database',
    name: 'Guest database',
    description: 'Every visit builds one profile. Filter by date, rating or outlet to find the right guests.',
  },
];

export function getUseCases(): UseCase[] {
  return useCases;
}
