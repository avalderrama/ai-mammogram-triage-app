# ai-mammogram-triage-app

An installable web app (PWA) for physicians to try out. You photograph a mammogram on a screen or on film, and the app
asks the MCP server [`ai-mammogram-triage`](https://github.com/avalderrama/ai-mammogram-triage) for a **priority level
for each breast**: High priority, Review or No suspicious findings. The result includes probabilities per BI-RADS
group, photo-quality warnings and, when the resolution allows it, a heatmap.

The interface is in **English by default** and can be switched to **Spanish** with the Language selector in the
header.

> ⚠️ **Research tool.** It is not a medical device and never replaces the radiologist's reading.

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
| [User guide](docs/user-guide.md) | Physicians | Setup, taking a good photo, analyzing, reading the result, changing the language and fixing errors |
| [Architecture](docs/architecture.md) | Developers | Layers, the path of an analysis, views and navigation, languages, errors and the service worker, with diagrams |
| [Design and accessibility](docs/design-and-accessibility.md) | Developers / designers | Compliance with the UX rules, tokens, text and translations, and verification |
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
