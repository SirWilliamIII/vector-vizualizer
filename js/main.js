import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { vectors, originalEmbeddings } from './vector-data.js';
import { createVectorArrow, createTextLabel, createConnectionLine, createAxisArrow, addAxisLabel } from './three-helpers.js';
import { cosineSimilarity } from './math-utils.js';
import { pcaTo3D } from './math-utils.js';
import { initEmbeddingModel, getEmbedding, isModelReady } from './embeddings.js';
import { updateInfoPanel, showStatus, clearStatus } from './ui.js';

// Scene setup
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x0a0a1a);

const camera = new THREE.PerspectiveCamera(
    75,
    window.innerWidth / window.innerHeight,
    0.1,
    1000
);
camera.position.set(8, 8, 8);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(window.devicePixelRatio);
document.getElementById('canvas-container').appendChild(renderer.domElement);

const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.05;

// State
let selectedVectors = [];
const vectorObjects = {};
const labelSprites = {};
const vectorMeshes = [];
const connectionLines = [];

// Add grid
const gridHelper = new THREE.GridHelper(20, 20, 0x00d4ff, 0x1a1a2e);
gridHelper.material.opacity = 0.2;
gridHelper.material.transparent = true;
scene.add(gridHelper);

// Create coordinate axes
const axesGroup = new THREE.Group();
const axisLength = 6;

const xAxis = createAxisArrow([0, 0, 0], [axisLength, 0, 0], 0xff0000, 0.05);
axesGroup.add(xAxis);
addAxisLabel('X', [axisLength + 0.5, 0, 0], 0xff0000, axesGroup);

const yAxis = createAxisArrow([0, 0, 0], [0, axisLength, 0], 0x00ff00, 0.05);
axesGroup.add(yAxis);
addAxisLabel('Y', [0, axisLength + 0.5, 0], 0x00ff00, axesGroup);

const zAxis = createAxisArrow([0, 0, 0], [0, 0, axisLength], 0x0000ff, 0.05);
axesGroup.add(zAxis);
addAxisLabel('Z', [0, 0, axisLength + 0.5], 0x0000ff, axesGroup);

scene.add(axesGroup);

// Create initial vectors
Object.entries(vectors).forEach(([name, data]) => {
    const arrow = createVectorArrow([0, 0, 0], data.coords, data.color);
    arrow.userData = { name, coords: data.coords, color: data.color };
    scene.add(arrow);
    vectorObjects[name] = arrow;

    arrow.children.forEach(mesh => {
        mesh.userData = { name, coords: data.coords, color: data.color };
        vectorMeshes.push(mesh);
    });

    const label = createTextLabel(name, data.color);
    const pos = data.coords;
    label.position.set(pos[0] * 1.1, pos[1] * 1.1, pos[2] * 1.1);
    scene.add(label);
    labelSprites[name] = label;
});

// Lighting
const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
scene.add(ambientLight);

const pointLight = new THREE.PointLight(0x00d4ff, 1, 100);
pointLight.position.set(10, 10, 10);
scene.add(pointLight);

// Raycaster for interaction
const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();

function onMouseMove(event) {
    mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
    mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
    
    raycaster.setFromCamera(mouse, camera);
    const intersects = raycaster.intersectObjects(vectorMeshes);
    
    vectorMeshes.forEach(mesh => {
        if (selectedVectors.includes(mesh.userData.name)) return;
        mesh.material.emissiveIntensity = 0.3;
        mesh.material.opacity = 0.9;
        mesh.scale.set(1, 1, 1);
    });
    
    if (intersects.length > 0) {
        const mesh = intersects[0].object;
        if (!selectedVectors.includes(mesh.userData.name)) {
            mesh.material.emissiveIntensity = 0.7;
            mesh.material.opacity = 1;
            mesh.scale.set(1.2, 1.2, 1.2);
        }
    }
}

function onMouseClick(event) {
    mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
    mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
    
    raycaster.setFromCamera(mouse, camera);
    const intersects = raycaster.intersectObjects(vectorMeshes);
    
    if (intersects.length > 0) {
        const name = intersects[0].object.userData.name;
        
        if (selectedVectors.includes(name)) {
            selectedVectors = selectedVectors.filter(v => v !== name);
        } else {
            selectedVectors.push(name);
            if (selectedVectors.length > 2) {
                selectedVectors.shift();
            }
        }
        
        updateSelection();
    }
}

