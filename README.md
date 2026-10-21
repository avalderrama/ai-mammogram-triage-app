# ai-mammogram-triage-app

[![License: Apache-2.0](https://img.shields.io/badge/license-Apache--2.0-blue.svg)](LICENSE)

An installable web app (PWA) for physicians to try out. You photograph a mammogram on a screen or on film, and the app
asks the MCP server [`ai-mammogram-triage`](https://github.com/avalderrama/ai-mammogram-triage) for a **priority level
for each breast**: High priority, Review or No suspicious findings. The result includes probabilities per BI-RADS
group, photo-quality warnings and, when the resolution allows it, a heatmap with up to three numbered boxes on the
areas the model found most suspicious.

The interface is in **English by default** and can be switched to **Spanish** with the Language selector in the
header.

> ⚠️ **Research tool.** It is not a medical device and never replaces the radiologist's reading.

## Why this project

My mother went through breast cancer. Seeing what she lived through taught me that, with this disease, acting in
time is what saves lives. Yet many women do not have quick access to medical care: in parts of Latin America there
is no radiologist nearby, and a mammogram can wait weeks before someone reads it.

This app is my attempt to help them. With just a phone, a physician can find out which mammograms look the most
worrying, so those women reach a radiologist first and get care in time. — Alexander Valderrama

It is part of a three-repository project:

| Repository | Role |
|---|---|
| `ai-mammogram-triage-training` (private) | Data, training, experiments and model calibration |
| [`ai-mammogram-triage`](https://github.com/avalderrama/ai-mammogram-triage) | MCP server that runs the analysis |
| **`ai-mammogram-triage-app`** (this one) | The interface for physicians |

## Privacy

- The image is kept **in memory only**: it is never stored in `localStorage`, IndexedDB or the service worker cache.
- The **access key** lives in memory. If the user asks for it, it goes to `sessionStorage`, which is cleared when the
  tab closes. It never goes to `localStorage` or the URL.
- `localStorage` holds only the server address and the language preference.
- Only `https://` servers are accepted, or local `http://` for development.
- The service worker caches only the app shell.

## Quick start

Requires Node 22 or later (enforced by `engines` in `package.json`).

```bash
npm ci
```

```bash
npm run dev
```

Open `http://127.0.0.1:5173`, go to **Settings** and enter the server address (it ends in `/mcp`) and the access key.

## Documentation

| Document | For | Contents |
|---|---|---|
| [User guide](docs/user-guide.md) | Physicians | Setup, taking a good photo, analyzing, reading the result and the marked areas, changing the language and fixing errors |
| [Architecture](docs/architecture.md) | Developers | Layers, components, the path of an analysis, views and navigation, languages, errors and the service worker, with diagrams |
| [Design and accessibility](docs/design-and-accessibility.md) | Developers / designers | Compliance with the UX rules, tokens, layout and breakpoints, text and translations, and verification |
| [Development](docs/development.md) | Developers | Tests, deployment, dependencies and common changes |

How the scores are computed and what they mean: see `docs/scores-and-levels.md` in the
[server repository](https://github.com/avalderrama/ai-mammogram-triage).

## Checks (Definition of Done)

```bash
npm run typecheck
```

```bash
npm run lint
```

```bash
npm test
```

## Pilot access

The app needs a server address and an access key. Physicians and researchers who want to try it in a research
pilot can request them with the **[pilot access form](https://forms.gle/2msrWXkJW7Cj9rYV8)**.

## License

Licensed under the [Apache License 2.0](LICENSE); see also [NOTICE](NOTICE). It is provided "as is", without
warranties of any kind.

## Author

**Alexander Valderrama** · [LinkedIn](https://www.linkedin.com/in/alexander-valderrama-a9a01910) ·
[@avalderrama](https://github.com/avalderrama)
