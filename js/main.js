import * as THREE from 'three'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'
import { vectors, originalEmbeddings } from './vector-data.js'
import {
  createVectorArrow,
  createTextLabel,
  createConnectionLine,
  createAxisArrow,
  addAxisLabel,
  createAngleArc,
  createDistanceAnnotation,
  createComparisonPlate,
  createTipBadge
} from './three-helpers.js'
import { cosineSimilarity, euclideanDistance, mapRange, clamp } from './math-utils.js'
import { pcaTo3D } from './math-utils.js'
import { initEmbeddingModel, getEmbedding, isModelReady, MODEL_CONFIGS, getCurrentModel } from './embeddings.js'
import { updateInfoPanel, showStatus, clearStatus } from './ui.js'
import { OnboardingTour, injectOnboardingStyles } from './onboarding.js'
import { initMobileTooltips, pulseHelpIcons, injectMobileTooltipStyles } from './tooltip-mobile.js'

// Scene setup
const scene = new THREE.Scene()
scene.background = new THREE.Color(0x0a0e27)

const camera = new THREE.PerspectiveCamera(
  75,
  1,
  0.1,
  1000
)
// Static position for intro animation
camera.position.set(5, 5, 5)

const canvasContainer = document.getElementById('canvas-container')
const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false })
renderer.setSize(canvasContainer.clientWidth, canvasContainer.clientHeight)
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
const maxAnisotropy = renderer.capabilities.getMaxAnisotropy()
canvasContainer.appendChild(renderer.domElement)
camera.aspect = canvasContainer.clientWidth / canvasContainer.clientHeight
camera.updateProjectionMatrix()

const controls = new OrbitControls(camera, renderer.domElement)
controls.enableDamping = true
controls.dampingFactor = 0.08 // Increased for smoother feel
controls.rotateSpeed = 0.8
controls.zoomSpeed = 1.2
controls.panSpeed = 0.8
controls.minDistance = 2
controls.maxDistance = 50
controls.enablePan = true
// Smooth out zoom with damping
controls.zoomToCursor = false
controls.screenSpacePanning = true

// State
let selectedVectors = []
const vectorObjects = {}
const labelSprites = {}
const vectorMeshes = []
const vectorGroups = []
const labelSpritesList = []
const connectionLines = []
const annotations = [] // Track angle arcs and distance labels
const vectorAnimations = new Map() // Track ongoing animations
let lastHoveredVector = null
let previousCameraState = null // Store camera state before comparison zoom

function setLabelBasePosition(label, coords, multiplier = 1.1) {
  const basePos = new THREE.Vector3(
    coords[0] * multiplier,
    coords[1] * multiplier,
    coords[2] * multiplier
  )
  label.position.copy(basePos)
  label.userData.basePosition = basePos.clone()
  if (label.userData) {
    label.userData.coords = coords
  }
  label.userData.offsetSeed = Math.sign(coords[0]) || (Math.random() > 0.5 ? 1 : -1)
  if (!label.userData.baseScale) {
    label.userData.baseScale = label.scale.clone()
  }
}

