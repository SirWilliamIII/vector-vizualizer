/**
 * CameraController - Camera Movement and Positioning
 *
 * Handles all camera-related operations including:
 * - Focus on selected vectors (comparison mode)
 * - Camera state save/restore
 * - Reset to default view
 * - Animated camera movements
 *
 * Benefits:
 * - Encapsulates camera logic
 * - Reusable camera positioning utilities
 * - Testable camera calculations
 * - Clear separation from rendering
 */

import * as THREE from 'three'
import { CAMERA_CONFIG, FOCUS_CONFIG } from './constants.js'

export class CameraController {
  constructor(camera, controls, stateManager, animationController) {
    this.camera = camera
    this.controls = controls
    this.state = stateManager
    this.animator = animationController
  }

  // ========================================================================
  // FOCUS OPERATIONS
  // ========================================================================

  /**
   * Focus camera on two selected vectors for comparison mode
   * @param {Array<number>} coords1 - First vector coordinates [x, y, z]
   * @param {Array<number>} coords2 - Second vector coordinates [x, y, z]
   */
  focusOnVectors(coords1, coords2) {
    // Save current camera state before zooming (only save once per comparison)
    if (!this.state.hasSavedCameraState()) {
      this.state.saveCameraState(this.camera.position, this.controls.target)
    }

    // Calculate midpoint of the triangle (origin + 2 vectors)
    const origin = new THREE.Vector3(0, 0, 0)
    const vec1 = new THREE.Vector3(...coords1)
    const vec2 = new THREE.Vector3(...coords2)

    // Triangle centroid for better framing
    const centroid = origin
      .clone()
      .add(vec1)
      .add(vec2)
      .divideScalar(3)

    // Calculate distance between vectors
    const distance = vec1.distanceTo(vec2)

    // Calculate bounding sphere that includes origin and both vectors
    const maxVecLength = Math.max(vec1.length(), vec2.length())
    const boundingSphereRadius = Math.max(distance / 2, maxVecLength) + FOCUS_CONFIG.ANNOTATION_OFFSET

    // Bird's eye view: position camera directly above the plane
    // Calculate normal to the plane formed by the two vectors
    const normal = new THREE.Vector3().crossVectors(vec1, vec2).normalize()

    // If vectors are nearly parallel, use a fallback
    if (normal.length() < FOCUS_CONFIG.PARALLEL_VECTOR_THRESHOLD) {
      const up = new THREE.Vector3(0, 1, 0)
      normal.crossVectors(vec1, up).normalize()
      if (normal.length() < FOCUS_CONFIG.PARALLEL_VECTOR_THRESHOLD) {
        normal.set(0, 0, 1)
      }
    }

    // Position camera above the triangle looking down - ZOOMED IN (tighter framing)
    const cameraDistance = Math.max(
      boundingSphereRadius * FOCUS_CONFIG.CAMERA_DISTANCE_MULTIPLIER,
      FOCUS_CONFIG.MIN_CAMERA_DISTANCE
    )
    const targetPos = normal.multiplyScalar(cameraDistance).add(centroid)

    // Animate camera movement
    this.animator.animateCamera(
      this.camera,
      this.controls,
      targetPos,
      centroid,
      CAMERA_CONFIG.ANIMATION_DURATION_MS
    )
  }

  // ========================================================================
  // STATE MANAGEMENT
  // ========================================================================

  /**
   * Restore camera to previously saved state
   */
  restoreSavedState() {
    const savedState = this.state.getSavedCameraState()

    if (!savedState) {
      // No saved state, use default view
      this.resetToDefault()
      return
    }

    // Animate back to saved position
    this.animator.animateCamera(
      this.camera,
      this.controls,
      savedState.position,
      savedState.target,
      CAMERA_CONFIG.ANIMATION_DURATION_MS,
      () => {
        // Clear saved state after restoration
        this.state.clearCameraState()
      }
    )
  }

  /**
   * Reset camera to default viewing position
   */
  resetToDefault() {
    // Clear saved camera state when manually resetting
    this.state.clearCameraState()

    // Set camera to optimal position for viewing vectors
    this.camera.position.set(
      CAMERA_CONFIG.DEFAULT_POSITION.x,
      CAMERA_CONFIG.DEFAULT_POSITION.y,
      CAMERA_CONFIG.DEFAULT_POSITION.z
    )
    this.camera.lookAt(0, 0, 0)
    this.controls.reset()
  }

  // ========================================================================
  // UTILITY METHODS
  // ========================================================================

  /**
   * Get current camera position and target
   * @returns {Object} {position: Vector3, target: Vector3}
   */
  getCurrentState() {
    return {
      position: this.camera.position.clone(),
      target: this.controls.target.clone()
    }
  }

  /**
   * Set camera position and target directly (no animation)
   * @param {THREE.Vector3} position - Camera position
   * @param {THREE.Vector3} target - Look-at target
   */
  setPositionImmediate(position, target) {
    this.camera.position.copy(position)
    this.controls.target.copy(target)
    this.controls.update()
  }

  /**
   * Check if camera is at default position (approximately)
   * @returns {boolean}
   */
  isAtDefault() {
    const defaultPos = CAMERA_CONFIG.DEFAULT_POSITION
    const currentPos = this.camera.position
    const threshold = 0.1

    return (
      Math.abs(currentPos.x - defaultPos.x) < threshold &&
      Math.abs(currentPos.y - defaultPos.y) < threshold &&
      Math.abs(currentPos.z - defaultPos.z) < threshold
    )
  }
}
