/**
 * SceneManager - Three.js Scene Initialization and Management
 *
 * Handles all scene setup including:
 * - Scene, camera, renderer initialization
 * - Lighting setup
 * - Ground plane and visual elements
 * - Coordinate axes
 * - Window resize handling
 *
 * Benefits:
 * - Centralizes Three.js setup
 * - Reusable scene configuration
 * - Clear initialization flow
 * - Easier to test and modify
 */

import * as THREE from 'three'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'
import { createAxisArrow, addAxisLabel } from './three-helpers.js'
import {
  CAMERA_CONFIG,
  CONTROLS_CONFIG,
  SCENE_CONFIG,
  LIGHTING_CONFIG,
  RAYCASTER_CONFIG,
  RENDERER_CONFIG
} from './constants.js'

export class SceneManager {
  constructor(canvasContainerId = 'canvas-container') {
    this.canvasContainer = document.getElementById(canvasContainerId)
    if (!this.canvasContainer) {
      throw new Error(`Canvas container '${canvasContainerId}' not found`)
    }

    this.scene = null
    this.camera = null
    this.renderer = null
    this.controls = null
    this.raycaster = null
    this.mouse = new THREE.Vector2()

    // Visual elements
    this.gridHelper = null
    this.originShadow = null
    this.axesGroup = null

    this.initialize()
  }

  // ========================================================================
  // INITIALIZATION
  // ========================================================================

  initialize() {
    this.createScene()
    this.createCamera()
    this.createRenderer()
    this.createControls()
    this.createLighting()
    this.createGroundPlane()
    this.createAxes()
    this.createRaycaster()
    this.setupResizeHandler()
  }

  createScene() {
    this.scene = new THREE.Scene()
    this.scene.background = new THREE.Color(SCENE_CONFIG.BACKGROUND_COLOR)
  }

  createCamera() {
    this.camera = new THREE.PerspectiveCamera(
      CAMERA_CONFIG.FOV,
      CAMERA_CONFIG.ASPECT,
      CAMERA_CONFIG.NEAR_CLIP,
      CAMERA_CONFIG.FAR_CLIP
    )
    // Use default position from constants
    this.camera.position.set(
      CAMERA_CONFIG.DEFAULT_POSITION.x,
      CAMERA_CONFIG.DEFAULT_POSITION.y,
      CAMERA_CONFIG.DEFAULT_POSITION.z
    )
  }

