# Project Overview

This project is an interactive 3D visualization tool for exploring word embeddings and their relationships. It allows users to visualize word vectors in a 3D space, compare their similarities, and even add their own words to the visualization dynamically.

The application is built with vanilla HTML, CSS, and JavaScript, using modern features like ES6 modules and `importmap`. The 3D visualization is rendered using the **Three.js** library, and word embeddings are generated in the browser using the **@xenova/transformers** library with the `Xenova/all-MiniLM-L6-v2` model.

## Architecture

The application is structured into several JavaScript modules:

*   `main.js`: The main entry point of the application. It initializes the Three.js scene, handles user interactions, and manages the overall state of the application.
*   `vector-data.js`: Contains the initial data for the vectors.
*   `embeddings.js`: Handles the loading of the embedding model and the generation of word embeddings.
*   `math-utils.js`: Provides mathematical functions for calculations like cosine similarity and PCA.
*   `three-helpers.js`: Contains helper functions for creating Three.js objects like arrows and labels.
*   `ui.js`: Manages the UI, including the information panel and status messages.

# Building and Running

This is a client-side-only web project. There is no build process required. To run the project, you need to serve the files with a simple HTTP server.

**1. Install a simple HTTP server (if you don't have one):**

```bash
npm install -g http-server
```

**2. Start the server in the project root:**

```bash
http-server
```

**3. Open the project in your browser:**

Navigate to the URL provided by the `http-server` (usually `http://localhost:8080`).

# Development Conventions

*   **Modularity:** The code is organized into modules with specific responsibilities.
*   **Modern JavaScript:** The project uses ES6 modules and `importmap` for dependency management.
*   **Code Style:** The code is well-formatted and uses consistent naming conventions.
*   **Comments:** The code is well-commented, which makes it easy to understand.
