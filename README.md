# Datalekt website

Marketing site for Datalekt (guest data, reservations and messaging for hotel restaurants). Built with
[Astro](https://astro.build) as a static site: every page is pre-built to plain HTML, CSS and JavaScript in `dist/`,
which any web host can serve.

## Commands

| Command               | What it does                                                                                  |
| --------------------- | --------------------------------------------------------------------------------------------- |
| `npm install`         | Install dependencies (Node 22.23 or newer)                                                    |
| `npm run dev`         | Dev server on port 4173, also reachable from a phone on the same Wi-Fi                        |
| `npm run build`       | Build the site into `dist/`                                                                   |
| `npm run preview`     | Serve the built `dist/` on port 4173                                                          |
| `npm run check`       | Type-check the code                                                                           |
| `npm test`            | Build, then run the smoke tests (Playwright, using the installed Google Chrome)               |
| `npm run reference`   | Serve the archived prototype on port 4174                                                     |
| `npm run test:parity` | Compare every home-page section with the prototype (needs `npm run reference`)                |
| `npm run map`         | Rebuild the India map data (`src/data/india-map.json`; needs Python 3 with Pillow)            |
| `npm run og`          | Re-render `public/og.png`, the picture shown when the site is shared (needs the site running) |
| `npm run format`      | Format the code with Prettier                                                                 |

On a phone, open `http://<this computer's IP>:4173` while `npm run dev` is running.

## Where things live

```
src/
  pages/          one file per page: index, schedule-demo, privacy-policy, 404
  layouts/        BaseLayout (head, header, footer) and PageLayout (text pages)
  components/     one folder per section, each with its markup (.astro), styles (.css) and script (.ts)
    site/           header, footer, menus
    hero/           hero and the product stage
    partners/       "Trusted by finest hotels" photo showcase
    product/        "We're all about making things efficient" booking flow
    use-cases/      the six use cases: switcher.ts, kit/, and scenes/<name>/ for each animation
    features/       "Where data meets efficiency" cards; visuals/ holds each card's scene
    growth/         "Empowering growth" India map
    cta/            closing call to action
    demo/           Schedule a demo form
  data/           the content: site facts and links, navigation, partners, cities, use cases, features, map data
  content/        long text as Markdown (privacy policy)
  scripts/        shared scripts: dot-wave.ts (dot ripple) and lib/ helpers
  styles/         design tokens, fonts, base styles, buttons
  assets/images/  photos, optimised to WebP at build time
public/           files served as they are: fonts, brand marks, favicon, robots.txt, og.png
tools/            map builder, share-image renderer, parity comparison
tests/            Playwright smoke and parity tests
archive/          the original hand-built prototype and early experiments (not published)
```

Each section's script exports an `init(root)` function and only touches elements inside its own section. Loops run
only while a section is on screen, and every animation has a reduced-motion fallback.

## Common changes

**Add a partner hotel.** Put its photo in `src/assets/images/partners/`, import it at the top of
`src/data/partners.ts` and add an entry to the list. The showcase, the map's city list and the counts all update. For
a new city, add it to `src/data/cities.ts` too (with its latitude, longitude and state).

**Edit text.** Use-case tabs: `src/data/use-cases.ts`. Feature cards: `src/data/features.ts`. Navigation, footer and
log-in links: `src/data/navigation.ts` and `src/data/site.ts`. Privacy policy: `src/content/legal/privacy-policy.md`.
Headings and other section copy are in the section's `.astro` file.

**Change a use-case animation.** Each lives in `src/components/use-cases/scenes/<name>/`: `Scene.astro` (markup),
`scene.css` and `scene.ts` (the timeline). A scene reports when each loop starts and ends through `kit/scene-kit.ts`,
and the switcher moves on when a loop ends. To add a use case, copy a scene folder, register it in `UseCases.astro`,
and add its tab to `src/data/use-cases.ts`.

**Schedule a demo form.** Copy `.env.example` to `.env` and set `PUBLIC_DEMO_FORM_ENDPOINT` to the URL of a form
service (for example a Formspree form). The form posts JSON with `firstName`, `lastName`, `email`, `phone`,
`property`, `availability` and `takesReservations`. Until it is set, submitting opens a prefilled email to
admin@datalekt.com instead.

**India map.** `npm run map` downloads the boundary data and rebuilds `src/data/india-map.json`. It uses official
boundaries (all of Jammu & Kashmir, Ladakh and Arunachal Pradesh); keep it that way.

## Adding server features later

The site is static today, but it is set up so a backend can be added without rewriting it:

- Components read content through small functions in `src/data/` (`getPartners()`, `getUseCases()`, …). Pointing
  those at a CMS or a database changes only `src/data/`.
- The demo form sends through one function, `src/components/demo/send-demo-request.ts`. It can post to an Astro API
  route (`src/pages/api/schedule-demo.ts`) instead of a form service.
- To run server code, add the adapter for your host (Node, Vercel, Netlify or Cloudflare) in `astro.config.mjs` and
  mark only the dynamic routes with `export const prerender = false`. The marketing pages stay pre-built.

## Deploying

Run `npm run build` and upload `dist/` to any static host, or connect the repository to a host that runs the build.
The site address is set in `astro.config.mjs` (`site`), which is used for canonical links, social cards and the
sitemap.

## Notes

- Fonts: Dancing Script (the accent words in headings) and Bodoni Moda (hotel-brand lettering in the use-case scenes) are under the SIL Open Font License (`public/fonts/*-OFL.txt`). Neue Montreal was
  copied from the previous site; its commercial licence has not been confirmed.
- Map data: [india-official-geojson](https://github.com/AbhinavSwami28/india-official-geojson) (MIT), with Andhra
  Pradesh and Telangana from [DataMeet](http://projects.datameet.org/maps/) via geoBoundaries (CC BY 2.5 IN).
- Pullman is counted among the partner hotels but has no city yet, so it is not on the map.
