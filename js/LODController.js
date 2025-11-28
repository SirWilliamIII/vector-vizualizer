/**
 * LODController - Level of Detail System for Visual Clutter Reduction
 *
 * Dynamically adjusts visibility and prominence of vectors based on:
 * - Selection state (highest priority)
 * - Camera distance
 * - Screen center proximity
 * - Semantic relevance (when vectors are selected)
 * - View angle
 *
 * Benefits:
 * - Reduces visual clutter with many vectors
 * - Maintains focus on important/relevant vectors
 * - Prevents label overlap
 * - Improves performance by hiding distant objects
 */

import * as THREE from 'three'
import { vectors } from './vector-data.js'
import { cosineSimilarity } from './math-utils.js'
import {
  LOD_CONFIG,
  LOD_IMPORTANCE_WEIGHTS,
  LOD_THRESHOLDS,
  LOD_VISUAL_SCALES,
  VECTOR_CONFIG
} from './constants.js'

/**
 * LODController
 *
 * Level-of-Detail (LOD) manager for a 3D vector visualization. Controls visibility,
 * prominence, and presentation of vector objects and their labels based on camera
 * position, selection state, semantic similarity, screen proximity, and scene density.
 *
 * Responsibilities:
 * - Compute multi-factor importance scores per vector (selection, hover, distance,
 *   screen-center proximity, semantic similarity, view angle).
 * - Adapt visual characteristics (thickness, cone/shaft/ring scales, opacity) based
 *   on importance and global adaptive configuration.
 * - Adapt label scale based on scene density and per-vector importance/selection state.
 * - Perform simple screen-space label collision detection and limit visible labels.
 * - Expose controls to enable/disable LOD, adjust debounce and max label counts,
 *   and request/force updates.
 *
 * Notes:
 * - This controller relies on several global or externally-provided configuration
 *   objects and helpers (examples: LOD_CONFIG, VECTOR_CONFIG, LOD_IMPORTANCE_WEIGHTS,
 *   LOD_VISUAL_SCALES, LOD_THRESHOLDS, vectors, cosineSimilarity, THREE).
 * - Many behaviors assume label sprites store userData fields (name, baseScale, baseOpacity, etc.).
 *
 * @class
 *
 * @param {THREE.Camera} camera - Active camera used to compute projections and directions.
 * @param {THREE.Renderer} renderer - Renderer instance (used for potential future extensions).
 * @param {Object} stateManager - State manager exposing scene/vector accessors:
 *   - getAllVectorNames(): string[]
 *   - getVectorObject(name: string): THREE.Object3D | undefined
 *   - getLabelSprite(name: string): THREE.Sprite | undefined
 *   - getSelectedVectors(): string[]
 *   - getHoveredVector(): string | null
 *   - isComparisonMode(): boolean
 *   - isSelected(name: string): boolean
 *
 * Public properties (initialized in constructor):
 * @property {boolean} enabled - Whether LOD processing is active.
 * @property {number} maxLabels - Maximum number of labels allowed to be visible simultaneously.
 * @property {number} updateDebounceMs - Debounce interval for update requests (ms).
 * @property {number} lastUpdateTime - Timestamp of last LOD update (ms since epoch).
 * @property {number|null} updateTimeout - ID of pending debounce timeout (if any).
 * @property {Map<string, {x:number,y:number,z:number}>} screenPositionCache - Optional cache for computed screen positions.
 *
 * Public methods:
 *
 * @method calculateGlobalThicknessMultiplier
 * @description
 *   Compute a global thickness multiplier for vector geometry based on the current
 *   number of vectors and the VECTOR_CONFIG.ADAPTIVE_THICKNESS configuration.
 *   The returned multiplier is bounded between configured MIN_SCALE and MAX_SCALE.
 * @returns {number} Thickness multiplier (e.g. 0.4 - 1.0)
 *
 * @method calculateAdaptiveLabelScale
 * @description
 *   Compute an adaptive label scale multiplier based on the current number of vectors
 *   and VECTOR_CONFIG.ADAPTIVE_LABEL_SIZE configuration. Used to shrink/expand label sizing
 *   as scene density changes.
 * @returns {number} Label scale multiplier (e.g. 0.7 - 1.4)
 *
 * @method calculateImportance
 * @description
 *   Calculate an importance score in range [0,100] for a named vector. Factors:
 *     1. Selection & hover: selected vectors and hovered vector receive highest priority.
 *     2. Camera distance: closer vectors score higher.
 *     3. Screen-center proximity: vectors near center score higher.
 *     4. Semantic similarity: when selected vectors exist, vectors similar to any selected
 *        vector are boosted by cosine similarity.
 *     5. View angle: vectors oriented toward/away from the camera are favored.
 *
 *   The method expects the vector dataset to be available (vectors[vectorName].coords).
 *
 * @param {string} vectorName - Name/key of the vector to score.
 * @param {THREE.Vector3} cameraPos - Camera world position used for distance computation.
 * @param {Array<string>} selectedVectors - List of currently selected vector names.
 * @returns {number} Importance score (0 - 100)
 *
 * @method updateAllVisibility
 * @description
 *   Perform a full LOD pass across all vectors:
 *   - If LOD is disabled, resets all vectors to full visibility.
 *   - If "comparison mode" is active (typically 2 selected vectors), only shows selected labels.
 *   - Otherwise computes importance for each vector, applies LOD visual updates,
 *     and runs label collision resolution to choose up to maxLabels to display.
 *
 *   Intended to be invoked either directly (forceUpdate) or via requestUpdate (debounced).
 * @returns {void}
 *
 * @method applyLOD
 * @description
 *   Apply visual changes for a single vector and its label according to a computed importance.
 *   Responsibilities:
 *   - Determine a visual tier (high/medium/low/minimal) using LOD_THRESHOLDS.
 *   - Blend global adaptive thickness and importance-based thickness to compute final thickness.
 *   - Smoothly lerp geometry scales for CylinderGeometry (shafts), ConeGeometry (tips), and
 *     RingGeometry (glows).
 *   - Adjust arrow child material opacities (unless in comparison mode).
 *   - Compute and apply label scale and opacity, storing LOD-controlled values in label.userData.
 *   - Apply smooth transitions using a configurable lerp factor.
 *
 * @param {THREE.Group|THREE.Object3D} vectorGroup - Group containing vector geometry children.
 * @param {THREE.Sprite} labelSprite - Sprite used to render the vector's label.
 * @param {number} importance - Importance score (0 - 100).
 * @returns {void}
 *
 * @method handleLabelCollisions
 * @description
 *   Screen-space label placement routine:
 *   - Sorts labels by importance (descending).
 *   - Projects label positions to screen space and estimates bounding rectangles using
 *     getLabelBounds.
 *   - Keeps the highest-priority labels that do not overlap previously chosen labels,
 *     up to maxLabels.
 *   - Hides labels that are behind the camera, outside the view frustum, collide, or
 *     exceed the max count.
 *
 * @param {Map<string, number>} importanceMap - Map of vector name to importance score.
 * @returns {void}
 *
 * @method getScreenPosition
 * @description
 *   Project a 3D world position into screen space using the managed camera.
 *   Returns null for points behind the camera or outside clip volume.
 *
 * @param {THREE.Vector3} position - World-space 3D position.
 * @returns {{x:number,y:number,z:number}|null} Screen coordinates in pixels and normalized depth z, or null.
 *
 * @method getLabelBounds
 * @description
 *   Estimate a label's axis-aligned bounding rectangle in screen space for collision testing.
 *   This uses label.userData.name, label.scale, approximate character metrics, and a
 *   configurable collision padding.
 *
 * @param {THREE.Sprite} label - Label sprite whose bounds to estimate.
 * @param {{x:number,y:number}} screenPos - Screen-space center position of the label.
 * @returns {{x:number,y:number,width:number,height:number}} Rectangle with top-left x,y and width/height in pixels.
 *
 * @method rectsOverlap
 * @description
 *   Simple AABB overlap test for two rectangles.
 *
 * @param {{x:number,y:number,width:number,height:number}} rect1
 * @param {{x:number,y:number,width:number,height:number}} rect2
 * @returns {boolean} True if rectangles overlap.
 *
 * @method resetAllVisibility
 * @description
 *   Restore all vectors and labels to full visibility and default scales (undo LOD effects).
 *   Respects selection/comparison state in how labels are restored.
 *
 * @returns {void}
 *
 * @method requestUpdate
 * @description
 *   Debounced request to recompute LOD. Multiple calls within updateDebounceMs will collapse
 *   into a single invocation of updateAllVisibility.
 *
 * @returns {void}
 *
 * @method forceUpdate
 * @description
 *   Immediately run updateAllVisibility, cancelling any pending debounced call.
 *
 * @returns {void}
 *
 * @method setEnabled
 * @description
 *   Enable or disable LOD processing. When enabling, forces an immediate update; when
 *   disabling, resets all visibility to full.
 *
 * @param {boolean} enabled - New enabled state.
 * @returns {void}
 *
 * @method setMaxLabels
 * @description
 *   Set the upper bound on simultaneously visible labels (clamped to a sensible range).
 *   Triggers an immediate update when LOD is enabled.
 *
 * @param {number} count - Desired maximum labels (will be clamped, e.g. 1..50).
 * @returns {void}
 *
 * @method isEnabled
 * @description
 *   Query whether LOD is currently active.
 *
 * @returns {boolean}
 *
 * @method getMaxLabels
 * @description
 *   Get the current maximum labels setting.
 *
 * @returns {number}
 *
 * Example usage:
 *   const lod = new LODController(camera, renderer, stateManager)
 *   lod.setMaxLabels(10)
 *   lod.requestUpdate() // debounced
 *
 */
