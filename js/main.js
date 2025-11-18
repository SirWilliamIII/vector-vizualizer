/**
 * Vector Similarity Explorer - Main Entry Point
 *
 * This file orchestrates the application by:
 * - Initializing all managers and controllers
 * - Setting up the initial scene with vectors
 * - Running the intro animation sequence
 * - Starting the rendering loop
 * - Exposing global functions for UI controls
 *
 * Architecture:
 * - SceneManager: Three.js scene, camera, renderer setup
 * - StateManager: Centralized application state
 * - AnimationController: All animation logic
 * - CameraController: Camera movements and positioning
 * - VectorManager: Vector CRUD operations
 * - InteractionHandler: Mouse/keyboard interactions
 */

import * as THREE from 'three'
import { vectors, originalEmbeddings } from './vector-data.js'
import { pcaTo3D } from './math-utils.js'
import { mapRange, clamp } from './math-utils.js'
import { showStatus, clearStatus, updateInfoPanel } from './ui.js'
import { OnboardingTour, injectOnboardingStyles } from './onboarding.js'
import { initMobileTooltips, pulseHelpIcons, injectMobileTooltipStyles } from './tooltip-mobile.js'
import { handleBatchUpload as batchUploadHandler } from './batch-upload.js'

// Import managers and controllers
import { StateManager } from './StateManager.js'
import { SceneManager } from './SceneManager.js'
import { AnimationController } from './AnimationController.js'
import { CameraController } from './CameraController.js'
import { VectorManager } from './VectorManager.js'
import { InteractionHandler } from './InteractionHandler.js'
import { LODController } from './LODController.js'

import {
  STATUS_CONFIG,
  INTRO_CONFIG,
  EXPORT_CONFIG,
  PROMINENCE_CONFIG
} from './constants.js'

// ========================================================================
// INITIALIZATION
// ========================================================================

console.log('Initializing Vector Similarity Explorer...')

// Initialize managers and controllers
const state = new StateManager()
const sceneManager = new SceneManager('canvas-container')
const animator = new AnimationController(state)
const cameraController = new CameraController(
  sceneManager.camera,
  sceneManager.controls,
  state,
  animator
)
const vectorManager = new VectorManager(sceneManager.scene, state)
const interactionHandler = new InteractionHandler(
  sceneManager,
  state,
  animator,
  cameraController,
  vectorManager
)
const lodController = new LODController(
  sceneManager.camera,
  sceneManager.renderer,
  state
)

// ========================================================================
// INITIAL VECTOR SETUP
// ========================================================================

console.log('Computing 3D coordinates from embeddings...')
const projected3D = pcaTo3D(originalEmbeddings)
if (projected3D && projected3D.length > 0) {
  const nonNullWords = Object.keys(originalEmbeddings).filter(w => originalEmbeddings[w] !== null)
  nonNullWords.forEach((w, i) => {
    if (vectors[w]) {
      vectors[w].coords = projected3D[i]
    }
  })
}

// Create initial vector visualizations
vectorManager.initializeVectors(vectors)

// ========================================================================
// LOD SYSTEM EVENT LISTENERS
// ========================================================================

// Update LOD on camera movement (debounced)
sceneManager.controls.addEventListener('change', () => {
  lodController.requestUpdate()
})

// Update LOD on selection changes
state.on('selectionChanged', () => {
  lodController.forceUpdate()
})

// ========================================================================
// RENDERING LOOP
// ========================================================================