function updateSelection() {
    vectorMeshes.forEach(mesh => {
        if (selectedVectors.includes(mesh.userData.name)) {
            mesh.material.emissiveIntensity = 0.8;
            mesh.material.opacity = 1;
            mesh.scale.set(1.3, 1.3, 1.3);
        } else {
            mesh.material.emissiveIntensity = 0.3;
            mesh.material.opacity = 0.9;
            mesh.scale.set(1, 1, 1);
        }
    });
    
    clearConnectionLines();
    
    if (selectedVectors.length === 2) {
        const coords1 = vectors[selectedVectors[0]].coords;
        const coords2 = vectors[selectedVectors[1]].coords;
        const similarity = cosineSimilarity(coords1, coords2);
        
        const color = similarity > 0.7 ? 0x4ade80 : similarity > 0.3 ? 0xfbbf24 : 0xf87171;
        const line = createConnectionLine(coords1, coords2, color);
        scene.add(line);
        connectionLines.push(line);
    }
    
    updateInfoPanel(selectedVectors);
}

function clearConnectionLines() {
    connectionLines.forEach(line => scene.remove(line));
    connectionLines.length = 0;
}

window.addEventListener('mousemove', onMouseMove);
window.addEventListener('click', onMouseClick);

// Control functions
window.resetView = function() {
    camera.position.set(8, 8, 8);
    camera.lookAt(0, 0, 0);
    controls.reset();
};

window.clearSelection = function() {
    selectedVectors = [];
    clearConnectionLines();
    vectorMeshes.forEach(mesh => {
        mesh.material.emissiveIntensity = 0.3;
        mesh.material.opacity = 0.9;
        mesh.scale.set(1, 1, 1);
    });
    updateInfoPanel(selectedVectors);
};

window.addCustomVector = async function() {
    const input = document.getElementById('word-input');
    const word = input.value.trim().toLowerCase();
    
    if (!word) {
        showStatus('Please enter a word', 'error');
        setTimeout(() => clearStatus(), 2000);
        return;
    }
    
    if (vectors[word]) {
        showStatus('Word already exists', 'error');
        setTimeout(() => clearStatus(), 2000);
        return;
    }
    
    const addBtn = document.querySelector('.add-btn');
    addBtn.disabled = true;
    
    try {
        if (!isModelReady()) {
            showStatus('Loading embedding model... (first time only, ~50MB)', 'loading');
            await initEmbeddingModel();
            
            for (const w of Object.keys(vectors)) {
                originalEmbeddings[w] = await getEmbedding(w);
            }
            
            showStatus('Model ready! Adding your word...', 'loading');
        } else {
            showStatus(`Getting embedding for "${word}"...`, 'loading');
        }
        
        const embedding = await getEmbedding(word);
        originalEmbeddings[word] = embedding;
        
        const projected = pcaTo3D(originalEmbeddings);
        
        if (!projected) {
            throw new Error('PCA failed');
        }
        
        const randomColor = Math.floor(Math.random() * 0xffffff);
        vectors[word] = {
            coords: projected[projected.length - 1],
            color: randomColor,
            description: 'custom word',
            isCustom: true
        };
        
        Object.keys(originalEmbeddings).forEach((w, i) => {
            if (originalEmbeddings[w]) {
                vectors[w].coords = projected[i];
            }
        });
        
        const data = vectors[word];
        const arrow = createVectorArrow([0, 0, 0], data.coords, data.color);
        arrow.userData = { name: word, coords: data.coords, color: data.color };
        scene.add(arrow);
        vectorObjects[word] = arrow;
        
        arrow.children.forEach(mesh => {
            mesh.userData = { name: word, coords: data.coords, color: data.color };
            vectorMeshes.push(mesh);
        });

        const label = createTextLabel(word, data.color);
        const pos = data.coords;
        label.position.set(pos[0] * 1.1, pos[1] * 1.1, pos[2] * 1.1);
        scene.add(label);
        labelSprites[word] = label;
        
        Object.entries(vectorObjects).forEach(([name, obj]) => {
            if (name !== word) {
                const newCoords = vectors[name].coords;
                
                scene.remove(obj);
                
                const newArrow = createVectorArrow([0, 0, 0], newCoords, vectors[name].color);
                newArrow.userData = { name, coords: newCoords, color: vectors[name].color };
                scene.add(newArrow);
                vectorObjects[name] = newArrow;
                
                const oldMeshes = vectorMeshes.filter(m => m.userData.name === name);
                oldMeshes.forEach(m => {
                    const idx = vectorMeshes.indexOf(m);
                    if (idx > -1) vectorMeshes.splice(idx, 1);
                });
                
                newArrow.children.forEach(mesh => {
                    mesh.userData = { name, coords: newCoords, color: vectors[name].color };
                    vectorMeshes.push(mesh);
                });
                
                labelSprites[name].position.set(newCoords[0] * 1.1, newCoords[1] * 1.1, newCoords[2] * 1.1);
            }
        });
        
        showStatus(`Added "${word}"! Click it to compare.`, 'success');
        input.value = '';
        addBtn.disabled = false;
        
        setTimeout(() => clearStatus(), 3000);
        
    } catch (error) {
        console.error('Error adding vector:', error);
        showStatus('Error adding word. Try again.', 'error');
        addBtn.disabled = false;
    }
};