export class LODController {
  constructor(camera, renderer, stateManager) {
    this.camera = camera
    this.renderer = renderer
    this.state = stateManager

    // Configuration
    this.enabled = LOD_CONFIG.ENABLED_DEFAULT
    this.maxLabels = LOD_CONFIG.MAX_LABELS_DEFAULT
    this.updateDebounceMs = LOD_CONFIG.UPDATE_DEBOUNCE_MS

    // State
    this.lastUpdateTime = 0
    this.updateTimeout = null

    // Cache for screen positions
    this.screenPositionCache = new Map()
  }

  // ========================================================================
  // IMPORTANCE CALCULATION
  // ========================================================================

  /**
   * Calculate global thickness multiplier based on vector count
   * @returns {number} Thickness multiplier (0.4 to 1.0)
   */
  calculateGlobalThicknessMultiplier() {
    const vectorCount = Object.keys(vectors).length
    const config = VECTOR_CONFIG.ADAPTIVE_THICKNESS

    if (!config.ENABLED) return 1.0

    // Linear interpolation between optimal and crowded counts
    if (vectorCount <= config.OPTIMAL_COUNT) {
      return config.MAX_SCALE
    } else if (vectorCount >= config.CROWDED_COUNT) {
      return config.MIN_SCALE
    } else {
      const ratio = (vectorCount - config.OPTIMAL_COUNT) / (config.CROWDED_COUNT - config.OPTIMAL_COUNT)
      return config.MAX_SCALE - (ratio * (config.MAX_SCALE - config.MIN_SCALE))
    }
  }