function animate() {
  requestAnimationFrame(animate)
  sceneManager.controls.update()

  // Distance-based prominence for vectors and labels
  const cameraPosition = sceneManager.camera.position.clone()
  const cameraDirection = new THREE.Vector3()
  sceneManager.camera.getWorldDirection(cameraDirection)
  const cameraUpVec = sceneManager.camera.up.clone().normalize()
  const cameraRightVec = new THREE.Vector3().crossVectors(cameraDirection, cameraUpVec).normalize()
  if (cameraRightVec.lengthSq() < 1e-4) {
    cameraRightVec.set(1, 0, 0)
  }

  // Update vector arrow prominence
  state.getVectorGroups().forEach((arrow) => {
    if (!arrow.userData.coords) return
    const tipPosition = new THREE.Vector3(...arrow.userData.coords)
    const distance = cameraPosition.distanceTo(tipPosition)
    const thicknessScale = clamp(mapRange(distance, 4, 20, 1.2, 0.45), 0.45, 1.2)
    const opacityFactor = clamp(mapRange(distance, 5, 18, 1.0, 0.3), 0.3, 1.0)

    arrow.children.forEach((child) => {
      if (child.userData?.isHitbox) return

      if (child.userData?.baseScale) {
        const base = child.userData.baseScale
        if (child.userData.part === 'shaft' || child.userData.part === 'glow') {
          child.scale.set(base.x * thicknessScale, base.y, base.z * thicknessScale)
        } else if (child.userData.part === 'cone') {
          const heightScale = 0.85 + thicknessScale * 0.3
          child.scale.set(base.x * thicknessScale, base.y * heightScale, base.z * thicknessScale)
        } else if (child.userData.part === 'baseGlow') {
          child.scale.set(base.x * thicknessScale * 1.1, base.y, base.z * thicknessScale * 1.1)
        }
      }

      if (child.material && child.userData?.baseOpacity !== undefined) {
        child.material.opacity = child.userData.baseOpacity * opacityFactor
        child.material.transparent = true
      }
    })
  })

  // Update label sprite prominence and positioning
  state.getLabelSprites().forEach((sprite) => {
    if (!sprite.userData) return
    if (!sprite.userData.basePosition) {
      sprite.userData.basePosition = sprite.position.clone()
    }

    const basePos = sprite.userData.basePosition.clone()
    const distance = cameraPosition.distanceTo(basePos)
    const toCamera = new THREE.Vector3().subVectors(cameraPosition, basePos).normalize()
    const lateral = new THREE.Vector3().crossVectors(cameraUpVec, toCamera).normalize()
    if (lateral.lengthSq() < 1e-4) {
      lateral.copy(cameraRightVec)
    }
    const upDir = new THREE.Vector3().crossVectors(toCamera, lateral).normalize()
    const lateralOffset = clamp(mapRange(distance, 3, 18, 0.35, 0.08), 0.08, 0.35)
    const verticalOffset = lateralOffset * 0.35
    const offsetSign = sprite.userData.offsetSeed || Math.sign(basePos.x) || 1
    const finalPos = basePos
      .clone()
      .add(lateral.multiplyScalar(lateralOffset * offsetSign))
      .add(upDir.multiplyScalar(verticalOffset))
    sprite.position.copy(finalPos)

    const opacity = clamp(mapRange(distance, 5, 18, 1.0, 0.25), 0.25, 1.0)
    const scaleFactor = clamp(mapRange(distance, 4, 20, 1.2, 0.45), 0.45, 1.2)
    const hoverBoost = sprite.userData.isHovered ? 1.1 : 1
    const baseScale = sprite.userData.baseScale || new THREE.Vector3(2, 1, 1)

    if (sprite.material) {
      sprite.material.opacity = Math.min(1, opacity * (sprite.userData.isHovered ? 1.1 : 1))
    }
    sprite.scale.set(
      baseScale.x * scaleFactor * hoverBoost,
      baseScale.y * scaleFactor * hoverBoost,
      baseScale.z
    )
  })

  // Depth-based scaling for annotation sprites
  state.getAnnotations().forEach((annotation) => {
    if (!annotation.traverse) return
    annotation.traverse((child) => {
      if (child.userData?.depthResponsive) {
        const worldPos = child.getWorldPosition(new THREE.Vector3())
        const distance = cameraPosition.distanceTo(worldPos)
        const opacity = clamp(mapRange(distance, 4, 18, 1.0, 0.35), 0.35, 1.0)
        const scaleFactor = clamp(mapRange(distance, 4, 20, 1.15, 0.55), 0.55, 1.15)
        const baseScale = child.userData.baseScale || new THREE.Vector3(1, 1, 1)
        child.scale.set(
          baseScale.x * scaleFactor,
          baseScale.y * scaleFactor,
          baseScale.z * scaleFactor
        )
        if (child.material && child.userData.baseOpacity !== undefined) {
          child.material.opacity = child.userData.baseOpacity * opacity
          child.material.transparent = true
        }
      }
    })
  })

  // Animate connection lines
  state.getConnectionLines().forEach((line) => {
    if (line.userData && line.userData.isAnimated) {
      const mat = line.userData.animatedMaterial || line.material
      if (mat && mat.uniforms && mat.uniforms.time) {
        mat.uniforms.time.value += 0.016
      }
    }
  })

  sceneManager.render()
}

// ========================================================================
// INTRO ANIMATION SEQUENCE
// ========================================================================

