# Repository Guidelines

## Project Structure & Module Organization
This repo hosts the Vector Similarity Explorer, a static web app rooted at `index.html`. Core rendering and interaction logic lives under `js/`: `main.js` wires Three.js, `three-helpers.js` builds geometry, `math-utils.js` handles projections and similarity math, `embeddings.js` wraps `@xenova/transformers`, and `ui.js` drives panels. Styles reside in `css/`, while JSON/JS data snapshots (`final-vector-data.js`, `curated-vector-data.js`, `final-vector-data.txt`) and helper scripts (`generate-embeddings.js`, `generate-curated-embeddings.js`) sit at the repo root. Keep generated assets out of version control unless they materially change the visualization.

## Build, Test, and Development Commands
- `npm install` — installs the single runtime dependency (`@xenova/transformers`) so the browser can load the MiniLM model on demand.
- `bash start.sh` — launches the recommended dev server (Python HTTP server on port 3000) with a port-conflict guard.
- `python3 -m http.server 3000` — minimal alternative if you do not need the helper logic in `start.sh`.
- `node generate-embeddings.js` / `node generate-curated-embeddings.js` — regenerates embedding datasets after updating the vocabulary; commit the resulting `*-vector-data.*` files if they change.

## Coding Style & Naming Conventions
JavaScript modules are ES modules with two-space indentation, trailing comma-free lists, and no semicolons (match `js/main.js`). Prefer descriptive camelCase for functions (`createVectorArrow`) and SCREAMING_SNAKE_CASE only for config constants such as `MODEL_CONFIGS`. Keep UI strings centralized in `ui.js` when possible. CSS favors layered gradients and custom properties; extend existing class names rather than introducing global IDs. Run Prettier (2-space, single quotes) before submitting; if you add linting, expose it via `npm` scripts.

## Testing Guidelines
There is no automated suite, so rely on manual checks: load `http://localhost:3000`, confirm vectors render, selection badges update, similarity scores match expectations, and the model spinner (from `ui.js`) clears once embeddings arrive. Exercise vector creation/removal flows and ensure the console stays free of WebGL or CORS errors. For substantive Three.js changes, capture before/after screenshots and validate in Chrome and Firefox to catch shader differences. If you add tests (e.g., Jest for math utilities), place them under `js/__tests__/` and mirror the module name (`math-utils.test.js`).

## Commit & Pull Request Guidelines
Recent history favors short imperative summaries followed by details when needed (e.g., `Add distance-based prominence, modernize visuals`). Use the same tone: `verb + object`, ≤72 characters, optional body paragraphs for rationale. Each PR should include: concise description, linked issue or task, screenshots or GIFs for UI adjustments, and a checklist of manual tests performed. Mention any regenerated datasets, model files, or new npm commands so reviewers can reproduce the environment.

## Security & Configuration Tips
Embeddings load entirely in-browser; do not hard-code API keys or proprietary corpora. Large model weights cache locally, so remind users to clear `IndexedDB` if switching models. When serving publicly, configure HTTPS and a strict Content Security Policy so the WebGL shaders and WASM assets cannot be swapped by intermediaries.
