// Environment values read by the site (set them in .env; see .env.example)
interface ImportMetaEnv {
  /** Where the Schedule a demo form posts its JSON (e.g. a Formspree form URL) */
  readonly PUBLIC_DEMO_FORM_ENDPOINT?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