  /**
   * Calculate adaptive label scale based on vector count
   * @returns {number} Label scale multiplier (0.7 to 1.4)
   */
  calculateAdaptiveLabelScale() {
    const vectorCount = Object.keys(vectors).length
    const config = VECTOR_CONFIG.ADAPTIVE_LABEL_SIZE

    if (!config.ENABLED) return 1.0

    // Linear interpolation between optimal and crowded counts
    if (vectorCount <= config.OPTIMAL_COUNT) {
      return config.MAX_SCALE
    } else if (vectorCount >= config.CROWDED_COUNT) {
      return config.MIN_SCALE
    } else {
      const ratio = (vectorCount - config.OPTIMAL_COUNT) / (config.CROWDED_COUNT - config.OPTIMAL_COUNT)
      return config.MAX_SCALE - (ratio * (config.MAX_SCALE - config.MIN_SCALE))
    }
  }

  /**
   * Calculate importance score for a vector (0-100)
   * @param {string} vectorName - The vector name
   * @param {THREE.Vector3} cameraPos - Camera position
   * @param {Array<string>} selectedVectors - Currently selected vectors
   * @returns {number} Importance score
   */
  calculateImportance(vectorName, cameraPos, selectedVectors) {
    let score = 0

    // 1. SELECTION STATE (highest priority)
    if (selectedVectors.includes(vectorName)) {
      return 100 // Always max importance
    }

    if (this.state.getHoveredVector() === vectorName) {
      return 90 // Very high importance for hovered
    }

    const vectorData = vectors[vectorName]
    if (!vectorData || !vectorData.coords) {
      return 0
    }

    const vectorPos = new THREE.Vector3(...vectorData.coords)

    // 2. CAMERA DISTANCE
    const distance = cameraPos.distanceTo(vectorPos)
    const maxDistance = 20 // Typical max distance in the scene
    const distanceScore = LOD_IMPORTANCE_WEIGHTS.DISTANCE * (1 - Math.min(distance / maxDistance, 1))
    score += distanceScore

    // 3. SCREEN CENTER PROXIMITY
    const screenPos = this.getScreenPosition(vectorPos)
    if (screenPos) {
      const centerX = window.innerWidth / 2
      const centerY = window.innerHeight / 2
      const dx = screenPos.x - centerX
      const dy = screenPos.y - centerY
      const screenDistance = Math.sqrt(dx * dx + dy * dy)
      const maxScreenDistance = Math.sqrt(centerX * centerX + centerY * centerY)
      const centerScore = LOD_IMPORTANCE_WEIGHTS.CENTER * (1 - Math.min(screenDistance / maxScreenDistance, 1))
      score += centerScore
    }

    // 4. SEMANTIC RELEVANCE (when vectors are selected)
    if (selectedVectors.length > 0) {
      let maxSimilarity = 0
      selectedVectors.forEach(selectedName => {
        const selectedData = vectors[selectedName]
        if (selectedData && selectedData.coords) {
          const similarity = cosineSimilarity(vectorData.coords, selectedData.coords)
          maxSimilarity = Math.max(maxSimilarity, Math.abs(similarity))
        }
      })
      const similarityScore = LOD_IMPORTANCE_WEIGHTS.SIMILARITY * maxSimilarity
      score += similarityScore
    }

    // 5. VIEW ANGLE (vectors pointing toward/away from camera are more visible)
    const cameraDirection = new THREE.Vector3()
    this.camera.getWorldDirection(cameraDirection)
    const vectorDirection = vectorPos.clone().normalize()
    const dotProduct = Math.abs(vectorDirection.dot(cameraDirection))
    const angleScore = LOD_IMPORTANCE_WEIGHTS.VIEW_ANGLE * dotProduct
    score += angleScore

    return Math.min(score, 100)
  }