function runIntroSequence() {
  // Disable OrbitControls during intro
  sceneManager.controls.enabled = false

  // Emergence sequence with narrative timing
  const emergenceSequence = [
    { word: 'king', start: 0, duration: 700, featured: true },
    { word: 'queen', start: 600, duration: 700, featured: true },
    { word: 'man', start: 1500, duration: 600, featured: true },
    { word: 'woman', start: 2000, duration: 600, featured: true },
    { word: 'dog', start: 2700, duration: 500, featured: true },
    { word: 'cat', start: 3100, duration: 500, featured: true },
    { word: 'bird', start: 3500, duration: 500, featured: false },
    { word: 'happy', start: 4000, duration: 400, featured: true },
    { word: 'sad', start: 4300, duration: 400, featured: true },
    { word: 'angry', start: 4600, duration: 400, featured: false },
    { word: 'computer', start: 5000, duration: 350, featured: true },
    { word: 'code', start: 5300, duration: 350, featured: true },
    { word: 'tree', start: 5650, duration: 300, featured: false },
    { word: 'ocean', start: 5900, duration: 300, featured: false },
  ]

  let introActive = true
  const startTime = Date.now()

  // Initially hide all vectors at scale 0
  state.getVectorGroups().forEach(obj => obj.scale.set(0, 0, 0))
  state.getLabelSprites().forEach(sprite => sprite.scale.set(0, 0, 0))

  function cancelIntro() {
    if (!introActive) return
    introActive = false
    sceneManager.controls.enabled = true

    // Instantly show all vectors at full scale
    emergenceSequence.forEach(({ word, featured }) => {
      const arrow = state.getVectorObject(word)
      const label = state.getLabelSprite(word)

      if (arrow) {
        arrow.scale.set(1, 1, 1)
        arrow.traverse(child => {
          if (child.material) {
            child.material.opacity = featured ? INTRO_CONFIG.FEATURED_OPACITY : INTRO_CONFIG.NON_FEATURED_OPACITY
          }
        })
      }

      if (label) {
        label.scale.set(1.6, 0.8, 1)
        label.material.opacity = featured ? INTRO_CONFIG.FEATURED_LABEL_OPACITY : INTRO_CONFIG.NON_FEATURED_LABEL_OPACITY
      }
    })

    window.removeEventListener('click', cancelIntro)
    window.removeEventListener('keydown', cancelIntro)
    window.removeEventListener('wheel', cancelIntro)
  }

  // Skip intro on user interaction
  window.addEventListener('click', cancelIntro, { once: true })
  window.addEventListener('keydown', cancelIntro, { once: true })
  window.addEventListener('wheel', cancelIntro, { once: true })

  function animateVectors() {
    if (!introActive) return

    const elapsed = Date.now() - startTime

    emergenceSequence.forEach(({ word, start, duration, featured }) => {
      const vectorElapsed = elapsed - start

      if (vectorElapsed > 0) {
        const progress = Math.min(vectorElapsed / duration, 1)
        const eased = AnimationController.easeOutBack(progress)
        const scale = eased

        const targetOpacity = featured ? INTRO_CONFIG.FEATURED_OPACITY : INTRO_CONFIG.NON_FEATURED_OPACITY
        const targetLabelOpacity = featured ? INTRO_CONFIG.FEATURED_LABEL_OPACITY : INTRO_CONFIG.NON_FEATURED_LABEL_OPACITY

        const arrow = state.getVectorObject(word)
        const label = state.getLabelSprite(word)

        if (arrow) {
          arrow.scale.set(scale, scale, scale)
          arrow.traverse(child => {
            if (child.material) {
              child.material.opacity = targetOpacity * progress
            }
          })
        }

        if (label) {
          const labelScale = 1.6 * eased
          label.scale.set(labelScale, labelScale * 0.5, 1)
          label.material.opacity = targetLabelOpacity * progress
        }
      }
    })

    // Check if animation is complete
    const lastVector = emergenceSequence[emergenceSequence.length - 1]
    const totalDuration = lastVector.start + lastVector.duration

    if (elapsed < totalDuration) {
      requestAnimationFrame(animateVectors)
    } else {
      sceneManager.controls.enabled = true
      introActive = false
    }
  }

  animateVectors()
}

// ========================================================================
// GLOBAL FUNCTIONS (UI CONTROLS)
// ========================================================================

window.resetView = function () {
  cameraController.resetToDefault()
}

window.clearSelection = function () {
  interactionHandler.clearSelection()
}

window.addCustomVector = async function () {
  const input = document.getElementById('word-input')
  const modelSelect = document.getElementById('model-select')
  const word = input ? input.value.trim().toLowerCase() : ''
  const selectedModel = modelSelect ? modelSelect.value : 'minilm'

  if (!word || !input) {
    showStatus('Please enter a word', 'error')
    setTimeout(() => clearStatus(), STATUS_CONFIG.ERROR_TIMEOUT_MS)
    return
  }

  const addBtn = document.querySelector('.add-btn')
  if (addBtn) addBtn.disabled = true

  try {
    await vectorManager.addVector(word, selectedModel)
    interactionHandler.updateSelection()
    lodController.forceUpdate()
    if (input) input.value = ''
  } catch (error) {
    console.error('Error adding vector:', error)
    showStatus(`Error: ${error.message}`, 'error')
    setTimeout(() => clearStatus(), STATUS_CONFIG.LONG_SUCCESS_TIMEOUT_MS)
  } finally {
    if (addBtn) addBtn.disabled = false
  }
}

