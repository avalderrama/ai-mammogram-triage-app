# Design and accessibility

This document summarizes how the app meets the team's design rules and how that was verified.

## Rules applied

The app follows the team's binding rules in `reglas-diseno-ui-ux-web.md` (`UX-*`, WCAG 2.2 AA). Compliance summary:

| Rule | How it is met | Verification |
|---|---|---|
| `UX-VIS-001/002` Semantic tokens | Every color, gradient, spacing, type size, radius, shadow and duration comes from `src/presentation/styles/tokens.css`; components use only the semantic layer | Code review |
| `UX-VIS-006` and `UX-VIS-010` Modular type scale in `rem` | Six sizes: a 1.25 ratio from the 1 rem body (1 / 1.25 / 1.563 / 1.953 / 2.441 rem) plus 0.875 rem for secondary and help text (the 14 px of the rules' type table) | Code review |
| `UX-VIS-011` Limited palette with roles | One action color (blue), one neutral scale (slate), four feedback colors and the three BI-RADS group colors for the probability chart. The only extra accent is the cyan of the lesion markers, justified because it is the one hue that stands out on both a grayscale mammogram and the red heatmap | Code review |
| `UX-VIS-012` and `UX-ACC-008` Contrast | Light and dark palettes computed for ≥ 4.5:1 | axe with contrast in a real browser on every view, at 320 px dark and 1280 px light: 0 violations |
| `UX-VIS-013` and `UX-ACC-009` Not color alone | Each level has icon + text + color + border; field errors have icon + message; the probability bar has a text legend; each marker has a number and its location in words | Component test |
| `UX-VIS-014` One primary per view | One main action per view; the rest are secondary | Review |
| `UX-VIS-019` Elevation with meaning | Three shadow levels: `--shadow-card` (cards), `--shadow-raised` (hero, hovered tiles, skip link) and `--shadow-action` (primary action) | Code review |
| `UX-LAY-001/003/004` Mobile first, no horizontal scroll, 320 px | Mobile-first CSS: one column on phones, more columns at the 480, 720 and 1024 px breakpoints (see [Layout](#layout)); content at most 72 rem wide and paragraphs at most 65ch | Real browser at 320 and 1280 px: no horizontal scroll |
| `UX-LAY-008` Touch targets | At least 44 px (`--target-min`), including the language selector | Review |
| `UX-LAY-009` Fixed elements | The header is static on phones, so it scrolls away and never covers content or fields; it becomes sticky only from 720 px | Review |
| `UX-LAY-011` Stability | The preview reserves a 3:4 ratio; heatmaps declare width and height (read from the PNG) and reserve that ratio; markers are placed in percentages of the image, so they stay aligned at any size | Review |
| `UX-NAV-006` Back button | Hash routes; Back during an analysis cancels it | Test |
| `UX-NAV-008` Skip to content | "Skip to content" link | Test + axe |
| `UX-EST-000` Five states | The Result view has loading, empty, error, partial and with data; Review image has empty and blocked | Tests per state |
| `UX-EST-001` Long waits | Real steps, elapsed time and a **Cancel analysis** button | Test |
| `UX-EST-004` Errors with a way out | What failed, whether it is temporary, what to do, an action button and a reference code. When a newer deployment removed the code this tab needs (`app_outdated`), the only action is **Reload the page** | Test |
| `UX-CMP-005` Double submission | A running analysis blocks a second submission | Test |
| `UX-CMP-006` Disabled state explained | The **Analyze image** button, with `aria-disabled`, explains why it is blocked (`aria-describedby`) | Test |
| `UX-FRM-001/005/006/007` Forms | Visible labels, help text, validation on submit with an inline message, focus on the first error, nothing typed is lost | Test |
| `UX-DAT-009` Accessible charts | The probability chart is one stacked bar in blue / amber / red, a set that stays distinguishable with the common color-vision deficiencies. The bar is decorative (`aria-hidden`); a legend next to it gives each group's name and exact percentage as text | Component test + review |
| `UX-FBK-005` Live regions | `role="status"` / `role="alert"` for progress, result, connection and errors | Test + axe |
| `UX-ACC-004` Visible focus | 3 px ring with the `--color-focus` token | Review |
| `UX-ACC-011` Language | Satisfied dynamically: `index.html` starts with `<html lang="en">` and `I18nProvider` keeps `lang` in sync with the selected language (`en` or `es`). Each option of the language selector carries its own `lang` | Test (Spanish switch updates `<html lang>`) + axe |
| `UX-ACC-012` and `UX-MOV-005` Reduced motion | `prefers-reduced-motion` turns off animations and transitions | Review |
| `UX-MOV-001` Animation communicates | No decorative looping animation. The only repeating animation is the progress bar while an analysis runs (feedback); the rest are short hover and state transitions (150 ms) | Review |
| `UX-CNF-003/005` Defaults and permissions | "Remember the key" is unticked by default; the camera is requested only when tapping **Take photo** | Review |
| `UX-TXT-006` Text ready for translation | Satisfied by the typed catalogs: every UI string lives in `src/presentation/i18n/en.ts` and `es.ts`, typed by `Messages`, so a missing translation is a type error; a test checks that both catalogs have identical keys | Typecheck + test |
| `UX-PRF-004` Lazy loading | The MCP SDK (≈ 83 KB gzipped) is downloaded on first use. The initial load is ≈ 86 KB of gzipped JS plus ≈ 5 KB of CSS | Build |

## Tokens

All tokens live in `src/presentation/styles/tokens.css`.

- **Color:** primitives (`--blue-600`, `--red-700`…) and semantic tokens:
  - surfaces and text: `--color-bg`, `--color-surface`, `--color-text-primary`, `--color-text-secondary`…;
  - action and focus: `--color-action`, `--color-focus`;
  - feedback: `--color-feedback-{danger,warning,success,info}` and their backgrounds;
  - data: `--color-group-routine` (blue), `--color-group-follow-up` (amber) and `--color-group-biopsy` (red) for
    the BI-RADS groups, always with a text legend;
  - accent: `--color-marker` (cyan) for the lesion markers, with `--color-on-marker` for their numbers;
  - hero: `--gradient-hero`, a blue-to-indigo gradient behind the home title and pickers.

  The dark theme (`prefers-color-scheme: dark`) redefines only the semantic tokens.
- **Levels:** `high_priority` → danger (red), `review` → warning (amber), `no_suspicious_findings` → success (green).
  Always with icon and text.
- **Typography:** system fonts; modular scale with ratio 1.25 from the 1 rem body: 1 / 1.25 / 1.563 / 1.953 /
  2.441 rem, plus 0.875 rem for secondary and help text. Line height 1.55 for body text and 1.2 for headings.
- **Spacing:** 4 px base (`--space-1` … `--space-12`).
- **Shape and elevation:** radii from 6 to 24 px plus a full radius for pills; three shadow levels (card, raised,
  action).
- **Motion:** 150 ms and 250 ms durations with one standard easing curve.

## Layout

The CSS in `src/presentation/styles/app.css` is mobile-first: the base styles are for phones and each breakpoint
adds columns.

| Width | Changes |
|---|---|
| Base (phones) | One column. Header static (not sticky). Home: hero with the title and two large picker tiles, then "How it works" as stacked steps |
| ≥ 480 px | The two picker tiles sit side by side |
| ≥ 720 px | Header sticky at the top. Buttons in a row. "How it works" in three columns. Views of a breast side by side when they fit |
| ≥ 1024 px | Home hero in two columns (text and pickers). Review image in two columns. Result page in two columns: the overall result, the disclaimer and the actions on the left; the notices and breast details on the right |

On the result page the order is set with grid areas. On phones the actions (**Analyze another image**, **Back to
the image**) come after the details, which is also their order in the DOM; on wide screens they move under the
overall result.

## Text and languages

The UI opens in the **browser's language** (Spanish or English; English for any other), and the user can switch
it. The strings live in `src/presentation/i18n/`:

- `messages.ts` defines the `Messages` type; `en.ts` and `es.ts` implement it.
- English uses a plain, direct voice. Spanish uses the informal *tú* form and the product's neutral voice.
- Errors do not apologize: they say what to do.
- The three levels always use the same words: "High priority", "Review" and "No suspicious findings" (in Spanish,
  «Alta prioridad», «Revisar» and «Sin hallazgos sospechosos»).

The language selector (`LanguageSwitcher.tsx`) is a **labelled native `<select>`** in the header: its label
("Language" / "Idioma") is visually hidden but read by screen readers, and each language is named in its own language
("English", "Español") with a `lang` attribute so it is pronounced correctly. The choice is remembered in
`localStorage` under `mammo-triage.locale`; it is not sensitive.

## How it was verified

- `npm test`: 53 tests, including axe checks (WCAG 2.2 AA) on every view, the full flow in Spanish and a test that the
  `es` and `en` catalogs have identical keys. jsdom does not measure contrast.
- Real browser (built PWA):
  - axe with contrast on every view;
  - 320 px wide in the dark theme and 1280 px wide in the light theme.

  Result: 0 violations and no horizontal scroll.