window.clearCustomVectors = function() {
    const customWords = Object.keys(vectors).filter(w => vectors[w].isCustom);
    
    if (customWords.length === 0) {
        showStatus('No custom vectors to clear', 'error');
        setTimeout(() => clearStatus(), 2000);
        return;
    }
    
    customWords.forEach(word => {
        if (vectorObjects[word]) {
            scene.remove(vectorObjects[word]);
            delete vectorObjects[word];
        }
        if (labelSprites[word]) {
            scene.remove(labelSprites[word]);
            delete labelSprites[word];
        }
        
        delete vectors[word];
        delete originalEmbeddings[word];
        
        const meshesToRemove = vectorMeshes.filter(m => m.userData.name === word);
        meshesToRemove.forEach(m => {
            const idx = vectorMeshes.indexOf(m);
            if (idx > -1) vectorMeshes.splice(idx, 1);
        });
    });
    
    selectedVectors = selectedVectors.filter(w => !customWords.includes(w));
    clearConnectionLines();
    updateInfoPanel(selectedVectors);
    
    showStatus(`Cleared ${customWords.length} custom vector(s)`, 'success');
    setTimeout(() => clearStatus(), 2000);
};

window.startFresh = function() {
    const allWords = Object.keys(vectors);
    if (allWords.length > 0) {
        const confirmed = confirm(`Clear all ${allWords.length} vectors and start fresh?`);
        if (!confirmed) return;
    }
    
    allWords.forEach(word => {
        if (vectorObjects[word]) {
            scene.remove(vectorObjects[word]);
            delete vectorObjects[word];
        }
        if (labelSprites[word]) {
            scene.remove(labelSprites[word]);
            delete labelSprites[word];
        }
        
        const meshesToRemove = vectorMeshes.filter(m => m.userData.name === word);
        meshesToRemove.forEach(m => {
            const idx = vectorMeshes.indexOf(m);
            if (idx > -1) vectorMeshes.splice(idx, 1);
        });
    });
    
    Object.keys(vectors).forEach(key => delete vectors[key]);
    Object.keys(originalEmbeddings).forEach(key => delete originalEmbeddings[key]);
    
    selectedVectors = [];
    clearConnectionLines();
    
    updateInfoPanel(selectedVectors);
    showStatus('Canvas cleared! Add your first word below.', 'success');
    setTimeout(() => clearStatus(), 3000);
};

// Handle Enter key in input
document.addEventListener('DOMContentLoaded', () => {
    const input = document.getElementById('word-input');
    if (input) {
        input.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                window.addCustomVector();
            }
        });
    }
});

// Animation loop
function animate() {
    requestAnimationFrame(animate);
    controls.update();
    renderer.render(scene, camera);
}

// Handle window resize
window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});

// Start
updateInfoPanel(selectedVectors);
animate();