window.clearCustomVectors = function () {
  const count = vectorManager.clearCustomVectors()

  if (count === 0) {
    showStatus('No custom vectors to clear', 'error')
    setTimeout(() => clearStatus(), STATUS_CONFIG.ERROR_TIMEOUT_MS)
    return
  }

  interactionHandler.updateSelection()
  updateInfoPanel(state.getSelectedVectors())
  lodController.forceUpdate()

  showStatus(`Cleared ${count} custom vector(s)`, 'success')
  setTimeout(() => clearStatus(), STATUS_CONFIG.ERROR_TIMEOUT_MS)
}

window.startFresh = function () {
  const count = vectorManager.getVectorCount()
  if (count > 0) {
    const confirmed = confirm(`Clear all ${count} vectors and start fresh?`)
    if (!confirmed) return
  }

  vectorManager.clearAllVectors()
  state.clearSelection()
  updateInfoPanel([])
  lodController.forceUpdate()

  showStatus('Canvas cleared! Add your first word below.', 'success')
  setTimeout(() => clearStatus(), STATUS_CONFIG.SUCCESS_TIMEOUT_MS)
}

window.handleBatchUpload = async function (event) {
  const modelSelect = document.getElementById('model-select')
  const selectedModel = modelSelect ? modelSelect.value : 'minilm'

  await batchUploadHandler(event, selectedModel)
}

window.exportVisual = function () {
  const timestamp = new Date().toISOString().slice(0, 19).replace(/:/g, '-')
  const filename = `vector-viz-${timestamp}.png`

  sceneManager.renderer.render(sceneManager.scene, sceneManager.camera)

  sceneManager.renderer.domElement.toBlob((blob) => {
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = filename
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)

    showStatus('Image exported successfully!', 'success')
    setTimeout(() => clearStatus(), STATUS_CONFIG.ERROR_TIMEOUT_MS)
  }, EXPORT_CONFIG.FORMAT)
}

// ========================================================================
// MODEL SWITCHING
// ========================================================================

async function switchModel(newModelKey) {
  const modelSelect = document.getElementById('model-select')

  // Show loading overlay
  const canvasContainer = document.getElementById('canvas-container')
  const overlay = document.createElement('div')
  overlay.className = 'canvas-overlay'
  overlay.innerHTML = `
    <div class="loading-spinner"></div>
    <p style="color: var(--text-primary); font-size: var(--text-lg); margin-top: var(--space-lg);">
      Switching model...
    </p>
  `
  if (canvasContainer) canvasContainer.appendChild(overlay)
  if (modelSelect) modelSelect.disabled = true

  try {
    await vectorManager.switchModel(newModelKey)
    interactionHandler.clearSelection()
    updateInfoPanel([])

    // Remove overlay
    overlay.classList.add('fade-out')
    setTimeout(() => overlay.remove(), 300)
  } catch (error) {
    console.error('Error switching model:', error)
    showStatus(`Error switching model: ${error.message}`, 'error')
    setTimeout(() => clearStatus(), STATUS_CONFIG.LONG_SUCCESS_TIMEOUT_MS)
    const existingOverlay = document.querySelector('.canvas-overlay')
    if (existingOverlay) existingOverlay.remove()
  } finally {
    if (modelSelect) modelSelect.disabled = false
  }
}

// ========================================================================
// UI EVENT HANDLERS
// ========================================================================

document.addEventListener('DOMContentLoaded', () => {
  const input = document.getElementById('word-input')
  if (input) {
    input.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        window.addCustomVector()
      }
    })
  }
})

const helpBtn = document.getElementById('help-tour-btn')
if (helpBtn) {
  helpBtn.addEventListener('click', () => tour.restart())
}

const modelSelect = document.getElementById('model-select')
if (modelSelect) {
  modelSelect.addEventListener('change', (e) => {
    switchModel(e.target.value)
  })
}

// Batch upload completion handler
window.addEventListener('batchUploadComplete', async () => {
  // Recreate all visualizations after batch upload
  await vectorManager.recreateAllVisualizations()
  interactionHandler.updateSelection()
  lodController.forceUpdate()
})

// ========================================================================
// LOD CONTROL FUNCTIONS
// ========================================================================

window.toggleLOD = function(enabled) {
  lodController.setEnabled(enabled)
}

window.setMaxLabels = function(count) {
  lodController.setMaxLabels(count)
}

// ========================================================================
// ONBOARDING TOUR
// ========================================================================

injectOnboardingStyles()
const tour = new OnboardingTour()
injectMobileTooltipStyles()
initMobileTooltips(() => {
  pulseHelpIcons()
})

window.startTour = () => tour.restart()

// ========================================================================
// START APPLICATION
// ========================================================================

runIntroSequence()
animate()

console.log('Vector Similarity Explorer initialized successfully!')
