/**
 * VectorManager - Vector CRUD Operations
 *
 * Handles all vector management including:
 * - Adding custom vectors with embeddings
 * - Removing vectors
 * - Model switching and re-embedding
 * - PCA re-projection
 * - Vector visualization creation
 *
 * Benefits:
 * - Single responsibility for vector operations
 * - Encapsulates complex PCA logic
 * - Reusable vector management
 * - Cleaner separation of concerns
 */

import * as THREE from 'three'
import { vectors, originalEmbeddings } from './vector-data.js'
import { pcaTo3D } from './math-utils.js'
import { initEmbeddingModel, getEmbedding, isModelReady, MODEL_CONFIGS, getCurrentModel } from './embeddings.js'
import { createVectorArrow, createTextLabel } from './three-helpers.js'
import { showStatus, clearStatus } from './ui.js'
import { STATUS_CONFIG, LABEL_CONFIG } from './constants.js'

export class VectorManager {
  constructor(scene, stateManager) {
    this.scene = scene
    this.state = stateManager
  }

  // ========================================================================
  // VECTOR CREATION
  // ========================================================================

  /**
   * Add a custom vector word with embedding
   * @param {string} word - The word to add
   * @param {string} modelKey - The embedding model to use
   * @returns {Promise<Object>} The created vector data
   */
  async addVector(word, modelKey = 'minilm') {
    // Validation
    if (!word) {
      throw new Error('Word is required')
    }

    if (vectors[word]) {
      throw new Error(`Word "${word}" already exists`)
    }

    const modelConfig = MODEL_CONFIGS[modelKey]
    if (!modelConfig) {
      throw new Error(`Unknown model: ${modelKey}`)
    }

    // Check if we need to load or switch models
    const currentModel = getCurrentModel()
    if (!isModelReady() || currentModel !== modelKey) {
      showStatus(
        `Loading ${modelConfig.institution} ${modelConfig.name}... (${modelConfig.size}, first time only)`,
        'loading'
      )
      await initEmbeddingModel(modelKey)

      // Re-embed all existing words with the new model
      for (const w of Object.keys(vectors)) {
        originalEmbeddings[w] = await getEmbedding(w, modelKey)
      }

      showStatus(`${modelConfig.name} ready! Adding "${word}"...`, 'loading')
    } else {
      showStatus(`Getting embedding for "${word}"...`, 'loading')
    }

    // Get embedding for new word
    const embedding = await getEmbedding(word, modelKey)
    originalEmbeddings[word] = embedding

    // Run PCA to get new 3D coordinates for all vectors
    const projected = pcaTo3D(originalEmbeddings)
    if (!projected) {
      throw new Error('PCA projection failed')
    }

    // Update all vectors with new PCA coordinates
    const nonNullWords = Object.keys(originalEmbeddings).filter(w => originalEmbeddings[w] !== null)
    nonNullWords.forEach((w, i) => {
      if (!vectors[w]) {
        // New word being added
        const randomColor = Math.floor(Math.random() * 0xffffff)
        vectors[w] = {
          coords: projected[i],
          color: randomColor,
          description: `${modelKey} embedding`,
          isCustom: true
        }
      } else {
        // Existing word, update coords
        vectors[w].coords = projected[i]
      }
    })

    // Recreate all visualizations with new coordinates
    await this.recreateAllVisualizations()

    showStatus(
      `Added "${word}" using ${modelConfig.name}! Click it to compare.`,
      'success'
    )
    setTimeout(() => clearStatus(), STATUS_CONFIG.SUCCESS_TIMEOUT_MS)

    return vectors[word]
  }

  // ========================================================================
  // VECTOR REMOVAL
  // ========================================================================

  /**
   * Remove a vector by name
   * @param {string} word - The word to remove
   */
  removeVector(word) {
    const arrow = this.state.getVectorObject(word)
    const label = this.state.getLabelSprite(word)

    if (arrow) this.scene.remove(arrow)
    if (label) this.scene.remove(label)

    this.state.unregisterVectorObject(word)
    delete vectors[word]
    delete originalEmbeddings[word]

    // Remove from selection if selected
    if (this.state.isSelected(word)) {
      this.state.deselectVector(word)
    }
  }

  /**
   * Remove all custom vectors
   * @returns {number} Number of vectors removed
   */
  clearCustomVectors() {
    const customWords = Object.keys(vectors).filter((w) => vectors[w].isCustom)

    if (customWords.length === 0) {
      return 0
    }

    customWords.forEach((word) => this.removeVector(word))

    return customWords.length
  }

  /**
   * Remove all vectors (start fresh)
   * @returns {number} Number of vectors removed
   */
  clearAllVectors() {
    const allWords = Object.keys(vectors)

    allWords.forEach((word) => this.removeVector(word))

    return allWords.length
  }

  // ========================================================================
  // MODEL SWITCHING
  // ========================================================================

