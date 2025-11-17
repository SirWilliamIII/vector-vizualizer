/**
 * AnimationController - Centralized Animation Management
 *
 * Handles all animation logic including:
 * - Vector mesh animations (emissive, opacity)
 * - Label sprite animations (scale, opacity)
 * - Soft reveal effects
 * - Camera movements
 *
 * Benefits:
 * - Single responsibility: animation only
 * - Reusable animation utilities
 * - Centralized easing functions
 * - Better animation lifecycle management
 */

import { ANIMATION_CONFIG, LABEL_CONFIG } from './constants.js'

export class AnimationController {
  constructor(stateManager) {
    this.state = stateManager
    this.activeCameraAnimation = null
  }

  // ========================================================================
  // VECTOR MESH ANIMATIONS
  // ========================================================================

  /**
   * Animate a vector mesh's visual properties
   * @param {THREE.Mesh} mesh - The mesh to animate
   * @param {Object} targetProps - Target properties {emissiveIntensity, opacity, visible}
   * @param {number} duration - Animation duration in milliseconds
   */
  animateVector(mesh, targetProps, duration = ANIMATION_CONFIG.DEFAULT_DURATION_MS) {
    // Skip animation for invisible hitboxes
    if (mesh.userData.isHitbox) {
      return
    }

    const startTime = Date.now()
    const startEmissive = mesh.material.emissiveIntensity
    const startOpacity = mesh.material.opacity
    const animationId = mesh.uuid

    const animate = () => {
      const elapsed = Date.now() - startTime
      const progress = Math.min(elapsed / duration, 1)
      const eased = ANIMATION_CONFIG.EASING.IN_OUT_QUAD(progress)

      mesh.material.emissiveIntensity =
        startEmissive + (targetProps.emissiveIntensity - startEmissive) * eased
      mesh.material.opacity = startOpacity + (targetProps.opacity - startOpacity) * eased

      if (progress < 1) {
        this.state.registerAnimation(animationId, requestAnimationFrame(animate))
      } else {
        this.state.unregisterAnimation(animationId)
        if (targetProps.visible === false) {
          mesh.visible = false
        }
      }
    }

    // Cancel existing animation
    this.state.cancelAnimation(animationId)

    mesh.visible = true // Always visible during animation
    this.state.registerAnimation(animationId, requestAnimationFrame(animate))
  }

  // ========================================================================
  // LABEL SPRITE ANIMATIONS
  // ========================================================================

  /**
   * Animate a label sprite's scale and opacity
   * @param {THREE.Sprite} label - The label sprite to animate
   * @param {Object} targetProps - Target properties {opacity, scaleX, scaleY, visible}
   * @param {number} duration - Animation duration in milliseconds
   */
  animateLabel(label, targetProps, duration = ANIMATION_CONFIG.LABEL_ANIMATION_MS) {
    const startOpacity = label.material.opacity
    const startScaleX = label.scale.x
    const startScaleY = label.scale.y
    const startTime = Date.now()
    const animationId = `label-${label.uuid}`

    const animate = () => {
      const elapsed = Date.now() - startTime
      const progress = Math.min(elapsed / duration, 1)
      const eased = ANIMATION_CONFIG.EASING.IN_OUT_QUAD(progress)

      label.material.opacity = startOpacity + (targetProps.opacity - startOpacity) * eased
      label.scale.set(
        startScaleX + (targetProps.scaleX - startScaleX) * eased,
        startScaleY + (targetProps.scaleY - startScaleY) * eased,
        1
      )

      if (progress < 1) {
        this.state.registerAnimation(animationId, requestAnimationFrame(animate))
      } else {
        this.state.unregisterAnimation(animationId)
        if (!targetProps.visible) {
          label.visible = false
        }
      }
    }

    this.state.cancelAnimation(animationId)
    label.visible = true
    this.state.registerAnimation(animationId, requestAnimationFrame(animate))
  }

  // ========================================================================
  // SOFT REVEAL EFFECT
  // ========================================================================

