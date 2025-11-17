# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Vector Similarity Explorer is an interactive 3D visualization tool for exploring word embeddings and their semantic relationships. Users can visualize word vectors in 3D space, compare similarities, and dynamically add custom words using multiple embedding models from major research institutions.

**Live Demo:** https://probablyfine.lol

**Supported Models:**
- MiniLM-L6-v2 (Sentence-Transformers) - Paraphrase detection specialist
- E5-small-v2 (Microsoft Research) - Web-scale contrastive learning
- BGE-small-en-v1.5 (BAAI) - Retrieval optimization with distillation

All models are 384D, allowing fair visual comparison in 3D space.

## Development Commands

This is a static website with no build process. Development is straightforward:

- **Quick Start:** Use the provided start script:
  ```bash
  ./start.sh
  ```
  This script serves on `0.0.0.0:3000` for local network access and creates an ngrok tunnel to `will-node.ngrok.dev` for public access.

- **Manual Start:** Open `index.html` in a browser or use a local server:
  ```bash
  python -m http.server 8000
  # or
  npx serve
  ```

- **Testing Changes:** Simply refresh the browser after editing files

## Responsive Design

The application is fully responsive with special handling for screens < 1200px:
- **Layout:** Switches from CSS Grid to Flexbox with vertical stacking
- **Content Order:** Top nav → Legend → Canvas → Instructions → Info panel
- **Canvas:** Centered with max-width of 800px and fixed height of 500px
- **Touch Support:** Full touch event handling for iPad/mobile with tap detection
  - 20px movement threshold for taps
  - 500ms duration limit for tap detection
  - Touch events bound to canvas element specifically to avoid conflicts with OrbitControls

## Architecture Overview

**Refactoring Status:** ✅ Phases 1-2 Complete (Constants Extraction + State Management)
See [REFACTORING_SUMMARY.md](REFACTORING_SUMMARY.md) for details.

### Module Structure

The codebase follows an ES6 module architecture with clear separation of concerns:

**Core Modules:**
- **main.js** - Application entry point: initializes managers, runs intro sequence, and coordinates the rendering loop
- **StateManager.js** - Centralized state management (selections, hover, animations, camera state)
- **SceneManager.js** - Three.js scene initialization (scene, camera, renderer, controls, lighting, ground)
- **AnimationController.js** - Animation orchestration (vector animations, camera movements, easing)
- **CameraController.js** - Camera operations (focus on vectors, state save/restore, reset)
- **VectorManager.js** - Vector CRUD operations (add, remove, update, model switching)
- **InteractionHandler.js** - Mouse/keyboard event handling (hover, selection, raycasting)

**Utility Modules:**
- **constants.js** - All configuration constants (91+ named constants replacing magic numbers)
- **embeddings.js** - Multi-model transformer interface using @xenova/transformers
- **vector-data.js** - Initial vector data and embeddings storage
- **math-utils.js** - Vector mathematics (cosine similarity, euclidean distance, dot product) and PCA
- **three-helpers.js** - Three.js object factories for vectors, labels, lines, axes, and annotations
- **ui.js** - DOM manipulation for info panel and status messages
- **batch-upload.js** - Batch file upload handling (parsing, validation, progress UI, embedding)

### Key Architectural Patterns

**Dimensionality Reduction Flow:**
1. Words are embedded in high-dimensional space (384D for all three models)
2. `pcaTo3D()` in math-utils.js uses power iteration to find top 3 principal components
3. When new words are added, ALL vectors are re-projected to maintain proper spatial relationships
4. Three.js objects are recreated with new coordinates
5. **Critical:** pcaTo3D filters out null embeddings, so coordinate mapping must match the filtered array

**State Management:**
- Centralized in **StateManager** class: selections, hover state, object registry, animations, camera state
- State accessed via methods: `state.selectVector()`, `state.getSelectedVectors()`, `state.isComparisonMode()`
- Event system: `state.on('selectionChanged', handler)` for reactive updates
- Shared mutable objects: `vectors` and `originalEmbeddings` in vector-data.js
- When adding custom words, both dictionaries are updated and all visual objects are regenerated

**Interaction System:**
- Raycasting checks both vector meshes and label sprites for hover/click
- **Touch Support:** Full mobile/tablet support with touchstart, touchend, touchmove events
  - Tap detection with movement threshold (< 20px) and duration limit (< 500ms)
  - Touch events bound to canvas element to prevent conflicts with OrbitControls
  - preventDefault() called only for valid taps to allow normal scrolling/panning
- Selection allows up to 2 vectors; adding a 3rd removes the first
- Visual feedback uses animated transitions via `animateVector()` and manual RAF loops
- Two vectors selected triggers automatic camera focusing and annotation rendering

**Batch Upload System:**
- Entries are separated by blank lines (regex: `/\n\s*\n/`) to allow multi-line text
- Maximum 50 items per upload to maintain performance
- Text handling:
  - Display labels truncated to 40 characters with "..." suffix
  - Full text (up to 500 chars) used for embeddings
  - Full text stored in `vectors[word].fullText` for reference
- Deduplication against both file content and existing vectors
- Progress overlay UI with:
  - Loading spinner and status text
  - Progress bar showing embedding progress
  - Defensive removal logic in finally block to prevent stuck overlays
- Each uploaded vector assigned random color (matches individual vector behavior)
- Triggers full PCA re-projection and visualization refresh via CustomEvent
- Event-driven architecture: `batchUploadComplete` event triggers `recreateAllVisualizations()`