  // ========================================================================
  // VISUAL UPDATES
  // ========================================================================

  /**
   * Update visibility and prominence of all vectors
   */
  updateAllVisibility() {
    if (!this.enabled) {
      // LOD disabled, ensure all vectors at max visibility
      this.resetAllVisibility()
      return
    }

    const cameraPos = this.camera.position.clone()
    const selectedVectors = this.state.getSelectedVectors()
    const isComparisonMode = this.state.isComparisonMode()

    // In comparison mode (2 vectors selected), only show selected labels
    if (isComparisonMode) {
      const vectorNames = this.state.getAllVectorNames()
      vectorNames.forEach(name => {
        const label = this.state.getLabelSprite(name)
        if (label) {
          // Only show labels for selected vectors
          label.visible = selectedVectors.includes(name)
        }
      })
      return // Skip normal LOD processing in comparison mode
    }

    // SPECIAL MODE: Single vector selected - show semantically relevant labels
    if (selectedVectors.length === 1) {
      this.handleSingleVectorSelection(selectedVectors[0])
      return
    }

    // Calculate importance for all vectors
    const importanceMap = new Map()
    const vectorNames = this.state.getAllVectorNames()

    vectorNames.forEach(name => {
      const importance = this.calculateImportance(name, cameraPos, selectedVectors)
      importanceMap.set(name, importance)
    })

    // Apply visual changes based on importance
    vectorNames.forEach(name => {
      const importance = importanceMap.get(name)
      const arrow = this.state.getVectorObject(name)
      const label = this.state.getLabelSprite(name)

      if (arrow && label) {
        this.applyLOD(arrow, label, importance)
      }
    })

    // Handle label collision detection
    this.handleLabelCollisions(importanceMap)
  }

