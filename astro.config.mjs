// @ts-check
import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';
import browserslist from 'browserslist';
import { browserslistToTargets } from 'lightningcss';

export default defineConfig({
  site: 'https://datalekt.com',
  // Astro 7 strips whitespace by JSX rules by default; this markup is written
  // as HTML and relies on the single space kept between inline elements
  compressHTML: true,
  integrations: [sitemap()],
  // The dev toolbar would sit over the page in dev screenshots and phone checks
  devToolbar: { enabled: false },
  // Reachable from a phone on the same Wi-Fi
  server: { host: '0.0.0.0', port: 4173 },
  vite: {
    css: {
      // Lightning CSS lowers nesting (used to namespace the use-case scenes)
      // for the browsers below
      transformer: 'lightningcss',
      lightningcss: {
        targets: browserslistToTargets(browserslist('>= 0.25%, last 2 versions, not dead')),
      },
    },
  },
});
