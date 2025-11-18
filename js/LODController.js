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
  LOD_VISUAL_SCALES
} from './constants.js'

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

    // Update vector geometry
    vectorGroup.children.forEach(child => {
      if (child.userData?.isHitbox) return
      if (!child.material) return

      // Adjust opacity (unless it's in comparison mode)
      if (!this.state.isComparisonMode()) {
        const baseOpacity = child.userData?.baseOpacity ?? 1.0
        child.material.opacity = baseOpacity * visualConfig.vectorOpacity
      }

      // Adjust scale (primarily for cone/arrowhead)
      if (child.geometry?.type === 'ConeGeometry') {
        child.scale.setScalar(visualConfig.coneScale)
      }
    })

    // Update label
    if (!labelSprite.userData) labelSprite.userData = {}

    // Store LOD-controlled visibility separate from selection state
    labelSprite.userData.lodOpacity = visualConfig.labelOpacity
    labelSprite.userData.lodScale = visualConfig.labelScale

    // Only apply if not in selection mode
    if (!this.state.isComparisonMode() && !this.state.isSelected(labelSprite.userData.name)) {
      labelSprite.material.opacity = visualConfig.labelOpacity

      const baseScale = labelSprite.userData.baseScale || new THREE.Vector3(1, 1, 1)
      labelSprite.scale.copy(baseScale).multiplyScalar(visualConfig.labelScale)
    }
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