  /**
   * Handle label visibility when exactly 1 vector is selected
   * Shows labels that tell the "story" of the selected vector:
   * - Top 5 most similar vectors
   * - 2-3 opposite (least similar) vectors
   * - 2-3 non-trivial (mid-range similarity) vectors
   * @param {string} selectedVector - The selected vector name
   */
  handleSingleVectorSelection(selectedVector) {
    const selectedData = vectors[selectedVector]
    if (!selectedData || !selectedData.coords) {
      // Fallback to normal mode if selected vector has no data
      const vectorNames = this.state.getAllVectorNames()
      vectorNames.forEach(name => {
        const label = this.state.getLabelSprite(name)
        if (label) label.visible = true
      })
      return
    }

    const vectorNames = this.state.getAllVectorNames()
    const similarities = []

    // Calculate similarity to all other vectors
    vectorNames.forEach(name => {
      if (name === selectedVector) return // Skip self

      const vectorData = vectors[name]
      if (!vectorData || !vectorData.coords) return

      const similarity = cosineSimilarity(selectedData.coords, vectorData.coords)
      similarities.push({ name, similarity })
    })

    // Sort by similarity (descending: most similar first)
    similarities.sort((a, b) => b.similarity - a.similarity)

    // Select labels to show
    const labelsToShow = new Set([selectedVector]) // Always show selected

    // Top 5 most similar
    const topSimilar = similarities.slice(0, 5)
    topSimilar.forEach(item => labelsToShow.add(item.name))

    // Bottom 2-3 opposite (least similar)
    const oppositeCount = Math.min(3, Math.max(2, Math.floor(similarities.length * 0.05)))
    const opposite = similarities.slice(-oppositeCount)
    opposite.forEach(item => labelsToShow.add(item.name))

    // 2-3 non-trivial (mid-range)
    // Define mid-range as the middle third of the sorted array
    const midStart = Math.floor(similarities.length / 3)
    const midEnd = Math.floor(2 * similarities.length / 3)
    const midRange = similarities.slice(midStart, midEnd)

    // Pick 2-3 from mid-range, evenly spaced
    const nonTrivialCount = Math.min(3, Math.max(2, midRange.length))
    const step = Math.max(1, Math.floor(midRange.length / nonTrivialCount))
    for (let i = 0; i < nonTrivialCount && i * step < midRange.length; i++) {
      labelsToShow.add(midRange[i * step].name)
    }

    // Apply visibility
    vectorNames.forEach(name => {
      const label = this.state.getLabelSprite(name)
      if (label) {
        label.visible = labelsToShow.has(name)
      }
    })
  }