  /**
   * Switch to a different embedding model and re-embed all vectors
   * @param {string} newModelKey - The model key to switch to
   */
  async switchModel(newModelKey) {
    const modelConfig = MODEL_CONFIGS[newModelKey]
    if (!modelConfig) {
      throw new Error(`Unknown model: ${newModelKey}`)
    }

    const currentModel = getCurrentModel()

    // If already using this model, do nothing
    if (currentModel === newModelKey && isModelReady()) {
      return
    }

    showStatus(`Loading ${modelConfig.name}...`, 'loading')

    // Initialize new model
    await initEmbeddingModel(newModelKey)

    // Re-embed all existing words with the new model
    const allWords = Object.keys(vectors)
    showStatus(`Re-embedding ${allWords.length} words with ${modelConfig.name}...`, 'loading')

    for (const word of allWords) {
      originalEmbeddings[word] = await getEmbedding(word, newModelKey)
    }

    // Run PCA to get new 3D coordinates
    const projected = pcaTo3D(originalEmbeddings)
    if (!projected) {
      throw new Error('PCA projection failed')
    }

    // Update coordinates
    const nonNullWords = Object.keys(originalEmbeddings).filter(w => originalEmbeddings[w] !== null)
    nonNullWords.forEach((w, i) => {
      if (vectors[w]) {
        vectors[w].coords = projected[i]
      }
    })

    // Recreate all visualizations with new coordinates
    await this.recreateAllVisualizations()

    showStatus(`Switched to ${modelConfig.name}`, 'success')
    setTimeout(() => clearStatus(), STATUS_CONFIG.ERROR_TIMEOUT_MS)
  }

  // ========================================================================
  // VISUALIZATION MANAGEMENT
  // ========================================================================

  /**
   * Set label base position with multiplier
   * @param {THREE.Sprite} label - The label sprite
   * @param {Array<number>} coords - The coordinates [x, y, z]
   * @param {number} multiplier - Position multiplier
   */
  setLabelBasePosition(label, coords, multiplier = LABEL_CONFIG.POSITION_MULTIPLIER) {
    const basePos = new THREE.Vector3(
      coords[0] * multiplier,
      coords[1] * multiplier,
      coords[2] * multiplier
    )
    label.position.copy(basePos)
    label.userData.basePosition = basePos.clone()
    label.userData.offsetSeed = Math.sign(coords[0]) || (Math.random() > 0.5 ? 1 : -1)
    if (!label.userData.baseScale) {
      label.userData.baseScale = label.scale.clone()
    }
  }

  /**
   * Create visualization for a single vector
   * @param {string} word - The word
   * @param {Object} data - Vector data {coords, color}
   * @param {Array} allCoords - All vector coordinates for context
   */
  createVisualization(word, data, allCoords) {
    // Create arrow
    const arrow = createVectorArrow([0, 0, 0], data.coords, data.color, allCoords)
    arrow.userData = { name: word, coords: data.coords, color: data.color }
    this.scene.add(arrow)

    // Create label
    const label = createTextLabel(word, data.color)
    label.userData = { name: word, coords: data.coords, color: data.color, isHovered: false }
    this.setLabelBasePosition(label, data.coords)
    this.scene.add(label)

    // Register with state manager
    this.state.registerVectorObject(word, arrow, label)

    // Track meshes for raycasting
    const meshes = arrow.children.map(mesh => {
      mesh.userData = { name: word, coords: data.coords, color: data.color }
      return mesh
    })
    this.state.addVectorMeshes(meshes)
  }

  /**
   * Recreate all vector visualizations (after PCA update)
   */
  async recreateAllVisualizations() {
    // Remove all existing visualizations
    this.state.getAllVectorNames().forEach(name => {
      const arrow = this.state.getVectorObject(name)
      const label = this.state.getLabelSprite(name)
      if (arrow) this.scene.remove(arrow)
      if (label) this.scene.remove(label)
      this.state.unregisterVectorObject(name)
    })

    // Clear mesh tracking
    this.state.clearMeshes()

    // Recreate all vectors with new positions
    const updatedCoords = Object.values(vectors).map(v => v.coords)

    Object.entries(vectors).forEach(([word, data]) => {
      this.createVisualization(word, data, updatedCoords)
    })
  }

  /**
   * Initialize vectors from existing data
   * @param {Object} vectorData - Vector data dictionary
   */
  initializeVectors(vectorData) {
    const allCoords = Object.values(vectorData).map(v => v.coords)

    Object.entries(vectorData).forEach(([name, data]) => {
      this.createVisualization(name, data, allCoords)
    })
  }

  // ========================================================================
  // UTILITY METHODS
  // ========================================================================

  /**
   * Get vector data by name
   * @param {string} word - The word
   * @returns {Object|null} Vector data or null if not found
   */
  getVectorData(word) {
    return vectors[word] || null
  }

  /**
   * Check if vector exists
   * @param {string} word - The word
   * @returns {boolean}
   */
  hasVector(word) {
    return !!vectors[word]
  }

  /**
   * Get all vector names
   * @returns {Array<string>}
   */
  getAllVectorNames() {
    return Object.keys(vectors)
  }

  /**
   * Get count of vectors
   * @returns {number}
   */
  getVectorCount() {
    return Object.keys(vectors).length
  }

  /**
   * Get count of custom vectors
   * @returns {number}
   */
  getCustomVectorCount() {
    return Object.keys(vectors).filter(w => vectors[w].isCustom).length
  }
}
