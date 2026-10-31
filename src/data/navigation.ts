// Header and footer links. Section links start with "/" so they also work
// from the other pages.
import { links, logins } from './site';

export interface NavLink {
  label: string;
  href: string;
}

export const mainNav: NavLink[] = [
  { label: 'Product', href: '/#product' },
  { label: 'Use cases', href: '/#use-cases' },
  { label: 'Features', href: '/#features' },
  { label: 'Clients', href: '/#clients' },
];

export const footerNav: { heading: string; links: NavLink[] }[] = [
  {
    heading: 'Product',
    links: [
      { label: 'How it works', href: '/#product' },
      { label: 'Use cases', href: '/#use-cases' },
      { label: 'Features', href: '/#features' },
    ],
  },
  {
    heading: 'Company',
    links: [
      { label: 'Clients', href: '/#clients' },
      { label: 'Locations', href: '/#locations' },
      { label: 'Schedule a demo', href: links.demo },
    ],
  },
  {
    heading: 'Log in',
    links: logins.map(({ label, href }) => ({ label, href })),
  },
];
