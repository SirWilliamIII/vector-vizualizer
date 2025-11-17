/**
 * InteractionHandler - User Interaction Management
 *
 * Handles all user interactions including:
 * - Mouse movement (hover detection)
 * - Mouse clicks (selection)
 * - Keyboard shortcuts
 * - Selection state updates
 * - Comparison mode visualization
 *
 * Benefits:
 * - Centralizes interaction logic
 * - Separates input handling from business logic
 * - Easier to test interactions
 * - Clear event flow
 */

import * as THREE from 'three'
import { vectors } from './vector-data.js'
import { cosineSimilarity, euclideanDistance, clamp } from './math-utils.js'
import {
  createConnectionLine,
  createAngleArc,
  createDistanceAnnotation,
  createComparisonPlate,
  createTipBadge
} from './three-helpers.js'
import { updateInfoPanel } from './ui.js'
import { VECTOR_VISUAL_STATE, COMPARISON_CONFIG, LABEL_CONFIG } from './constants.js'

export class InteractionHandler {
  constructor(sceneManager, stateManager, animationController, cameraController) {
    this.sceneManager = sceneManager
    this.state = stateManager
    this.animator = animationController
    this.cameraController = cameraController

    this.setupEventListeners()
  }

  // ========================================================================
  // EVENT LISTENERS
  // ========================================================================

  setupEventListeners() {
    window.addEventListener('mousemove', (e) => this.onMouseMove(e))
    window.addEventListener('click', (e) => this.onMouseClick(e))
    window.addEventListener('keydown', (e) => this.onKeyDown(e))
  }

  // ========================================================================
  // MOUSE INTERACTIONS
  // ========================================================================

  onMouseMove(event) {
    this.sceneManager.updatePointerFromEvent(event)

    const meshIntersects = this.sceneManager.getIntersections(this.state.getVectorMeshes())
    const labelIntersects = this.sceneManager.getIntersections(this.state.getLabelSprites())

    const lastHovered = this.state.getHoveredVector()

    // Reset all meshes to default state
    this.state.getVectorGroups().forEach((arrow) => {
      if (!arrow.userData) return
      const name = arrow.userData.name
      if (this.state.isSelected(name) || name === lastHovered) return

      arrow.children.forEach((child) => {
        if (!child.material || child.userData?.isHitbox) return
        child.material.emissiveIntensity = 0.25
        if (child.userData?.baseOpacity !== undefined) {
          child.material.opacity = child.userData.baseOpacity
        }
      })
    })

    // Reset all labels hover state
    this.state.getLabelSprites().forEach((label) => {
      if (this.state.isSelected(label.userData.name)) return
      label.userData.isHovered = false
    })

    // Handle mesh hover
    if (meshIntersects.length > 0) {
      const mesh = meshIntersects[0].object
      const name = mesh.userData.name
      if (!this.state.isSelected(name)) {
        this.state.setHoveredVector(name)
        this.highlightVector(name)
      }
      document.body.style.cursor = 'pointer'
    }
    // Handle label hover
    else if (labelIntersects.length > 0) {
      const label = labelIntersects[0].object
      const name = label.userData.name
      if (!this.state.isSelected(name)) {
        this.state.setHoveredVector(name)
        label.userData.isHovered = true
        this.highlightVector(name)
      }
      document.body.style.cursor = 'pointer'
    } else {
      document.body.style.cursor = 'default'
      this.state.clearHover()
    }
  }

  onMouseClick(event) {
    this.sceneManager.updatePointerFromEvent(event)

    const meshIntersects = this.sceneManager.getIntersections(this.state.getVectorMeshes())
    const labelIntersects = this.sceneManager.getIntersections(this.state.getLabelSprites())

    let name = null

    // Check mesh intersections first, then label intersections
    if (meshIntersects.length > 0) {
      name = meshIntersects[0].object.userData.name
    } else if (labelIntersects.length > 0) {
      name = labelIntersects[0].object.userData.name
    }

    if (!name && this.state.getHoveredVector()) {
      name = this.state.getHoveredVector()
    }

    if (name) {
      // Clicked on a vector or label
      this.state.selectVector(name)
      this.updateSelection()
    } else {
      // Clicked empty space
      if (this.state.isComparisonMode()) {
        // If 2 vectors are selected (comparison mode), clicking empty space resets everything
        this.state.clearSelection()
        this.cameraController.restoreSavedState()
        this.updateSelection()
      }
    }
  }

