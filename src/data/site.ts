// Site-wide facts: name, address, contact and the links shared by the
// header, footer and calls to action.

export const site = {
  name: 'Datalekt',
  url: 'https://datalekt.com',
  title: 'Datalekt · Guest data for hotel restaurants and bars',
  description:
    'Reservations, guest history and WhatsApp messaging in one guest record, synced with Oracle Opera and Infrasys.',
  tagline: 'Guest data, reservations and messaging for hotel restaurants.',
  email: 'admin@datalekt.com',
  since: 2021,
} as const;

export const links = {
  demo: '/schedule-demo',
  privacy: '/privacy-policy',
} as const;

export interface LoginLink {
  label: string;
  href: string;
  description: string;
}

export const logins: LoginLink[] = [
  {
    label: 'Staff',
    href: 'https://heaven.datalekt.com/staff',
    description: 'Reservations, Live Table and guest lookup',
  },
  { label: 'Admin', href: 'https://heaven.datalekt.com/admin', description: 'Outlets, users and automations' },
  { label: 'Developers', href: 'https://bang.datalekt.com/', description: 'API and integration docs' },
];
