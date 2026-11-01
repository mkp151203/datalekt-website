// Schedule a demo form: checks each field with the same rules and messages
// as the original site, shows errors beside the fields, then sends through
// send-demo-request.ts and shows the result.
import { sendDemoRequest, type DemoRequest } from './send-demo-request';
import { site } from '../../data/site';

type Field = keyof DemoRequest;

const checks: Record<Field, (value: string) => string> = {
  firstName: (v) => (v ? '' : 'First name is required'),
  lastName: (v) => (v ? '' : 'Last name is required'),
  email: (v) => (!v ? 'Email is required' : /\S+@\S+\.\S+/.test(v) ? '' : 'Please enter a valid email'),
  phone: (v) => (v ? '' : 'Phone number is required'),
  property: (v) => (v ? '' : 'Property name is required'),
  availability: (v) => (v ? '' : 'Please select a date'),
  takesReservations: (v) => (v ? '' : 'Please select an option'),
};

export function initDemoForm(form: HTMLFormElement): void {
  const status = form.querySelector<HTMLElement>('.demo-status');
  const submit = form.querySelector<HTMLButtonElement>('button[type="submit"]');
  const success = form.parentElement?.querySelector<HTMLElement>('.demo-success');

  // Only today or later can be picked
  const date = form.querySelector<HTMLInputElement>('input[name="availability"]');
  if (date) {
    const today = new Date();
    today.setMinutes(today.getMinutes() - today.getTimezoneOffset());
    date.min = today.toISOString().slice(0, 10);
  }

  form.noValidate = true;

  const read = (): DemoRequest => {
    const data = new FormData(form);
    const value = (name: Field) => String(data.get(name) ?? '').trim();
    return {
      firstName: value('firstName'),
      lastName: value('lastName'),
      email: value('email'),
      phone: value('phone'),
      property: value('property'),
      availability: value('availability'),
      takesReservations: value('takesReservations'),
    };
  };

  function showError(name: Field, message: string) {
    const error = form.querySelector<HTMLElement>(`[data-error="${name}"]`);
    const inputs = form.querySelectorAll<HTMLInputElement>(`[name="${name}"]`);
    if (error) error.textContent = message;
    inputs.forEach((input) => input.setAttribute('aria-invalid', String(Boolean(message))));
  }

  // Re-check a field as soon as it is corrected
  form.addEventListener('input', (event) => {
    const name = (event.target as HTMLInputElement).name as Field;
    if (!(name in checks)) return;
    const field = form.querySelector(`[data-error="${name}"]`);
    if (field?.textContent) showError(name, checks[name](read()[name]));
  });

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    const request = read();
    let firstInvalid: Field | null = null;
    for (const name of Object.keys(checks) as Field[]) {
      const message = checks[name](request[name]);
      showError(name, message);
      if (message && !firstInvalid) firstInvalid = name;
    }
    if (firstInvalid) {
      if (status) status.textContent = 'Please fill in all required fields.';
      form.querySelector<HTMLInputElement>(`[name="${firstInvalid}"]`)?.focus();
      return;
    }

    if (status) status.textContent = 'Sending your demo request…';
    if (submit) submit.disabled = true;
    try {
      const result = await sendDemoRequest(request, form.dataset.endpoint ?? '');
      if (result === 'email') {
        if (status) status.textContent = `Your email app should open with your request to ${site.email}.`;
        if (submit) submit.disabled = false;
        return;
      }
      form.hidden = true;
      if (success) {
        const name = success.querySelector('[data-name]');
        if (name) name.textContent = request.firstName;
        success.hidden = false;
        success.focus();
      }
    } catch {
      if (status)
        status.textContent = `Something went wrong. Please try again, or email us at ${site.email}.`;
      if (submit) submit.disabled = false;
    }
  });
}