  onKeyDown(event) {
    if (event.key === 'Escape' && this.state.hasSelection()) {
      this.state.clearSelection()
      this.cameraController.restoreSavedState()
      this.updateSelection()
    }
  }

  // ========================================================================
  // VISUAL FEEDBACK
  // ========================================================================

  highlightVector(name) {
    const arrow = this.state.getVectorObject(name)
    if (arrow) {
      arrow.children.forEach((child) => {
        if (!child.userData.isHitbox && child.material) {
          child.material.emissiveIntensity = VECTOR_VISUAL_STATE.HOVERED.emissiveIntensity
          if (child.userData?.baseOpacity !== undefined) {
            child.material.opacity = clamp(
              child.userData.baseOpacity * VECTOR_VISUAL_STATE.HOVERED.opacityMultiplier,
              0,
              1
            )
          } else {
            child.material.opacity = 1
          }
        }
      })
    }

    const label = this.state.getLabelSprite(name)
    if (label) {
      label.userData.isHovered = true
    }
  }

  // ========================================================================
  // SELECTION MANAGEMENT
  // ========================================================================

  updateSelection() {
    const selectedVectors = this.state.getSelectedVectors()
    const hasSelection = this.state.hasSelection()
    const twoSelected = this.state.isComparisonMode()

    // Hide/show axes and grid based on comparison mode
    this.sceneManager.setAxesVisible(!twoSelected)

    // Update vector visual states
    this.updateVectorVisuals(hasSelection, twoSelected)

    // Update label visual states
    this.updateLabelVisuals(hasSelection, twoSelected)

    // Clear previous comparison visuals
    this.clearComparisonVisuals()

    // Create comparison visuals if 2 vectors selected
    if (twoSelected) {
      this.createComparisonVisuals(selectedVectors)
    }

    // Update info panel
    updateInfoPanel(selectedVectors)

    // Wire up close button
    this.setupCloseButton()
  }

  updateVectorVisuals(hasSelection, twoSelected) {
    this.state.getVectorMeshes().forEach((mesh) => {
      if (this.state.isSelected(mesh.userData.name)) {
        this.animator.animateVector(mesh, VECTOR_VISUAL_STATE.SELECTED)
      } else if (twoSelected) {
        this.animator.animateVector(mesh, VECTOR_VISUAL_STATE.HIDDEN, 400)
      } else if (hasSelection) {
        this.animator.animateVector(mesh, VECTOR_VISUAL_STATE.FADED)
      } else {
        this.animator.animateVector(mesh, VECTOR_VISUAL_STATE.NORMAL)
      }
    })
  }

  updateLabelVisuals(hasSelection, twoSelected) {
    this.state.getLabelSprites().forEach((label) => {
      let targetOpacity, targetScaleX, targetScaleY, targetVisible

      if (this.state.isSelected(label.userData.name)) {
        targetOpacity = LABEL_CONFIG.OPACITY_SELECTED
        targetScaleX = LABEL_CONFIG.SCALE_SELECTED.x
        targetScaleY = LABEL_CONFIG.SCALE_SELECTED.y
        targetVisible = true
      } else if (twoSelected) {
        targetOpacity = LABEL_CONFIG.OPACITY_HIDDEN
        targetScaleX = LABEL_CONFIG.SCALE_FADED.x
        targetScaleY = LABEL_CONFIG.SCALE_FADED.y
        targetVisible = false
      } else if (hasSelection) {
        targetOpacity = LABEL_CONFIG.OPACITY_FADED
        targetScaleX = LABEL_CONFIG.SCALE_FADED.x
        targetScaleY = LABEL_CONFIG.SCALE_FADED.y
        targetVisible = true
      } else {
        targetOpacity = LABEL_CONFIG.OPACITY_NORMAL
        targetScaleX = LABEL_CONFIG.SCALE_NORMAL.x
        targetScaleY = LABEL_CONFIG.SCALE_NORMAL.y
        targetVisible = true
      }

      this.animator.animateLabel(label, {
        opacity: targetOpacity,
        scaleX: targetScaleX,
        scaleY: targetScaleY,
        visible: targetVisible
      })
    })
  }