**Visual Annotations:**
- Angle arcs visualize cosine similarity (angle between vectors)
- Distance annotations show euclidean distance with tick marks
- Connection lines use custom shader material for animated gradient effects

### Important Implementation Details

**Multi-Model System:**
- Three transformer models available: MiniLM (~50MB), E5-small (~133MB), BGE-small (~150MB)
- Models lazy-load on first use via @xenova/transformers
- Singleton pattern with loading flags prevents duplicate loads
- `MODEL_CONFIGS` in embeddings.js contains metadata for all models

**Model Switching:**
When user switches models:
1. New model is loaded via `initEmbeddingModel(modelKey)`
2. ALL existing words are re-embedded with the new model
3. PCA runs on the new embeddings
4. All Three.js objects are recreated with new coordinates
This is necessary because different models produce different embeddings, requiring complete re-visualization

**PCA Re-projection:**
When a new word is added, the entire dataset must be re-projected because PCA is a global transformation. The code:
1. Adds new embedding to `originalEmbeddings`
2. Runs PCA on all embeddings
3. Updates all vector coordinates in `vectors` dictionary
4. Removes and recreates ALL Three.js objects with new positions

**Three.js Object Management:**
- Each vector is a Group containing shaft and cone meshes
- Labels are Sprites with canvas-based textures
- User data (`mesh.userData.name`) links visual objects to vector names
- Arrays track objects for raycasting: `vectorMeshes[]`, `labelSpritesList[]`

### Google Tag Manager

GTM (GTM-THHLV3R3) is integrated for analytics. Code is present in index.html header and noscript fallback.

## Common Gotchas

1. **Adding new vectors requires full re-projection** - Don't try to incrementally add vectors without updating existing positions. PCA is a global transformation.

2. **PCA coordinate mapping** - `pcaTo3D()` filters out null embeddings, so you must use `Object.keys(originalEmbeddings).filter(w => originalEmbeddings[w] !== null)` to match coordinates with words. Getting this wrong causes "end is not iterable" errors.

3. **Mesh user data must be consistent** - Both Group.userData and child mesh.userData need name/coords/color for raycasting to work properly.

4. **Animation conflicts** - The `vectorAnimations` Map prevents conflicting animations on the same object.

5. **Camera focusing math** - When two vectors are selected, camera positions perpendicular to their triangle face for optimal viewing.

6. **Pointer events for UI overlays** - Parent containers (.left-column, .right-column) have `pointer-events: auto` to allow interaction with UI elements and proper event handling. Child elements like .legend, .instructions, and .info-panel also have `pointer-events: auto`. This ensures both UI interactions and canvas zoom work correctly.

7. **Wheel events and zoom** - Don't add wheel event listeners with `preventDefault()` to UI elements - this blocks OrbitControls zoom. Let events bubble naturally.

8. **OrbitControls during camera animations** - CRITICAL: When manually animating camera position (e.g., `camera.position.lerpVectors()`), you MUST call `controls.update()` inside the animation loop. Without this, OrbitControls loses track of its internal zoom state, causing binary zoom behavior (snapping between two states). See AnimationController.animateCamera() for correct implementation.

9. **Touch event handling** - Touch events must be bound to the canvas element specifically, not window. Use lenient thresholds (20px movement, 500ms duration) for tap detection. Only call preventDefault() for valid taps to avoid blocking OrbitControls gestures.

10. **Batch upload delimiter** - Entries are separated by blank lines (`/\n\s*\n/`), NOT individual newlines. This allows multi-line text entries. Each entry gets truncated for display (40 chars) but full text is used for embeddings (500 chars max).

11. **Progress overlay cleanup** - Always use finally block when showing progress overlays to ensure removal. Check for existing overlays before creating new ones to prevent duplicates. Use defensive DOM queries when updating progress to handle missing elements gracefully.

12. **Batch upload triggers full re-projection** - Like adding individual vectors, batch uploads require ALL vectors to be re-projected via PCA and all Three.js objects to be recreated. This is handled via the `batchUploadComplete` CustomEvent.

## File Dependencies

```
index.html
  → main.js (entry point, coordinates all managers)
      ├─→ StateManager.js (centralized state)
      ├─→ SceneManager.js (Three.js scene setup)
      ├─→ AnimationController.js (animations)
      │     └─→ constants.js (animation configs)
      ├─→ CameraController.js (camera operations)
      │     └─→ constants.js (camera/focus configs)
      ├─→ VectorManager.js (vector CRUD)
      │     ├─→ vector-data.js (vectors, originalEmbeddings)
      │     ├─→ embeddings.js (transformer models)
      │     ├─→ math-utils.js (PCA)
      │     ├─→ three-helpers.js (object factories)
      │     └─→ constants.js (vector/label configs)
      ├─→ InteractionHandler.js (mouse/keyboard/touch events)
      │     └─→ constants.js (raycaster configs)
      ├─→ batch-upload.js (file upload handling)
      │     ├─→ embeddings.js (transformer models)
      │     ├─→ vector-data.js (vectors, originalEmbeddings)
      │     ├─→ math-utils.js (PCA)
      │     └─→ ui.js (status messages)
      ├─→ ui.js (DOM updates)
      ├─→ onboarding.js (tour system)
      └─→ constants.js (all configuration)
```

All imports use ES6 modules loaded via importmap in index.html pointing to CDN resources (Three.js, @xenova/transformers).

**Note on @xenova/transformers:** The library (v2.17.2) may show a harmless `contentTypesJSON` duplicate variable error in the console. This is a known quirk with the CDN-loaded version and does not affect functionality.
