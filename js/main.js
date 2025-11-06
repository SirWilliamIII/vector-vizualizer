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
  createDistanceAnnotation
} from './three-helpers.js'
import { cosineSimilarity, euclideanDistance } from './math-utils.js'
import { pcaTo3D } from './math-utils.js'
import { initEmbeddingModel, getEmbedding, isModelReady, MODEL_CONFIGS, getCurrentModel } from './embeddings.js'
import { updateInfoPanel, showStatus, clearStatus } from './ui.js'

// Scene setup
const scene = new THREE.Scene()
scene.background = new THREE.Color(0x0a0e27)

const camera = new THREE.PerspectiveCamera(
  75,
  window.innerWidth / window.innerHeight,
  0.1,
  1000
)
camera.position.set(8, 8, 8)

const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false })
renderer.setSize(window.innerWidth, window.innerHeight)
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
const maxAnisotropy = renderer.capabilities.getMaxAnisotropy()
document.getElementById('canvas-container').appendChild(renderer.domElement)

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
const labelSpritesList = []
const connectionLines = []
const annotations = [] // Track angle arcs and distance labels
const vectorAnimations = new Map() // Track ongoing animations

// Add grid
const gridHelper = new THREE.GridHelper(20, 20, 0x3a4466, 0x1a1e33)
gridHelper.material.opacity = 0.15
gridHelper.material.transparent = true
scene.add(gridHelper)

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