// Add radial gradient disc floor
const discGeometry = new THREE.CircleGeometry(15, 64)
const discMaterial = new THREE.ShaderMaterial({
  transparent: true,
  side: THREE.DoubleSide,
  depthWrite: false,
  uniforms: {
    colorCenter: { value: new THREE.Color(0x040514) },
    colorEdge: { value: new THREE.Color(0x0f1530) }
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
const gridHelper = new THREE.Mesh(discGeometry, discMaterial)
gridHelper.rotation.x = -Math.PI / 2
gridHelper.position.y = -0.01
scene.add(gridHelper)

// Add subtle shadow blob at origin for ambient occlusion effect
const shadowGeometry = new THREE.CircleGeometry(1.2, 32)
const shadowMaterial = new THREE.MeshBasicMaterial({
  color: 0x000000,
  transparent: true,
  opacity: 0,
  depthWrite: false
})
shadowMaterial.onBeforeCompile = (shader) => {
  shader.fragmentShader = shader.fragmentShader.replace(
    'void main() {',
    `
    varying vec2 vUv;
    void main() {
    `
  )
  shader.fragmentShader = shader.fragmentShader.replace(
    'gl_FragColor = vec4( outgoingLight, diffuseColor.a );',
    `
    vec2 center = vec2(0.5, 0.5);
    float dist = distance(vUv, center) * 2.0;
    float shadow = smoothstep(1.0, 0.0, dist);
    gl_FragColor = vec4(0.0, 0.0, 0.0, shadow * 0.25);
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
const originShadow = new THREE.Mesh(shadowGeometry, shadowMaterial)
originShadow.rotation.x = -Math.PI / 2
originShadow.position.y = 0.001
scene.add(originShadow)

// Create coordinate axes
const axesGroup = new THREE.Group()
const axisLength = 6

const xAxis = createAxisArrow([0, 0, 0], [axisLength, 0, 0], 0xff0000, 0.05)
axesGroup.add(xAxis)
addAxisLabel('X', [axisLength + 0.5, 0, 0], 0xff0000, axesGroup)

const yAxis = createAxisArrow([0, 0, 0], [0, axisLength, 0], 0x00ff00, 0.05)
axesGroup.add(yAxis)
addAxisLabel('Y', [0, axisLength + 0.5, 0], 0x00ff00, axesGroup)

const zAxis = createAxisArrow([0, 0, 0], [0, 0, axisLength], 0xffff00, 0.05)
axesGroup.add(zAxis)
addAxisLabel('Z', [0, 0, axisLength + 0.5], 0xffff00, axesGroup)

scene.add(axesGroup)

// Initialize 3D coordinates from embeddings using PCA
console.log('Computing 3D coordinates from embeddings...')
const projected3D = pcaTo3D(originalEmbeddings)
if (projected3D && projected3D.length > 0) {
  const nonNullWords = Object.keys(originalEmbeddings).filter(w => originalEmbeddings[w] !== null)
  nonNullWords.forEach((w, i) => {
    if (vectors[w]) {
      vectors[w].coords = projected3D[i]
    }
  })
  console.log(`Projected ${nonNullWords.length} vectors to 3D space`)
} else {
  console.warn('PCA failed, using placeholder coordinates')
}

// Create initial vectors
const allCoords = Object.values(vectors).map(v => v.coords)
Object.entries(vectors).forEach(([name, data]) => {
  const arrow = createVectorArrow([0, 0, 0], data.coords, data.color, allCoords)
  arrow.userData = { name, coords: data.coords, color: data.color }
  scene.add(arrow)
  vectorObjects[name] = arrow
  vectorGroups.push(arrow)

  arrow.children.forEach((mesh) => {
    mesh.userData = { name, coords: data.coords, color: data.color }
    vectorMeshes.push(mesh)
  })

  const label = createTextLabel(name, data.color)
  label.userData = { name, coords: data.coords, color: data.color, isHovered: false }
  setLabelBasePosition(label, data.coords)
  scene.add(label)
  labelSprites[name] = label
  labelSpritesList.push(label)
})

// Enhanced lighting for StandardMaterial
const ambientLight = new THREE.AmbientLight(0xffffff, 0.5)
scene.add(ambientLight)

const mainLight = new THREE.DirectionalLight(0xffffff, 0.8)
mainLight.position.set(5, 10, 7)
scene.add(mainLight)

const fillLight = new THREE.DirectionalLight(0x7a8cb8, 0.3)
fillLight.position.set(-5, 3, -5)
scene.add(fillLight)

const rimLight = new THREE.PointLight(0xa8b5d1, 0.4, 50)
rimLight.position.set(0, 8, -8)
scene.add(rimLight)

// Raycaster for interaction
const raycaster = new THREE.Raycaster()
// Increase threshold to detect thin arrow geometries more easily
raycaster.params.Line.threshold = 0.2
raycaster.params.Points.threshold = 0.2
const mouse = new THREE.Vector2()

function updatePointerFromEvent(event) {
  const rect = renderer.domElement.getBoundingClientRect()
  mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1
  mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1
}

function onMouseMove(event) {
  updatePointerFromEvent(event)

  raycaster.setFromCamera(mouse, camera)
  const meshIntersects = raycaster.intersectObjects(vectorMeshes)
  const labelIntersects = raycaster.intersectObjects(labelSpritesList)

  // Reset all meshes to default state
  vectorGroups.forEach((arrow) => {
    if (!arrow.userData) return
    const name = arrow.userData.name
    if (selectedVectors.includes(name) || name === lastHoveredVector) return

    arrow.children.forEach((child) => {
      if (!child.material || child.userData?.isHitbox) return
      child.material.emissiveIntensity = 0.25
      if (child.userData?.baseOpacity !== undefined) {
        child.material.opacity = child.userData.baseOpacity
      }
    })
  })

  // Reset all labels hover state
  labelSpritesList.forEach((label) => {
    if (selectedVectors.includes(label.userData.name)) return
    label.userData.isHovered = false
  })

  // Handle mesh hover
  if (meshIntersects.length > 0) {
    const mesh = meshIntersects[0].object
    const name = mesh.userData.name
    if (!selectedVectors.includes(name)) {
      lastHoveredVector = name
      // Highlight visible meshes of this vector (skip hitbox)
      const arrow = vectorObjects[name]
      if (arrow) {
        arrow.children.forEach((child) => {
          if (!child.userData.isHitbox && child.material) {
            child.material.emissiveIntensity = 0.85
            if (child.userData?.baseOpacity !== undefined) {
              child.material.opacity = clamp(child.userData.baseOpacity * 1.1, 0, 1)
            } else {
              child.material.opacity = 1
            }
          }
        })
      }
      if (labelSprites[name]) {
        labelSprites[name].userData.isHovered = true
      }
    }
    document.body.style.cursor = 'pointer'
  }
  // Handle label hover
  else if (labelIntersects.length > 0) {
    const label = labelIntersects[0].object
    const name = label.userData.name
    if (!selectedVectors.includes(name)) {
      lastHoveredVector = name
      label.userData.isHovered = true

      const arrow = vectorObjects[name]
      if (arrow) {
        arrow.children.forEach((child) => {
          if (!child.userData.isHitbox && child.material) {
            child.material.emissiveIntensity = 0.85
            if (child.userData?.baseOpacity !== undefined) {
              child.material.opacity = clamp(child.userData.baseOpacity * 1.1, 0, 1)
            } else {
              child.material.opacity = 1
            }
          }
        })
      }
    }
    document.body.style.cursor = 'pointer'
  } else {
    document.body.style.cursor = 'default'
    lastHoveredVector = null
  }
}

function onMouseClick(event) {
  updatePointerFromEvent(event)

  raycaster.setFromCamera(mouse, camera)
  const meshIntersects = raycaster.intersectObjects(vectorMeshes)
  const labelIntersects = raycaster.intersectObjects(labelSpritesList)

  let name = null

  // Check mesh intersections first, then label intersections
  if (meshIntersects.length > 0) {
    name = meshIntersects[0].object.userData.name
  } else if (labelIntersects.length > 0) {
    name = labelIntersects[0].object.userData.name
  }

  if (!name && lastHoveredVector) {
    name = lastHoveredVector
  }

  if (name) {
    // Clicked on a vector or label
    if (selectedVectors.includes(name)) {
      // Clicking a selected vector deselects it
      selectedVectors = selectedVectors.filter((v) => v !== name)
    } else {
      // Otherwise add to selection (0 or 1 already selected)
      selectedVectors.push(name)
      if (selectedVectors.length > 2) {
        selectedVectors.shift()
      }
    }

    updateSelection()
  } else {
    // Clicked empty space
    if (selectedVectors.length === 2) {
      // If 2 vectors are selected (comparison mode), clicking empty space resets everything
      selectedVectors = []
      restoreCameraState() // Restore camera to previous position
      updateSelection()
    }
  }
}

function animateVector(mesh, targetProps, duration = 400) {
  // Skip animation for invisible hitboxes
  if (mesh.userData.isHitbox) {
    return
  }

  const startTime = Date.now()
  const startEmissive = mesh.material.emissiveIntensity
  const startOpacity = mesh.material.opacity

  const animationId = mesh.uuid

  function animate() {
    const elapsed = Date.now() - startTime
    const progress = Math.min(elapsed / duration, 1)
    const eased =
      progress < 0.5 ? 2 * progress * progress : 1 - Math.pow(-2 * progress + 2, 2) / 2 // easeInOutQuad

    mesh.material.emissiveIntensity =
      startEmissive + (targetProps.emissiveIntensity - startEmissive) * eased
    mesh.material.opacity = startOpacity + (targetProps.opacity - startOpacity) * eased

    if (progress < 1) {
      vectorAnimations.set(animationId, requestAnimationFrame(animate))
    } else {
      vectorAnimations.delete(animationId)
      if (targetProps.visible === false) {
        mesh.visible = false
      }
    }
  }

  // Cancel existing animation
  if (vectorAnimations.has(animationId)) {
    cancelAnimationFrame(vectorAnimations.get(animationId))
  }

  mesh.visible = true // Always visible during animation
  vectorAnimations.set(animationId, requestAnimationFrame(animate))
}

function softReveal(object, duration = 450) {
  if (!object) return
  const startScale = object.scale.clone()
  const hiddenScale = startScale.clone().multiplyScalar(0.05)
  object.scale.copy(hiddenScale)

  const materialTargets = []
  const registerMaterial = (mat) => {
    if (!mat || mat.__softRevealRegistered) return
    materialTargets.push({ mat, target: mat.opacity ?? 1 })
    if (typeof mat.opacity === 'number') {
      mat.opacity = 0
      mat.transparent = true
    }
    mat.__softRevealRegistered = true
  }

  if (object.material) registerMaterial(object.material)
  if (object.traverse) {
    object.traverse((child) => {
      if (child.material) registerMaterial(child.material)
    })
  }

  const startTime = performance.now()

  function animate() {
    const progress = Math.min((performance.now() - startTime) / duration, 1)
    const eased =
      progress < 0.5 ? 2 * progress * progress : 1 - Math.pow(-2 * progress + 2, 2) / 2

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

function updateSelection() {
  const hasSelection = selectedVectors.length > 0
  const twoSelected = selectedVectors.length === 2

  // Hide/show axes and bottom panel based on comparison mode
  if (twoSelected) {
    axesGroup.visible = false
    gridHelper.visible = false
  } else {
    axesGroup.visible = true
    gridHelper.visible = true
  }

  vectorMeshes.forEach((mesh) => {
    if (selectedVectors.includes(mesh.userData.name)) {
      // Selected vectors: bright and prominent
      animateVector(mesh, {
        emissiveIntensity: 1.5,
        opacity: 1,
        visible: true
      })
    } else if (twoSelected) {
      // Hide all other vectors when 2 are selected
      animateVector(
        mesh,
        {
          emissiveIntensity: 0.02,
          opacity: 0,
          visible: false
        },
        300
      )
    } else if (hasSelection) {
      // Unselected when something is selected: very faded
      animateVector(mesh, {
        emissiveIntensity: 0.02,
        opacity: 0.25,
        visible: true
      })
    } else {
      // Nothing selected: normal state
      animateVector(mesh, {
        emissiveIntensity: 0.15,
        opacity: 0.95,
        visible: true
      })
    }
  })

  labelSpritesList.forEach((label) => {
    const startOpacity = label.material.opacity
    const startScaleX = label.scale.x
    const startScaleY = label.scale.y

    let targetOpacity, targetScaleX, targetScaleY, targetVisible

    if (selectedVectors.includes(label.userData.name)) {
      targetOpacity = 1
      targetScaleX = 2.3
      targetScaleY = 1.15
      targetVisible = true
    } else if (twoSelected) {
      targetOpacity = 0
      targetScaleX = 1.6
      targetScaleY = 0.8
      targetVisible = false
    } else if (hasSelection) {
      targetOpacity = 0.3
      targetScaleX = 1.6
      targetScaleY = 0.8
      targetVisible = true
    } else {
      targetOpacity = 0.95
      targetScaleX = 2
      targetScaleY = 1
      targetVisible = true
    }

    // Animate labels
    const duration = 400
    const startTime = Date.now()
    const animationId = `label-${label.uuid}`

    function animate() {
      const elapsed = Date.now() - startTime
      const progress = Math.min(elapsed / duration, 1)
      const eased =
        progress < 0.5
          ? 2 * progress * progress
          : 1 - Math.pow(-2 * progress + 2, 2) / 2

      label.material.opacity = startOpacity + (targetOpacity - startOpacity) * eased
      label.scale.set(
        startScaleX + (targetScaleX - startScaleX) * eased,
        startScaleY + (targetScaleY - startScaleY) * eased,
        1
      )

      if (progress < 1) {
        vectorAnimations.set(animationId, requestAnimationFrame(animate))
      } else {
        vectorAnimations.delete(animationId)
        if (!targetVisible) {
          label.visible = false
        }
      }
    }

    if (vectorAnimations.has(animationId)) {
      cancelAnimationFrame(vectorAnimations.get(animationId))
    }

    label.visible = true
    vectorAnimations.set(animationId, requestAnimationFrame(animate))
  })

  clearConnectionLines()
  clearAnnotations()

  if (selectedVectors.length === 2) {
    const coords1 = vectors[selectedVectors[0]].coords
    const coords2 = vectors[selectedVectors[1]].coords
    const similarityValue = cosineSimilarity(coords1, coords2)
    const similarity = Math.abs(similarityValue)

    const comparisonPlate = createComparisonPlate(coords1, coords2)
    scene.add(comparisonPlate)
    annotations.push(comparisonPlate)
    softReveal(comparisonPlate)
    const badge1 = createTipBadge(coords1, vectors[selectedVectors[0]].color)
    const badge2 = createTipBadge(coords2, vectors[selectedVectors[1]].color)
    scene.add(badge1)
    scene.add(badge2)
    annotations.push(badge1, badge2)
    softReveal(badge1, 320)
    softReveal(badge2, 320)

    const color = similarity > 0.7 ? 0x4ade80 : similarity > 0.3 ? 0xfbbf24 : 0xf87171
    const line = createConnectionLine(coords1, coords2, color)
    scene.add(line)
    connectionLines.push(line)

    // Calculate angle in degrees for cosine similarity visualization
    const v1 = new THREE.Vector3(...coords1)
    const v2 = new THREE.Vector3(...coords2)
    const v1Normalized = v1.clone().normalize()
    const v2Normalized = v2.clone().normalize()
    const angleRad = Math.acos(v1Normalized.dot(v2Normalized))
    const angleDeg = angleRad * (180 / Math.PI)

    // Create angle arc visualization
    const angleArc = createAngleArc(coords1, coords2, color, angleDeg)
    scene.add(angleArc)
    annotations.push(angleArc)

    // Calculate euclidean distance (same as shown in info panel)
    const euclideanDist = euclideanDistance(coords1, coords2)

    // Create distance annotation
    const distAnnotation = createDistanceAnnotation(
      coords1,
      coords2,
      euclideanDist,
      'euclidean',
      color
    )
    scene.add(distAnnotation)
    annotations.push(distAnnotation)

    // Auto-focus camera on the two selected vectors
    focusCameraOnVectors(coords1, coords2)
  }

  updateInfoPanel(selectedVectors)

  // Wire up close button if it exists (when 2 vectors are selected)
  const closeBtn = document.getElementById('close-comparison')
  if (closeBtn) {
    closeBtn.addEventListener('click', function () {
      selectedVectors = []
      restoreCameraState()
      updateSelection()
    })
  }
}

function clearConnectionLines() {
  connectionLines.forEach((line) => scene.remove(line))
  connectionLines.length = 0
}

function clearAnnotations() {
  annotations.forEach((annotation) => scene.remove(annotation))
  annotations.length = 0
}

function focusCameraOnVectors(coords1, coords2) {
  // Save current camera state before zooming (only save once per comparison)
  if (!previousCameraState) {
    previousCameraState = {
      position: camera.position.clone(),
      target: controls.target.clone()
    };
  }

  // Calculate midpoint of the triangle (origin + 2 vectors)
  const origin = new THREE.Vector3(0, 0, 0)
  const vec1 = new THREE.Vector3(...coords1)
  const vec2 = new THREE.Vector3(...coords2)

  // Triangle centroid for better framing
  const centroid = new THREE.Vector3()
    .add(origin)
    .add(vec1)
    .add(vec2)
    .divideScalar(3)

  // Calculate distance between vectors
  const distance = vec1.distanceTo(vec2)

  // Calculate bounding sphere that includes origin and both vectors
  const maxVecLength = Math.max(vec1.length(), vec2.length())
  const annotationOffset = 2.5
  const boundingSphereRadius = Math.max(distance / 2, maxVecLength) + annotationOffset

  // Bird's eye view: position camera directly above the plane
  // Calculate normal to the plane formed by the two vectors
  const normal = new THREE.Vector3().crossVectors(vec1, vec2).normalize()

  // If vectors are nearly parallel, use a fallback
  if (normal.length() < 0.1) {
    const up = new THREE.Vector3(0, 1, 0)
    normal.crossVectors(vec1, up).normalize()
    if (normal.length() < 0.1) {
      normal.set(0, 0, 1)
    }
  }

  // Position camera above the triangle looking down - ZOOMED IN (tighter framing)
  const cameraDistance = Math.max(boundingSphereRadius * 0.85, 3) // Reduced from 1.15 to 0.85 for closer zoom
  const targetPos = normal.multiplyScalar(cameraDistance).add(centroid)

  // Animate camera movement
  const startPos = camera.position.clone()
  const startTarget = controls.target.clone()
  const duration = 800
  const startTime = Date.now()

  function animateCamera() {
    const elapsed = Date.now() - startTime
    const progress = Math.min(elapsed / duration, 1)
    // Smooth easing
    const eased =
      progress < 0.5
        ? 4 * progress * progress * progress
        : 1 - Math.pow(-2 * progress + 2, 3) / 2

    camera.position.lerpVectors(startPos, targetPos, eased)
    controls.target.lerpVectors(startTarget, centroid, eased)
    controls.update()

    if (progress < 1) {
      requestAnimationFrame(animateCamera)
    }
  }

  animateCamera()
}

// Restore camera to previous state with smooth animation
function restoreCameraState() {
  if (!previousCameraState) {
    // No saved state, use default view
    window.resetView();
    return;
  }

  const startPos = camera.position.clone();
  const startTarget = controls.target.clone();
  const targetPos = previousCameraState.position;
  const targetLookAt = previousCameraState.target;
  const duration = 800;
  const startTime = Date.now();

  function animateCamera() {
    const elapsed = Date.now() - startTime;
    const progress = Math.min(elapsed / duration, 1);
    // Smooth easing
    const eased =
      progress < 0.5
        ? 4 * progress * progress * progress
        : 1 - Math.pow(-2 * progress + 2, 3) / 2;

    camera.position.lerpVectors(startPos, targetPos, eased);
    controls.target.lerpVectors(startTarget, targetLookAt, eased);
    controls.update();

    if (progress < 1) {
      requestAnimationFrame(animateCamera);
    } else {
      // Clear saved state after restoration
      previousCameraState = null;
    }
  }

  animateCamera();
}

window.addEventListener('mousemove', onMouseMove)
window.addEventListener('click', onMouseClick)

// Keyboard shortcuts
window.addEventListener('keydown', (event) => {
  if (event.key === 'Escape' && selectedVectors.length > 0) {
    selectedVectors = []
    restoreCameraState()
    updateSelection()
  }
})

// Control functions
window.resetView = function () {
  // Clear saved camera state when manually resetting
  previousCameraState = null
  // Optimal for 14 curated vectors
  camera.position.set(6, 6, 6)
  camera.lookAt(0, 0, 0)
  controls.reset()
}

window.clearSelection = function () {
  selectedVectors = []
  clearConnectionLines()
  clearAnnotations()
  vectorMeshes.forEach((mesh) => {
    if (mesh.userData.isHitbox) return
    mesh.material.emissiveIntensity = 0.15
    mesh.material.opacity = 0.95
  })
  labelSpritesList.forEach((label) => {
    label.material.opacity = 0.95
    label.scale.set(2, 1, 1)
  })
  updateInfoPanel(selectedVectors)
}

window.addCustomVector = async function () {
  const input = document.getElementById('word-input')
  const modelSelect = document.getElementById('model-select')
  const word = input.value.trim().toLowerCase()
  const selectedModel = modelSelect ? modelSelect.value : 'minilm'

  if (!word) {
    showStatus('Please enter a word', 'error')
    setTimeout(() => clearStatus(), 2000)
    return
  }

  if (vectors[word]) {
    showStatus('Word already exists', 'error')
    setTimeout(() => clearStatus(), 2000)
    return
  }

  const addBtn = document.querySelector('.add-btn-compact')
  if (addBtn) addBtn.disabled = true

  try {
    let embedding

    // Use transformer model (minilm, e5-small, or bge-small)
    const currentModel = getCurrentModel()
    const modelConfig = MODEL_CONFIGS[selectedModel]

    if (!modelConfig) {
      throw new Error(`Unknown model: ${selectedModel}`)
    }

    // Check if we need to load or switch models
    if (!isModelReady() || currentModel !== selectedModel) {
      showStatus(`Loading ${modelConfig.institution} ${modelConfig.name}... (${modelConfig.size}, first time only)`, 'loading')
      await initEmbeddingModel(selectedModel)

      // Re-embed all existing words with the new model
      for (const w of Object.keys(vectors)) {
        originalEmbeddings[w] = await getEmbedding(w, selectedModel)
      }

      showStatus(`${modelConfig.name} ready! Adding "${word}"...`, 'loading')
    } else {
      showStatus(`Getting embedding for "${word}"...`, 'loading')
    }

    embedding = await getEmbedding(word, selectedModel)

    originalEmbeddings[word] = embedding

    const projected = pcaTo3D(originalEmbeddings)

    if (!projected) {
      throw new Error('PCA failed')
    }

    // Update all vectors with new PCA coordinates
    // pcaTo3D filters out nulls, so we need to match projected array with non-null words
    const nonNullWords = Object.keys(originalEmbeddings).filter(w => originalEmbeddings[w] !== null)
    nonNullWords.forEach((w, i) => {
      if (!vectors[w]) {
        // New word being added
        const randomColor = Math.floor(Math.random() * 0xffffff)
        vectors[w] = {
          coords: projected[i],
          color: randomColor,
          description: `${selectedModel} embedding`,
          isCustom: true
        }
      } else {
        // Existing word, update coords
        vectors[w].coords = projected[i]
      }
    })

    // Create new vector visualization
    const data = vectors[word]
    const updatedCoords = Object.values(vectors).map(v => v.coords)
    const arrow = createVectorArrow([0, 0, 0], data.coords, data.color, updatedCoords)
    arrow.userData = { name: word, coords: data.coords, color: data.color }
    scene.add(arrow)
    vectorObjects[word] = arrow
    vectorGroups.push(arrow)

    arrow.children.forEach((mesh) => {
      mesh.userData = { name: word, coords: data.coords, color: data.color }
      vectorMeshes.push(mesh)
    })

    const label = createTextLabel(word, data.color)
    label.userData = { name: word, coords: data.coords, color: data.color, isHovered: false }
    setLabelBasePosition(label, data.coords)
    scene.add(label)
    labelSprites[word] = label
    labelSpritesList.push(label)

    // Update existing vector positions
    Object.entries(vectorObjects).forEach(([name, obj]) => {
      if (name !== word) {
        const newCoords = vectors[name].coords

        scene.remove(obj)

        const newArrow = createVectorArrow([0, 0, 0], newCoords, vectors[name].color, updatedCoords)
        newArrow.userData = { name, coords: newCoords, color: vectors[name].color }
        scene.add(newArrow)
        vectorObjects[name] = newArrow
        const groupIdx = vectorGroups.indexOf(obj)
        if (groupIdx > -1) {
          vectorGroups[groupIdx] = newArrow
        } else {
          vectorGroups.push(newArrow)
        }

        const oldMeshes = vectorMeshes.filter((m) => m.userData.name === name)
        oldMeshes.forEach((m) => {
          const idx = vectorMeshes.indexOf(m)
          if (idx > -1) vectorMeshes.splice(idx, 1)
        })

        newArrow.children.forEach((mesh) => {
          mesh.userData = { name, coords: newCoords, color: vectors[name].color }
          vectorMeshes.push(mesh)
        })

        setLabelBasePosition(labelSprites[name], newCoords)
      }
    })

    showStatus(
      `Added "${word}" using ${MODEL_CONFIGS[selectedModel].name}! Click it to compare.`,
      'success'
    )
    input.value = ''
    if (addBtn) addBtn.disabled = false
    setTimeout(() => clearStatus(), 3000)

  } catch (error) {
    console.error('Error adding vector:', error)
    showStatus(`Error: ${error.message}`, 'error')
    if (addBtn) addBtn.disabled = false
    setTimeout(() => clearStatus(), 4000)
  }
}

// Handle model switching - re-embed all vectors with new model
async function switchModel(newModelKey) {
  const modelConfig = MODEL_CONFIGS[newModelKey];

  if (!modelConfig) {
    showStatus(`Unknown model: ${newModelKey}`, 'error');
    setTimeout(() => clearStatus(), 2000);
    return;
  }

  const currentModel = getCurrentModel();

  // If already using this model, do nothing
  if (currentModel === newModelKey && isModelReady()) {
    return;
  }

  try {
    // Show loading overlay on canvas
    const canvasContainer = document.getElementById('canvas-container');
    const overlay = document.createElement('div');
    overlay.className = 'canvas-overlay';
    overlay.innerHTML = `
      <div class="loading-spinner"></div>
      <p style="color: var(--text-primary); font-size: var(--text-lg); margin-top: var(--space-lg);">
        Loading ${modelConfig.name}...
      </p>
      <p style="color: var(--text-muted); font-size: var(--text-sm); margin-top: var(--space-xs);">
        ${modelConfig.size}
      </p>
    `;
    canvasContainer.appendChild(overlay);

    // Disable controls during loading
    const modelSelect = document.getElementById('model-select');
    if (modelSelect) modelSelect.disabled = true;

    // Initialize new model
    await initEmbeddingModel(newModelKey);

    // Re-embed all existing words with the new model
    const allWords = Object.keys(vectors);
    showStatus(`Re-embedding ${allWords.length} words with ${modelConfig.name}...`, 'loading');

    for (const word of allWords) {
      originalEmbeddings[word] = await getEmbedding(word, newModelKey);
    }

    // Recalculate PCA with new embeddings
    const projected = pcaTo3D(originalEmbeddings);

    if (!projected) {
      throw new Error('PCA failed after model switch');
    }

    // Update all vector coordinates
    const nonNullWords = Object.keys(originalEmbeddings).filter(w => originalEmbeddings[w] !== null);
    nonNullWords.forEach((w, i) => {
      if (vectors[w]) {
        vectors[w].coords = projected[i];
      }
    });

    // Clear and recreate all Three.js objects with new coordinates
    // Remove all existing vectors and labels
    Object.values(vectorObjects).forEach(obj => scene.remove(obj));
    Object.values(labelSprites).forEach(label => scene.remove(label));

    // Clear arrays
    vectorMeshes.length = 0;
    vectorGroups.length = 0;
    labelSpritesList.length = 0;

    // Recreate all vectors with new positions
    const updatedCoords = Object.values(vectors).map(v => v.coords);

    Object.entries(vectors).forEach(([word, data]) => {
      // Create vector arrow
      const arrow = createVectorArrow([0, 0, 0], data.coords, data.color, updatedCoords);
      arrow.userData = { name: word, coords: data.coords, color: data.color };
      scene.add(arrow);
      vectorObjects[word] = arrow;
      vectorGroups.push(arrow);

      arrow.children.forEach((mesh) => {
        mesh.userData = { name: word, coords: data.coords, color: data.color };
        vectorMeshes.push(mesh);
      });

      // Create label
      const label = createTextLabel(word, data.color);
      label.userData = { name: word, coords: data.coords, color: data.color, isHovered: false };
      setLabelBasePosition(label, data.coords);
      scene.add(label);
      labelSprites[word] = label;
      labelSpritesList.push(label);
    });

    // Clear any active selections
    selectedVectors = [];
    clearConnectionLines();
    clearAnnotations();
    updateInfoPanel(selectedVectors);

    // Remove overlay with fade out
    overlay.classList.add('fade-out');
    setTimeout(() => overlay.remove(), 300);

    // Re-enable controls
    if (modelSelect) modelSelect.disabled = false;

    showStatus(`Switched to ${modelConfig.name}`, 'success');
    setTimeout(() => clearStatus(), 2000);

  } catch (error) {
    console.error('Error switching model:', error);

    // Remove overlay
    const overlay = document.querySelector('.canvas-overlay');
    if (overlay) overlay.remove();

    // Re-enable controls
    const modelSelect = document.getElementById('model-select');
    if (modelSelect) modelSelect.disabled = false;

    showStatus(`Error switching model: ${error.message}`, 'error');
    setTimeout(() => clearStatus(), 4000);
  }
}

window.clearCustomVectors = function () {
  const customWords = Object.keys(vectors).filter((w) => vectors[w].isCustom)

  if (customWords.length === 0) {
    showStatus('No custom vectors to clear', 'error')
    setTimeout(() => clearStatus(), 2000)
    return
  }

  customWords.forEach((word) => {
    if (vectorObjects[word]) {
      const groupIdx = vectorGroups.indexOf(vectorObjects[word])
      if (groupIdx > -1) vectorGroups.splice(groupIdx, 1)
      scene.remove(vectorObjects[word])
      delete vectorObjects[word]
    }
    if (labelSprites[word]) {
      scene.remove(labelSprites[word])
      const labelIdx = labelSpritesList.findIndex((l) => l.userData.name === word)
      if (labelIdx > -1) labelSpritesList.splice(labelIdx, 1)
      delete labelSprites[word]
    }

    delete vectors[word]
    delete originalEmbeddings[word]

    const meshesToRemove = vectorMeshes.filter((m) => m.userData.name === word)
    meshesToRemove.forEach((m) => {
      const idx = vectorMeshes.indexOf(m)
      if (idx > -1) vectorMeshes.splice(idx, 1)
    })
  })

  selectedVectors = selectedVectors.filter((w) => !customWords.includes(w))
  clearConnectionLines()
  clearAnnotations()
  updateInfoPanel(selectedVectors)

  showStatus(`Cleared ${customWords.length} custom vector(s)`, 'success')
  setTimeout(() => clearStatus(), 2000)
}

window.startFresh = function () {
  const allWords = Object.keys(vectors)
  if (allWords.length > 0) {
    const confirmed = confirm(`Clear all ${allWords.length} vectors and start fresh?`)
    if (!confirmed) return
  }

  allWords.forEach((word) => {
    if (vectorObjects[word]) {
      const groupIdx = vectorGroups.indexOf(vectorObjects[word])
      if (groupIdx > -1) vectorGroups.splice(groupIdx, 1)
      scene.remove(vectorObjects[word])
      delete vectorObjects[word]
    }
    if (labelSprites[word]) {
      scene.remove(labelSprites[word])
      delete labelSprites[word]
    }

    const meshesToRemove = vectorMeshes.filter((m) => m.userData.name === word)
    meshesToRemove.forEach((m) => {
      const idx = vectorMeshes.indexOf(m)
      if (idx > -1) vectorMeshes.splice(idx, 1)
    })
  })

  // Clear label sprites list
  labelSpritesList.length = 0
  vectorGroups.length = 0

  Object.keys(vectors).forEach((key) => delete vectors[key])
  Object.keys(originalEmbeddings).forEach((key) => delete originalEmbeddings[key])

  selectedVectors = []
  clearConnectionLines()
  clearAnnotations()

  updateInfoPanel(selectedVectors)
  showStatus('Canvas cleared! Add your first word below.', 'success')
  setTimeout(() => clearStatus(), 3000)
}

window.exportVisual = function () {
  // Create a timestamp for the filename
  const timestamp = new Date().toISOString().slice(0, 19).replace(/:/g, '-')
  const filename = `vector-viz-${timestamp}.png`

  // Render the scene one more time to ensure it's up to date
  renderer.render(scene, camera)

  // Get the canvas data as a blob
  renderer.domElement.toBlob((blob) => {
    // Create a download link
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = filename

    // Trigger download
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)

    // Clean up
    URL.revokeObjectURL(url)

    showStatus('Image exported successfully!', 'success')
    setTimeout(() => clearStatus(), 2000)
  }, 'image/png')
}

// Handle Enter key in input
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

// Animation loop
function animate() {
  requestAnimationFrame(animate)
  controls.update()

  // Distance-based prominence for vectors and labels
  const cameraPosition = camera.position.clone()
  const cameraDirection = new THREE.Vector3()
  camera.getWorldDirection(cameraDirection)
  const cameraUpVec = camera.up.clone().normalize()
  const cameraRightVec = new THREE.Vector3().crossVectors(cameraDirection, cameraUpVec).normalize()
  if (cameraRightVec.lengthSq() < 1e-4) {
    cameraRightVec.set(1, 0, 0)
  }

  // Update vector arrow prominence
  vectorGroups.forEach((arrow) => {
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
  Object.values(labelSprites).forEach((sprite) => {
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

  // Depth-based scaling for annotation sprites (angle/distance labels)
  annotations.forEach((annotation) => {
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
  connectionLines.forEach((line) => {
    if (line.userData && line.userData.isAnimated) {
      const mat = line.userData.animatedMaterial || line.material
      if (mat && mat.uniforms && mat.uniforms.time) {
        mat.uniforms.time.value += 0.016
      }
    }
  })

  renderer.render(scene, camera)
}

// Handle window resize
window.addEventListener('resize', () => {
  const { clientWidth, clientHeight } = canvasContainer
  camera.aspect = clientWidth / clientHeight
  camera.updateProjectionMatrix()
  renderer.setSize(clientWidth, clientHeight)
})

// Intro sequence: Vectors emerge from origin with stagger
function runIntroSequence() {
  // Disable OrbitControls during intro
  controls.enabled = false

  // Emergence sequence with narrative timing
  // Structure: word, startTime (ms), duration (ms), isFeatured
  // Pattern: Start slow and deliberate, accelerate as viewer understands the concept
  const emergenceSequence = [
    // Royalty pair - slowest, sets the pace
    { word: 'king', start: 0, duration: 700, featured: true },
    { word: 'queen', start: 600, duration: 700, featured: true },

    // Gender pair - slightly quicker
    { word: 'man', start: 1500, duration: 600, featured: true },
    { word: 'woman', start: 2000, duration: 600, featured: true },

    // Animals - faster still
    { word: 'dog', start: 2700, duration: 500, featured: true },
    { word: 'cat', start: 3100, duration: 500, featured: true },
    { word: 'bird', start: 3500, duration: 500, featured: false },

    // Emotions - picking up speed
    { word: 'happy', start: 4000, duration: 400, featured: true },
    { word: 'sad', start: 4300, duration: 400, featured: true },
    { word: 'angry', start: 4600, duration: 400, featured: false },

    // Tech concepts - rapid
    { word: 'computer', start: 5000, duration: 350, featured: true },
    { word: 'code', start: 5300, duration: 350, featured: true },

    // Nature background - quickest finish
    { word: 'tree', start: 5650, duration: 300, featured: false },
    { word: 'ocean', start: 5900, duration: 300, featured: false },
  ]

  let introActive = true
  const startTime = Date.now()

  // Initially hide all vectors at scale 0
  Object.values(vectorObjects).forEach(obj => {
    obj.scale.set(0, 0, 0)
  })
  Object.values(labelSprites).forEach(sprite => {
    sprite.scale.set(0, 0, 0)
  })

  // Easing function (ease-out-back for bounce effect)
  function easeOutBack(t) {
    const c1 = 1.70158
    const c3 = c1 + 1
    return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2)
  }

  function cancelIntro() {
    if (!introActive) return
    introActive = false
    controls.enabled = true

    // Instantly show all vectors at full scale
    emergenceSequence.forEach(({ word, featured }) => {
      if (vectorObjects[word]) {
        vectorObjects[word].scale.set(1, 1, 1)
        vectorObjects[word].traverse(child => {
          if (child.material) {
            child.material.opacity = featured ? 0.95 : 0.35
          }
        })
      }

      if (labelSprites[word]) {
        labelSprites[word].scale.set(1.6, 0.8, 1)
        labelSprites[word].material.opacity = featured ? 0.9 : 0.3
      }
    })

    // Remove listeners
    window.removeEventListener('click', cancelIntro)
    window.removeEventListener('keydown', cancelIntro)
    window.removeEventListener('wheel', cancelIntro)
  }

  // Skip intro on intentional user interaction
  window.addEventListener('click', cancelIntro, { once: true })
  window.addEventListener('keydown', cancelIntro, { once: true })
  window.addEventListener('wheel', cancelIntro, { once: true })

  function animateVectors() {
    if (!introActive) return

    const elapsed = Date.now() - startTime

    // Animate each vector according to the sequence
    emergenceSequence.forEach(({ word, start, duration, featured }) => {
      const vectorElapsed = elapsed - start

      if (vectorElapsed > 0) {
        const progress = Math.min(vectorElapsed / duration, 1)
        const eased = easeOutBack(progress)
        const scale = eased

        const targetOpacity = featured ? 0.95 : 0.35
        const targetLabelOpacity = featured ? 0.9 : 0.3

        if (vectorObjects[word]) {
          vectorObjects[word].scale.set(scale, scale, scale)
          vectorObjects[word].traverse(child => {
            if (child.material) {
              child.material.opacity = targetOpacity * progress
            }
          })
        }

        if (labelSprites[word]) {
          const labelScale = 1.6 * eased
          labelSprites[word].scale.set(labelScale, labelScale * 0.5, 1)
          labelSprites[word].material.opacity = targetLabelOpacity * progress
        }
      }
    })

    // Check if animation is complete (last vector start + duration)
    const lastVector = emergenceSequence[emergenceSequence.length - 1]
    const totalDuration = lastVector.start + lastVector.duration

    if (elapsed < totalDuration) {
      requestAnimationFrame(animateVectors)
    } else {
      cancelIntro()
    }
  }

  requestAnimationFrame(animateVectors)
}

// Initialize onboarding tour
injectOnboardingStyles()
const tour = new OnboardingTour()

// Initialize mobile tooltip functionality
injectMobileTooltipStyles()
initMobileTooltips()

// Pulse help icons for discovery (after intro completes)
setTimeout(() => {
  pulseHelpIcons()
}, 3500)

// Start tour for first-time visitors after intro animation completes
setTimeout(() => {
  if (!tour.hasCompletedTour()) {
    tour.start()
  }
}, 3000) // Wait 3 seconds after page load for intro animation

// Help button to restart tour
const helpBtn = document.getElementById('help-tour-btn')
if (helpBtn) {
  helpBtn.addEventListener('click', () => {
    tour.restart()
  })
}

// Model selector - switch models on change
const modelSelect = document.getElementById('model-select')
if (modelSelect) {
  modelSelect.addEventListener('change', (e) => {
    const newModel = e.target.value
    switchModel(newModel)
  })
}

// Make tour accessible globally for manual triggering
window.startTour = () => tour.restart()

// Start
runIntroSequence()
animate()