  createRenderer() {
    this.renderer = new THREE.WebGLRenderer({
      antialias: RENDERER_CONFIG.ANTIALIAS,
      alpha: RENDERER_CONFIG.ALPHA
    })

    this.renderer.setSize(this.canvasContainer.clientWidth, this.canvasContainer.clientHeight)
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, RENDERER_CONFIG.MAX_PIXEL_RATIO))

    this.canvasContainer.appendChild(this.renderer.domElement)

    // Update camera aspect ratio
    this.camera.aspect = this.canvasContainer.clientWidth / this.canvasContainer.clientHeight
    this.camera.updateProjectionMatrix()
  }

  createControls() {
    this.controls = new OrbitControls(this.camera, this.renderer.domElement)
    this.controls.enableDamping = CONTROLS_CONFIG.ENABLE_DAMPING
    this.controls.dampingFactor = CONTROLS_CONFIG.DAMPING_FACTOR
    this.controls.rotateSpeed = CONTROLS_CONFIG.ROTATE_SPEED
    this.controls.zoomSpeed = CONTROLS_CONFIG.ZOOM_SPEED
    this.controls.panSpeed = CONTROLS_CONFIG.PAN_SPEED
    this.controls.minDistance = CONTROLS_CONFIG.MIN_DISTANCE
    this.controls.maxDistance = CONTROLS_CONFIG.MAX_DISTANCE
    this.controls.enablePan = CONTROLS_CONFIG.ENABLE_PAN
    this.controls.zoomToCursor = CONTROLS_CONFIG.ZOOM_TO_CURSOR
    this.controls.screenSpacePanning = CONTROLS_CONFIG.SCREEN_SPACE_PANNING

    // Ensure controls are properly initialized
    this.controls.update()
  }

  createLighting() {
    // Ambient light for overall illumination
    const ambientLight = new THREE.AmbientLight(
      LIGHTING_CONFIG.AMBIENT_COLOR,
      LIGHTING_CONFIG.AMBIENT_INTENSITY
    )
    this.scene.add(ambientLight)

    // Main directional light
    const mainLight = new THREE.DirectionalLight(
      LIGHTING_CONFIG.MAIN_LIGHT_COLOR,
      LIGHTING_CONFIG.MAIN_LIGHT_INTENSITY
    )
    mainLight.position.set(
      LIGHTING_CONFIG.MAIN_LIGHT_POSITION.x,
      LIGHTING_CONFIG.MAIN_LIGHT_POSITION.y,
      LIGHTING_CONFIG.MAIN_LIGHT_POSITION.z
    )
    this.scene.add(mainLight)

    // Fill light for softer shadows
    const fillLight = new THREE.DirectionalLight(
      LIGHTING_CONFIG.FILL_LIGHT_COLOR,
      LIGHTING_CONFIG.FILL_LIGHT_INTENSITY
    )
    fillLight.position.set(
      LIGHTING_CONFIG.FILL_LIGHT_POSITION.x,
      LIGHTING_CONFIG.FILL_LIGHT_POSITION.y,
      LIGHTING_CONFIG.FILL_LIGHT_POSITION.z
    )
    this.scene.add(fillLight)

    // Rim light for edge highlights
    const rimLight = new THREE.PointLight(
      LIGHTING_CONFIG.RIM_LIGHT_COLOR,
      LIGHTING_CONFIG.RIM_LIGHT_INTENSITY,
      LIGHTING_CONFIG.RIM_LIGHT_DISTANCE
    )
    rimLight.position.set(
      LIGHTING_CONFIG.RIM_LIGHT_POSITION.x,
      LIGHTING_CONFIG.RIM_LIGHT_POSITION.y,
      LIGHTING_CONFIG.RIM_LIGHT_POSITION.z
    )
    this.scene.add(rimLight)
  }

  createGroundPlane() {
    // Radial gradient disc floor
    const discGeometry = new THREE.CircleGeometry(SCENE_CONFIG.DISC_RADIUS, SCENE_CONFIG.DISC_SEGMENTS)
    const discMaterial = new THREE.ShaderMaterial({
      transparent: true,
      side: THREE.DoubleSide,
      depthWrite: false,
      uniforms: {
        colorCenter: { value: new THREE.Color(SCENE_CONFIG.DISC_COLOR_CENTER) },
        colorEdge: { value: new THREE.Color(SCENE_CONFIG.DISC_COLOR_EDGE) }
      },
      vertexShader: `
        varying vec2 vUv;
        void main() {
          vUv = uv;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform vec3 colorCenter;
        uniform vec3 colorEdge;
        varying vec2 vUv;
        void main() {
          vec2 center = vec2(0.5, 0.5);
          float dist = distance(vUv, center) * 2.0;
          vec3 color = mix(colorCenter, colorEdge, dist);
          float alpha = 0.4 * (1.0 - dist * 0.5);
          gl_FragColor = vec4(color, alpha);
        }
      `
    })

    this.gridHelper = new THREE.Mesh(discGeometry, discMaterial)
    this.gridHelper.rotation.x = -Math.PI / 2
    this.gridHelper.position.y = SCENE_CONFIG.DISC_POSITION_Y
    this.scene.add(this.gridHelper)

    // Subtle shadow blob at origin for ambient occlusion effect
    const shadowGeometry = new THREE.CircleGeometry(
      SCENE_CONFIG.SHADOW_RADIUS,
      SCENE_CONFIG.SHADOW_SEGMENTS
    )
    const shadowMaterial = new THREE.MeshBasicMaterial({
      color: 0x000000,
      transparent: true,
      opacity: 0,
      depthWrite: false
    })

    shadowMaterial.onBeforeCompile = (shader) => {
      shader.fragmentShader = shader.fragmentShader.replace(
        'gl_FragColor = vec4( outgoingLight, diffuseColor.a );',
        `
          vec2 center = vec2(0.5, 0.5);
          float dist = distance(vUv, center) * 2.0;
          float alpha = (1.0 - dist) * 0.15;
          gl_FragColor = vec4(vec3(0.0), alpha);
        `
      )
      shader.vertexShader = shader.vertexShader.replace(
        'void main() {',
        `
          varying vec2 vUv;
          void main() {
            vUv = uv;
        `
      )
    }

    this.originShadow = new THREE.Mesh(shadowGeometry, shadowMaterial)
    this.originShadow.rotation.x = -Math.PI / 2
    this.originShadow.position.y = SCENE_CONFIG.SHADOW_POSITION_Y
    this.scene.add(this.originShadow)
  }

  createAxes() {
    this.axesGroup = new THREE.Group()

    const axisLength = SCENE_CONFIG.AXIS_LENGTH
    const axisLabelOffset = SCENE_CONFIG.AXIS_LABEL_OFFSET

    // X axis (red)
    const xAxis = createAxisArrow(
      [0, 0, 0],
      [axisLength, 0, 0],
      SCENE_CONFIG.AXIS_COLOR_X,
      SCENE_CONFIG.AXIS_THICKNESS
    )
    this.axesGroup.add(xAxis)
    addAxisLabel('X', [axisLength + axisLabelOffset, 0, 0], SCENE_CONFIG.AXIS_COLOR_X, this.axesGroup)

    // Y axis (green)
    const yAxis = createAxisArrow(
      [0, 0, 0],
      [0, axisLength, 0],
      SCENE_CONFIG.AXIS_COLOR_Y,
      SCENE_CONFIG.AXIS_THICKNESS
    )
    this.axesGroup.add(yAxis)
    addAxisLabel('Y', [0, axisLength + axisLabelOffset, 0], SCENE_CONFIG.AXIS_COLOR_Y, this.axesGroup)

    // Z axis (blue)
    const zAxis = createAxisArrow(
      [0, 0, 0],
      [0, 0, axisLength],
      SCENE_CONFIG.AXIS_COLOR_Z,
      SCENE_CONFIG.AXIS_THICKNESS
    )
    this.axesGroup.add(zAxis)
    addAxisLabel('Z', [0, 0, axisLength + axisLabelOffset, 0], SCENE_CONFIG.AXIS_COLOR_Z, this.axesGroup)

    this.scene.add(this.axesGroup)
  }

  createRaycaster() {
    this.raycaster = new THREE.Raycaster()
    this.raycaster.params.Line.threshold = RAYCASTER_CONFIG.LINE_THRESHOLD
    this.raycaster.params.Points.threshold = RAYCASTER_CONFIG.POINTS_THRESHOLD
  }

  setupResizeHandler() {
    window.addEventListener('resize', () => {
      this.camera.aspect = this.canvasContainer.clientWidth / this.canvasContainer.clientHeight
      this.camera.updateProjectionMatrix()
      this.renderer.setSize(this.canvasContainer.clientWidth, this.canvasContainer.clientHeight)
    })
  }

  // ========================================================================
  // RENDERING
  // ========================================================================

  render() {
    this.renderer.render(this.scene, this.camera)
  }

  // ========================================================================
  // UTILITY METHODS
  // ========================================================================

  /**
   * Show or hide axes and grid (used in comparison mode)
   * @param {boolean} visible - Whether to show the axes/grid
   */
  setAxesVisible(visible) {
    if (this.axesGroup) this.axesGroup.visible = visible
    if (this.gridHelper) this.gridHelper.visible = visible
  }

  /**
   * Update pointer position from mouse event
   * @param {MouseEvent} event - Mouse event
   */
  updatePointerFromEvent(event) {
    const rect = this.renderer.domElement.getBoundingClientRect()
    this.mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1
    this.mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1
  }

  /**
   * Get objects intersected by current mouse position
   * @param {Array} objects - Objects to test intersection with
   * @returns {Array} Intersections
   */
  getIntersections(objects) {
    this.raycaster.setFromCamera(this.mouse, this.camera)
    return this.raycaster.intersectObjects(objects)
  }

  /**
   * Add object to scene
   * @param {THREE.Object3D} object - Object to add
   */
  add(object) {
    this.scene.add(object)
  }

  /**
   * Remove object from scene
   * @param {THREE.Object3D} object - Object to remove
   */
  remove(object) {
    this.scene.remove(object)
  }

  /**
   * Get maximum anisotropy supported by renderer
   * @returns {number}
   */
  getMaxAnisotropy() {
    return this.renderer.capabilities.getMaxAnisotropy()
  }
}
