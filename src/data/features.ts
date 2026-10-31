// "Where data meets efficiency": the five cards, in order. Each id matches a
// scene in components/features/visuals/ and the card's class (eff-<id>).

export interface Feature {
  id: 'secure' | 'auto' | 'simple' | 'sync' | 'insight';
  title: string;
  text: string;
}

const features: Feature[] = [
  {
    id: 'secure',
    title: 'Smart by nature, secure by design',
    text: 'Every system feeds one guest profile, encrypted and open only to the right staff.',
  },
  {
    id: 'auto',
    title: 'Customisable automations',
    text: 'Timely, personal messages that run on their own and bring guests back.',
  },
  {
    id: 'simple',
    title: 'Simplify your business',
    text: 'Reservations, guests, messages and reports on one easy platform.',
  },
  {
    id: 'sync',
    title: 'Seamless syncing',
    text: 'Your PMS, POS and Datalekt stay in step, so staff always see the same guest.',
  },
  {
    id: 'insight',
    title: 'Real-time insights',
    text: 'See the night as it happens and make faster, smarter calls.',
  },
];

export function getFeatures(): Feature[] {
  return features;
}