  /**
   * Apply LOD visual changes to a vector and its label
   * @param {THREE.Group} vectorGroup - The vector arrow group
   * @param {THREE.Sprite} labelSprite - The label sprite
   * @param {number} importance - Importance score (0-100)
   */
  applyLOD(vectorGroup, labelSprite, importance) {
    // Determine visual tier
    let tier
    if (importance >= LOD_THRESHOLDS.HIGH) {
      tier = 'high'
    } else if (importance >= LOD_THRESHOLDS.MEDIUM) {
      tier = 'medium'
    } else if (importance >= LOD_THRESHOLDS.LOW) {
      tier = 'low'
    } else {
      tier = 'minimal'
    }

    const visualConfig = LOD_VISUAL_SCALES[tier]

    // Calculate adaptive thickness scaling
    const globalThickness = this.calculateGlobalThicknessMultiplier()
    const config = VECTOR_CONFIG.ADAPTIVE_THICKNESS

    // Blend between global and importance-based thickness
    const importanceThickness = 0.7 + (importance / 100) * 0.3  // 0.7 to 1.0
    const finalThickness = globalThickness * (1 - config.IMPORTANCE_WEIGHT) +
                           (globalThickness * importanceThickness) * config.IMPORTANCE_WEIGHT

    // Update vector geometry
    vectorGroup.children.forEach(child => {
      if (child.userData?.isHitbox) return
      if (!child.material) return

      // Adjust opacity (unless it's in comparison mode)
      if (!this.state.isComparisonMode()) {
        const baseOpacity = child.userData?.baseOpacity ?? 1.0
        child.material.opacity = baseOpacity * visualConfig.vectorOpacity
      }

      // Adjust scale for shaft and cone based on adaptive thickness
      if (child.geometry?.type === 'CylinderGeometry') {
        // Store original scale if not stored
        if (!child.userData.baseScaleX) {
          child.userData.baseScaleX = child.scale.x
          child.userData.baseScaleZ = child.scale.z
        }
        // Calculate target scale
        const targetScaleX = child.userData.baseScaleX * finalThickness
        const targetScaleZ = child.userData.baseScaleZ * finalThickness

        // Smooth transition with lerp
        const lerpFactor = 0.15  // Adjust for smoother/snappier transitions
        child.scale.x = child.scale.x + (targetScaleX - child.scale.x) * lerpFactor
        child.scale.z = child.scale.z + (targetScaleZ - child.scale.z) * lerpFactor
      } else if (child.geometry?.type === 'ConeGeometry') {
        // Store original scale if not stored
        if (!child.userData.baseScale) {
          child.userData.baseScale = child.scale.x
        }
        // Calculate target scale
        const targetScale = child.userData.baseScale * visualConfig.coneScale * finalThickness

        // Smooth transition with lerp
        const lerpFactor = 0.15
        const currentScale = child.scale.x
        child.scale.setScalar(currentScale + (targetScale - currentScale) * lerpFactor)
      } else if (child.geometry?.type === 'RingGeometry') {
        // Base glow - smooth transition
        const targetScale = finalThickness
        const lerpFactor = 0.15
        const currentScale = child.scale.x
        child.scale.setScalar(currentScale + (targetScale - currentScale) * lerpFactor)
      }
    })

    // Update label
    if (!labelSprite.userData) labelSprite.userData = {}

    // Get adaptive label scale based on vector count
    const adaptiveLabelScale = this.calculateAdaptiveLabelScale()

    // Store LOD-controlled visibility separate from selection state
    labelSprite.userData.lodOpacity = visualConfig.labelOpacity
    labelSprite.userData.lodScale = visualConfig.labelScale * adaptiveLabelScale

    // Apply adaptive scaling to all labels (even selected ones)
    const baseScale = labelSprite.userData.baseScale || new THREE.Vector3(1.8, 0.6, 1)

    // Apply scale differently based on selection state
    let targetScale
    if (this.state.isComparisonMode() || this.state.isSelected(labelSprite.userData.name)) {
      // Selected labels get adaptive scale but maintain their selection multiplier
      const selectionScale = this.state.isComparisonMode() ? 0.8 : 1.15  // From LABEL_CONFIG
      targetScale = selectionScale * adaptiveLabelScale
    } else {
      // Non-selected labels get LOD scale * adaptive scale
      labelSprite.material.opacity = visualConfig.labelOpacity
      targetScale = visualConfig.labelScale * adaptiveLabelScale
    }

    // Smooth transition with lerp
    const lerpFactor = 0.15
    const currentScaleMultiplier = labelSprite.scale.x / baseScale.x  // Get current multiplier
    const newScaleMultiplier = currentScaleMultiplier + (targetScale - currentScaleMultiplier) * lerpFactor
    labelSprite.scale.copy(baseScale).multiplyScalar(newScaleMultiplier)
  }

  /**
   * Handle label collision detection to prevent overlap
   * @param {Map<string, number>} importanceMap - Map of vector names to importance scores
   */
  handleLabelCollisions(importanceMap) {
    // Sort labels by importance (descending)
    const sortedLabels = Array.from(importanceMap.entries())
      .sort((a, b) => b[1] - a[1]) // Sort by importance, highest first
      .map(([name]) => ({
        name,
        sprite: this.state.getLabelSprite(name),
        importance: importanceMap.get(name)
      }))
      .filter(item => item.sprite && item.importance >= LOD_THRESHOLDS.MINIMAL)

    const visibleLabels = []
    const occupiedRects = []

    for (const item of sortedLabels) {
      const screenPos = this.getScreenPosition(item.sprite.position)

      if (!screenPos || screenPos.z > 1 || screenPos.z < 0) {
        // Behind camera or outside view frustum
        item.sprite.visible = false
        continue
      }

      // Calculate label bounding box
      const bounds = this.getLabelBounds(item.sprite, screenPos)

      // Check collision with existing labels
      const hasCollision = occupiedRects.some(rect => this.rectsOverlap(bounds, rect))

      if (!hasCollision && visibleLabels.length < this.maxLabels) {
        // No collision, show label
        item.sprite.visible = true
        visibleLabels.push(item)
        occupiedRects.push(bounds)
      } else {
        // Collision or max labels reached, hide label
        item.sprite.visible = false
      }
    }
  }

