// The one place a demo request leaves the browser. It posts JSON to the
// form's endpoint: PUBLIC_DEMO_FORM_ENDPOINT from .env (a form service such as
// Formspree), written onto the form as data-endpoint at build time. Later it
// can be an Astro API route instead without touching the form. With no
// endpoint, it opens a prefilled email to the team.
import { site } from '../../data/site';

/** Same shape as the original site's /api/schedule-demo request */
export interface DemoRequest {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  property: string;
  availability: string;
  takesReservations: string;
}

export const demoEndpoint: string = import.meta.env.PUBLIC_DEMO_FORM_ENDPOINT ?? '';

/** Resolves 'sent' once delivered, or 'email' when handed to the mail app */
export async function sendDemoRequest(request: DemoRequest, endpoint: string): Promise<'sent' | 'email'> {
  if (!endpoint) {
    window.location.href = demoMailto(request);
    return 'email';
  }
  const response = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify(request),
  });
  if (!response.ok) throw new Error(`Demo request failed: ${response.status}`);
  return 'sent';
}

function demoMailto(r: DemoRequest): string {
  const body = [
    `Name: ${r.firstName} ${r.lastName}`,
    `Email: ${r.email}`,
    `Phone: ${r.phone}`,
    `Hotel/Restaurant: ${r.property}`,
    `Preferred date: ${r.availability}`,
    `Takes reservations: ${r.takesReservations}`,
  ].join('\n');
  const subject = `Demo request: ${r.property}`;
  return `mailto:${site.email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}
