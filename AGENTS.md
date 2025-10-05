# Vector Similarity Explorer - Agent Guidelines

## Running the Project
- **Dev Server**: `npx http-server` or `python -m http.server 8080`
- **No Build Required**: This is a client-side only static web project
- **No Tests**: No test framework is currently configured

## Architecture
- **Entry Point**: `index.html` loads `js/main.js` as ES6 module
- **Modules**: `main.js` (app orchestration), `vector-data.js` (initial data), `embeddings.js` (ML model), `math-utils.js` (calculations), `three-helpers.js` (3D objects), `ui.js` (UI updates)
- **Dependencies**: Three.js (3D rendering) and @xenova/transformers (word embeddings) via CDN importmap
- **Deployment**: Cloudflare Workers (.wrangler/ directory present)

## Code Style
- **Format**: ES6 modules with `import` statements
- **Naming**: camelCase for variables/functions, PascalCase for classes
- **Global Functions**: Controls exposed as global functions (resetView, clearSelection, etc.) called from HTML onclick handlers
- **Comments**: Well-commented code explaining complex logic
- **No Build Tools**: Direct browser execution, no transpilation or bundling
- **Dependencies**: Managed via importmap in index.html, no package.json or npm dependencies