  clearComparisonVisuals() {
    this.state.getConnectionLines().forEach((line) => this.sceneManager.remove(line))
    this.state.clearConnectionLines()

    this.state.getAnnotations().forEach((annotation) => this.sceneManager.remove(annotation))
    this.state.clearAnnotations()
  }

  createComparisonVisuals(selectedVectors) {
    const coords1 = vectors[selectedVectors[0]].coords
    const coords2 = vectors[selectedVectors[1]].coords
    const similarityValue = cosineSimilarity(coords1, coords2)
    const similarity = Math.abs(similarityValue)

    // Create comparison plate
    const comparisonPlate = createComparisonPlate(coords1, coords2)
    this.sceneManager.add(comparisonPlate)
    this.state.addAnnotation(comparisonPlate)
    this.animator.softReveal(comparisonPlate)

    // Create tip badges
    const badge1 = createTipBadge(coords1, vectors[selectedVectors[0]].color)
    const badge2 = createTipBadge(coords2, vectors[selectedVectors[1]].color)
    this.sceneManager.add(badge1)
    this.sceneManager.add(badge2)
    this.state.addAnnotation(badge1)
    this.state.addAnnotation(badge2)
    this.animator.softReveal(badge1, 320)
    this.animator.softReveal(badge2, 320)

    // Determine color based on similarity
    const color = similarity > COMPARISON_CONFIG.SIMILARITY_HIGH_THRESHOLD
      ? COMPARISON_CONFIG.COLOR_HIGH_SIMILARITY
      : similarity > COMPARISON_CONFIG.SIMILARITY_MEDIUM_THRESHOLD
        ? COMPARISON_CONFIG.COLOR_MEDIUM_SIMILARITY
        : COMPARISON_CONFIG.COLOR_LOW_SIMILARITY

    // Create connection line
    const line = createConnectionLine(coords1, coords2, color)
    this.sceneManager.add(line)
    this.state.addConnectionLine(line)

    // Calculate angle for arc
    const v1 = new THREE.Vector3(...coords1)
    const v2 = new THREE.Vector3(...coords2)
    const v1Normalized = v1.clone().normalize()
    const v2Normalized = v2.clone().normalize()
    const angleRad = Math.acos(v1Normalized.dot(v2Normalized))
    const angleDeg = angleRad * (180 / Math.PI)

    // Create angle arc
    const angleArc = createAngleArc(coords1, coords2, color, angleDeg)
    this.sceneManager.add(angleArc)
    this.state.addAnnotation(angleArc)

    // Create distance annotation
    const euclideanDist = euclideanDistance(coords1, coords2)
    const distAnnotation = createDistanceAnnotation(coords1, coords2, euclideanDist, 'euclidean', color)
    this.sceneManager.add(distAnnotation)
    this.state.addAnnotation(distAnnotation)

    // Auto-focus camera
    this.cameraController.focusOnVectors(coords1, coords2)
  }

  setupCloseButton() {
    const closeBtn = document.getElementById('close-comparison')
    if (closeBtn) {
      closeBtn.addEventListener('click', () => {
        this.state.clearSelection()
        this.cameraController.restoreSavedState()
        this.updateSelection()
      })
    }
  }

  // ========================================================================
  // PUBLIC METHODS FOR EXTERNAL CONTROL
  // ========================================================================

  /**
   * Clear selection programmatically
   */
  clearSelection() {
    this.state.clearSelection()
    this.clearComparisonVisuals()

    this.state.getVectorMeshes().forEach((mesh) => {
      if (mesh.userData.isHitbox) return
      mesh.material.emissiveIntensity = VECTOR_VISUAL_STATE.NORMAL.emissiveIntensity
      mesh.material.opacity = VECTOR_VISUAL_STATE.NORMAL.opacity
    })

    this.state.getLabelSprites().forEach((label) => {
      label.material.opacity = LABEL_CONFIG.OPACITY_NORMAL
      label.scale.set(LABEL_CONFIG.SCALE_NORMAL.x, LABEL_CONFIG.SCALE_NORMAL.y, LABEL_CONFIG.SCALE_NORMAL.z)
    })

    updateInfoPanel([])
  }
}
