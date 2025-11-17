# Vector Similarity Explorer

This project is an interactive 3D visualization tool for exploring word embeddings and their relationships. It allows users to visualize word vectors in a 3D space, compare their similarities, and even add their own words to the visualization dynamically.

## Live Demo

https://probablyfine.lol

## Features

* **Interactive 3D Space:** Word vectors are represented as arrows in a 3D space that can be rotated and explored.
* **Vector Comparison:** Click on two vectors to compare them and see their similarity scores.
* **Similarity Metrics:** Cosine similarity is used to determine the relationship between vectors.
* **Dynamic Word Addition:** Add new words to the visualization and see how they relate to existing words.
* **Controls:** Easily reset the view, clear selections, or start with a fresh canvas.

## Technologies Used

* **HTML, CSS, JavaScript:** The core technologies for building the web application.
* **Three.js:** A 3D graphics library for rendering the vector space.
* **@xenova/transformers:** A library for generating word embeddings directly in the browser. Specifically used the Xenova/all-MiniLM-L6-v2 model.