  /**
   * Soft reveal animation with scale and opacity fade-in
   * @param {THREE.Object3D} object - The object to reveal
   * @param {number} duration - Animation duration in milliseconds
   */
  softReveal(object, duration = ANIMATION_CONFIG.REVEAL_DURATION_MS) {
    if (!object) return

    const startScale = object.scale.clone()
    const hiddenScale = startScale.clone().multiplyScalar(0.05)
    object.scale.copy(hiddenScale)

    const materialTargets = []
    const registerMaterial = (mat) => {
      if (!mat || mat.__softRevealRegistered) return
      mat.__softRevealRegistered = true

      if (mat.opacity !== undefined) {
        const targetOpacity = mat.opacity
        mat.opacity = 0
        materialTargets.push({ mat, target: targetOpacity })
      }
    }

    if (object.material) {
      registerMaterial(object.material)
    }

    if (object.traverse) {
      object.traverse((child) => {
        if (child.material) registerMaterial(child.material)
      })
    }

    const startTime = performance.now()

    const animate = () => {
      const progress = Math.min((performance.now() - startTime) / duration, 1)
      const eased = ANIMATION_CONFIG.EASING.IN_OUT_QUAD(progress)

      object.scale.lerpVectors(hiddenScale, startScale, eased)
      materialTargets.forEach(({ mat, target }) => {
        if (typeof target === 'number') {
          mat.opacity = target * eased
        }
      })

      if (progress < 1) {
        requestAnimationFrame(animate)
      } else {
        materialTargets.forEach(({ mat }) => {
          delete mat.__softRevealRegistered
        })
      }
    }

    requestAnimationFrame(animate)
  }

  // ========================================================================
  // CAMERA ANIMATIONS
  // ========================================================================

  /**
   * Animate camera to a new position and target
   * @param {THREE.Camera} camera - The camera to animate
   * @param {THREE.OrbitControls} controls - The orbit controls
   * @param {THREE.Vector3} targetPosition - Target camera position
   * @param {THREE.Vector3} targetLookAt - Target look-at point
   * @param {number} duration - Animation duration in milliseconds
   * @param {Function} onComplete - Callback when animation completes
   */
  animateCamera(camera, controls, targetPosition, targetLookAt, duration, onComplete = null) {
    const startPos = camera.position.clone()
    const startTarget = controls.target.clone()
    const startTime = Date.now()

    const animate = () => {
      const elapsed = Date.now() - startTime
      const progress = Math.min(elapsed / duration, 1)
      const eased = ANIMATION_CONFIG.EASING.IN_OUT_CUBIC(progress)

      camera.position.lerpVectors(startPos, targetPosition, eased)
      controls.target.lerpVectors(startTarget, targetLookAt, eased)
      controls.update() // Required: sync OrbitControls state when manually animating camera

      if (progress < 1) {
        this.activeCameraAnimation = requestAnimationFrame(animate)
      } else {
        this.activeCameraAnimation = null
        if (onComplete) {
          onComplete()
        }
      }
    }

    // Cancel any existing camera animation
    if (this.activeCameraAnimation) {
      cancelAnimationFrame(this.activeCameraAnimation)
      this.activeCameraAnimation = null
    }

    animate()
  }

  // ========================================================================
  // INTRO ANIMATION HELPERS
  // ========================================================================

  /**
   * Ease-out-back function for intro animations (bounce effect)
   * @param {number} t - Progress [0-1]
   * @returns {number} Eased value
   */
  static easeOutBack(t) {
    const c1 = 1.70158
    const c3 = c1 + 1
    return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2)
  }

  // ========================================================================
  // UTILITY METHODS
  // ========================================================================

  /**
   * Cancel all active animations
   */
  cancelAll() {
    this.state.cancelAllAnimations()
  }

  /**
   * Check if an animation is currently running
   * @param {string} animationId - The animation ID
   * @returns {boolean}
   */
  isAnimating(animationId) {
    return this.state.hasAnimation(animationId)
  }

  /**
   * Get count of active animations
   * @returns {number}
   */
  getActiveCount() {
    return this.state.getStateSnapshot().activeAnimationCount
  }
}