  /**
   * Get screen position for a 3D point
   * @param {THREE.Vector3} position - 3D position
   * @returns {{x: number, y: number, z: number}|null} Screen position with depth
   */
  getScreenPosition(position) {
    const vector = position.clone()
    vector.project(this.camera)

    // Check if behind camera
    if (vector.z > 1 || vector.z < -1) {
      return null
    }

    const x = (vector.x * 0.5 + 0.5) * window.innerWidth
    const y = (-(vector.y * 0.5) + 0.5) * window.innerHeight
    const z = vector.z

    return { x, y, z }
  }

  /**
   * Get label bounding rectangle in screen space
   * @param {THREE.Sprite} label - Label sprite
   * @param {{x: number, y: number}} screenPos - Screen position
   * @returns {{x: number, y: number, width: number, height: number}} Bounding rect
   */
  getLabelBounds(label, screenPos) {
    const text = label.userData?.name || ''
    const scale = label.scale.x

    // Estimate label size based on text length and scale
    const charWidth = 8 // Approximate character width in pixels
    const charHeight = 16 // Approximate character height in pixels
    const width = (text.length * charWidth * scale) + LOD_CONFIG.LABEL_COLLISION_PADDING
    const height = (charHeight * scale) + LOD_CONFIG.LABEL_COLLISION_PADDING

    return {
      x: screenPos.x - width / 2,
      y: screenPos.y - height / 2,
      width,
      height
    }
  }

  /**
   * Check if two rectangles overlap
   * @param {{x, y, width, height}} rect1
   * @param {{x, y, width, height}} rect2
   * @returns {boolean}
   */
  rectsOverlap(rect1, rect2) {
    return !(
      rect1.x + rect1.width < rect2.x ||
      rect2.x + rect2.width < rect1.x ||
      rect1.y + rect1.height < rect2.y ||
      rect2.y + rect2.height < rect1.y
    )
  }

  /**
   * Reset all vectors to full visibility (disable LOD)
   */
  resetAllVisibility() {
    this.state.getAllVectorNames().forEach(name => {
      const arrow = this.state.getVectorObject(name)
      const label = this.state.getLabelSprite(name)

      if (arrow) {
        arrow.children.forEach(child => {
          if (child.userData?.isHitbox || !child.material) return
          const baseOpacity = child.userData?.baseOpacity ?? 1.0
          child.material.opacity = baseOpacity
          if (child.geometry?.type === 'ConeGeometry') {
            child.scale.setScalar(1.0)
          }
        })
      }

      if (label) {
        label.visible = true
        if (!this.state.isComparisonMode() && !this.state.isSelected(name)) {
          label.material.opacity = 1.0
          const baseScale = label.userData.baseScale || new THREE.Vector3(1, 1, 1)
          label.scale.copy(baseScale)
        }
      }
    })
  }

  // ========================================================================
  // UPDATE MANAGEMENT (with debouncing)
  // ========================================================================

  /**
   * Request an LOD update (debounced)
   */
  requestUpdate() {
    if (this.updateTimeout) {
      clearTimeout(this.updateTimeout)
    }

    this.updateTimeout = setTimeout(() => {
      this.updateAllVisibility()
      this.lastUpdateTime = Date.now()
    }, this.updateDebounceMs)
  }

  /**
   * Force immediate update (bypass debounce)
   */
  forceUpdate() {
    if (this.updateTimeout) {
      clearTimeout(this.updateTimeout)
    }
    this.updateAllVisibility()
    this.lastUpdateTime = Date.now()
  }

  // ========================================================================
  // PUBLIC CONTROLS
  // ========================================================================

  /**
   * Enable or disable LOD system
   * @param {boolean} enabled
   */
  setEnabled(enabled) {
    this.enabled = enabled
    if (enabled) {
      this.forceUpdate()
    } else {
      this.resetAllVisibility()
    }
  }

  /**
   * Set maximum number of visible labels
   * @param {number} count
   */
  setMaxLabels(count) {
    this.maxLabels = Math.max(1, Math.min(count, 50))
    if (this.enabled) {
      this.forceUpdate()
    }
  }

  /**
   * Get current enabled state
   * @returns {boolean}
   */
  isEnabled() {
    return this.enabled
  }

  /**
   * Get current max labels setting
   * @returns {number}
   */
  getMaxLabels() {
    return this.maxLabels
  }
}