// Create initial vectors
const allCoords = Object.values(vectors).map(v => v.coords)
Object.entries(vectors).forEach(([name, data]) => {
  const arrow = createVectorArrow([0, 0, 0], data.coords, data.color, allCoords)
  arrow.userData = { name, coords: data.coords, color: data.color }
  scene.add(arrow)
  vectorObjects[name] = arrow

  arrow.children.forEach((mesh) => {
    mesh.userData = { name, coords: data.coords, color: data.color }
    vectorMeshes.push(mesh)
  })

  const label = createTextLabel(name, data.color)
  const pos = data.coords
  label.position.set(pos[0] * 1.1, pos[1] * 1.1, pos[2] * 1.1)
  label.userData = { name, coords: data.coords, color: data.color }
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

function onMouseMove(event) {
  mouse.x = (event.clientX / window.innerWidth) * 2 - 1
  mouse.y = -(event.clientY / window.innerHeight) * 2 + 1

  raycaster.setFromCamera(mouse, camera)
  const meshIntersects = raycaster.intersectObjects(vectorMeshes)
  const labelIntersects = raycaster.intersectObjects(labelSpritesList)

  // Reset all meshes to default state
  vectorMeshes.forEach((mesh) => {
    if (mesh.userData.isHitbox || selectedVectors.includes(mesh.userData.name)) return
    mesh.material.emissiveIntensity = 0.15
    mesh.material.opacity = 0.95
  })

  // Reset all labels to default state
  labelSpritesList.forEach((label) => {
    if (selectedVectors.includes(label.userData.name)) return
    label.material.opacity = 0.95
    label.scale.set(2, 1, 1)
  })

  // Handle mesh hover
  if (meshIntersects.length > 0) {
    const mesh = meshIntersects[0].object
    const name = mesh.userData.name
    if (!selectedVectors.includes(name)) {
      // Highlight visible meshes of this vector (skip hitbox)
      const arrow = vectorObjects[name]
      if (arrow) {
        arrow.children.forEach((child) => {
          if (!child.userData.isHitbox) {
            child.material.emissiveIntensity = 0.5
            child.material.opacity = 1
          }
        })
      }
      // Also highlight the label
      if (labelSprites[name]) {
        labelSprites[name].material.opacity = 1
        labelSprites[name].scale.set(2.1, 1.05, 1)
      }
    }
    document.body.style.cursor = 'pointer'
  }
  // Handle label hover
  else if (labelIntersects.length > 0) {
    const label = labelIntersects[0].object
    const name = label.userData.name
    if (!selectedVectors.includes(name)) {
      label.material.opacity = 1
      label.scale.set(2.1, 1.05, 1)
      // Also highlight the vector mesh
      const arrow = vectorObjects[name]
      if (arrow) {
        arrow.children.forEach((mesh) => {
          mesh.material.emissiveIntensity = 0.5
          mesh.material.opacity = 1
        })
      }
    }
    document.body.style.cursor = 'pointer'
  } else {
    document.body.style.cursor = 'default'
  }
}

function onMouseClick(event) {
  mouse.x = (event.clientX / window.innerWidth) * 2 - 1
  mouse.y = -(event.clientY / window.innerHeight) * 2 + 1

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
      window.resetView() // Reset camera to default position
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

function updateSelection() {
  const hasSelection = selectedVectors.length > 0
  const twoSelected = selectedVectors.length === 2

  // Hide/show axes and bottom panel based on comparison mode
  if (twoSelected) {
    axesGroup.visible = false
    gridHelper.visible = false
    document.querySelector('.bottom-column').style.display = 'none'
  } else {
    axesGroup.visible = true
    gridHelper.visible = true
    document.querySelector('.bottom-column').style.display = 'flex'
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
    const similarity = cosineSimilarity(coords1, coords2)

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
      'euclidean'
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

  // Position camera above the triangle looking down - tight framing
  const cameraDistance = Math.max(boundingSphereRadius * 1.15, 4)
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

window.addEventListener('mousemove', onMouseMove)
window.addEventListener('click', onMouseClick)

// Keyboard shortcuts
window.addEventListener('keydown', (event) => {
  if (event.key === 'Escape' && selectedVectors.length > 0) {
    selectedVectors = []
    updateSelection()
  }
})

// Control functions
window.resetView = function () {
  camera.position.set(8, 8, 8)
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

  const addBtn = document.querySelector('.add-btn')
  addBtn.disabled = true

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

    arrow.children.forEach((mesh) => {
      mesh.userData = { name: word, coords: data.coords, color: data.color }
      vectorMeshes.push(mesh)
    })

    const label = createTextLabel(word, data.color)
    const pos = data.coords
    label.position.set(pos[0] * 1.1, pos[1] * 1.1, pos[2] * 1.1)
    label.userData = { name: word, coords: data.coords, color: data.color }
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

        const oldMeshes = vectorMeshes.filter((m) => m.userData.name === name)
        oldMeshes.forEach((m) => {
          const idx = vectorMeshes.indexOf(m)
          if (idx > -1) vectorMeshes.splice(idx, 1)
        })

        newArrow.children.forEach((mesh) => {
          mesh.userData = { name, coords: newCoords, color: vectors[name].color }
          vectorMeshes.push(mesh)
        })

        labelSprites[name].position.set(
          newCoords[0] * 1.1,
          newCoords[1] * 1.1,
          newCoords[2] * 1.1
        )
      }
    })

    showStatus(
      `Added "${word}" using ${MODEL_CONFIGS[selectedModel].name}! Click it to compare.`,
      'success'
    )
    input.value = ''
    addBtn.disabled = false
    setTimeout(() => clearStatus(), 3000)

  } catch (error) {
    console.error('Error adding vector:', error)
    showStatus(`Error: ${error.message}`, 'error')
    addBtn.disabled = false
    setTimeout(() => clearStatus(), 4000)
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

  // Animate connection lines
  connectionLines.forEach((line) => {
    if (line.userData.isAnimated && line.material.uniforms) {
      line.material.uniforms.time.value += 0.016 // ~60fps
    }
  })

  renderer.render(scene, camera)
}

// Handle window resize
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight
  camera.updateProjectionMatrix()
  renderer.setSize(window.innerWidth, window.innerHeight)
})

// Start
updateInfoPanel(selectedVectors)
animate()
