# Development guide

This document explains how to work on the app's code: setup, developing against the server, tests, deployment and
the most common changes.

## Setup

Requires Node 22 or later (`"engines": { "node": ">=22" }` in `package.json`).

```bash
npm ci
```

```bash
npm run dev
```

The app runs at `http://127.0.0.1:5173`.

To develop against the real server, start `mammo-triage http` locally, with `MAMMO_ALLOWED_ORIGINS` including
`http://127.0.0.1:5173`. Then, in Settings, enter the URL `http://127.0.0.1:8765/mcp` and the key from your `.env`.

`.env.example` documents `VITE_DEFAULT_SERVER_URL`, the default server address shown in Settings. The access key is
never configured there.

## Definition of Done

```bash
npm run typecheck
```

```bash
npm run lint
```

```bash
npm test
```

ESLint includes the `jsx-a11y` accessibility rules, the React Hooks rules and the layer rules.

## Tests

53 tests in 8 files:

| File | What it covers |
|---|---|
| `domain/triage.test.ts` | Ordering by urgency, partial result and warnings |
| `application/analyzeMammogram.test.ts` | Validation, steps, error translation and cancellation |
| `infrastructure/mcp/resultMapping.test.ts` | Contract with the server (zod), order and size of the heatmaps, and error codes |
| `infrastructure/mcp/mcpTriageGateway.test.ts` | HTTP responses and SDK errors → `kind` |
| `infrastructure/mcp/lazyTriageGateway.test.ts` | Lazy loading, `app_outdated` when the download fails, and a new attempt on the next request |
| `infrastructure/browserSettingsRepository.test.ts` | The key never goes to `localStorage`; the server URL is remembered |
| `infrastructure/serviceWorker.test.ts` | The service worker does not intercept the MCP server or store images |
| `presentation/App.test.tsx` | Full flows (English by default), five states, cancellation, double submission, Settings, axe, the lesion markers (the **Show markers** switch hides them; the list of areas in words stays), the probability bar, switching to Spanish (`<html lang>` and remembered choice), the full flow in Spanish, and identical keys in the `es` and `en` catalogs |

## Deployment

- `npm run build` produces `dist/` with a Content Security Policy (CSP) in a `<meta>` tag.
- Deploy only a clean build: **never** leave test images in `dist/`.
- Hosting options:
  - `npm run preview` behind a tunnel (this is what `start_pilot.ps1` does in the server repository);
  - static hosting with HTTPS, such as GitHub Pages. The app uses relative paths (`base: './'`).
- If the hosting allows it, add the headers `Content-Security-Policy: frame-ancestors 'none'` and
  `X-Content-Type-Options: nosniff`.
- `VITE_DEFAULT_SERVER_URL` is baked into the published bundle: do not put a private tunnel address there.

## Dependencies

- Versions are pinned exactly in `package.json`, with `package-lock.json`.
- When updating, install only versions that are at least two weeks old (for example
  `npm install --before=<date>`). Security patches are the exception.
- ESLint stays on version 9 until `eslint-plugin-jsx-a11y` supports version 10.

## Common changes

| Change | Where |
|---|---|
| UI text | Add the key to `Messages` in `src/presentation/i18n/messages.ts`, then the text in **both** `en.ts` and `es.ts`. The typecheck fails if a catalog is missing it, and the key test fails if the catalogs differ |
| A new language | Add it to `Locale` and `LOCALES` in `messages.ts`, create its catalog, register it in `CATALOG` (`I18nProvider.tsx`) and give it its own name in `LanguageSwitcher.tsx` |
| A new server field | `src/domain/triage.ts` (type), `src/infrastructure/mcp/resultMapping.ts` (schema and mapping) and the matching view |
| A new error | `FailureKind` in `application/errors.ts`, its text in `failures` in both catalogs, its fix in `FAILURE_FIX` (`messages.ts`), whether it is retryable (`RETRYABLE` in `errors.ts`) and where it is raised (`resultMapping.ts`, `mcpTriageGateway.ts` or `lazyTriageGateway.ts`) |
| Colors, type sizes, spacing, radii or shadows | Only in `src/presentation/styles/tokens.css`. Components use the semantic layer; a new color is a primitive plus a semantic token, redefined for the dark theme if needed |
| Layout or breakpoints (480 / 720 / 1024 px) | `src/presentation/styles/app.css`, mobile-first: base styles for phones, then one `@media (min-width: …)` block per breakpoint at the end of the file. The result page order uses `grid-template-areas` |
| The heatmap viewer and its markers | `src/presentation/components/LesionViewer.tsx`; texts `regionsTitle`, `region`, `regionsNote`, `noRegions` and `showMarkers` in both catalogs |
| The probability chart | `src/presentation/components/Probabilities.tsx` (bar and legend) and the `--color-group-*` tokens |
| The image pickers | `src/presentation/components/ImagePicker.tsx` (`tiles` or `compact` variant) |
