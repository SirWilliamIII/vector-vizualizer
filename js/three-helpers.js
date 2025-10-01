import * as THREE from 'three';

export function createVectorArrow(start, end, color) {
    const direction = new THREE.Vector3(...end).sub(new THREE.Vector3(...start));
    const length = direction.length();
    
    const arrow = new THREE.Group();
    
    const thickness = 0.08;
    
    // Shaft
    const shaftGeometry = new THREE.CylinderGeometry(thickness, thickness, length * 0.8, 8);
    const shaftMaterial = new THREE.MeshPhongMaterial({ 
        color: color,
        emissive: color,
        emissiveIntensity: 0.3,
        transparent: true,
        opacity: 0.9
    });
    const shaft = new THREE.Mesh(shaftGeometry, shaftMaterial);
    
    // Cone head
    const coneGeometry = new THREE.ConeGeometry(thickness * 3, length * 0.2, 8);
    const coneMaterial = new THREE.MeshPhongMaterial({ 
        color: color,
        emissive: color,
        emissiveIntensity: 0.4,
        transparent: true,
        opacity: 0.9
    });
    const cone = new THREE.Mesh(coneGeometry, coneMaterial);
    cone.position.y = length * 0.5;
    
    shaft.position.y = length * 0.4;
    
    arrow.add(shaft);
    arrow.add(cone);
    
    arrow.position.set(...start);
    const axis = new THREE.Vector3(0, 1, 0);
    const quaternion = new THREE.Quaternion().setFromUnitVectors(
        axis,
        direction.normalize()
    );
    arrow.quaternion.copy(quaternion);
    
    return arrow;
}

export function createTextLabel(text, color) {
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    canvas.width = 512;
    canvas.height = 256;
    
    context.fillStyle = `#${color.toString(16).padStart(6, '0')}`;
    context.font = 'Bold 64px Monaco';
    context.textAlign = 'center';
    context.textBaseline = 'middle';
    context.fillText(text, 256, 128);
    
    const texture = new THREE.CanvasTexture(canvas);
    const spriteMaterial = new THREE.SpriteMaterial({ 
        map: texture,
        transparent: true
    });
    const sprite = new THREE.Sprite(spriteMaterial);
    sprite.scale.set(2, 1, 1);
    
    return sprite;
}

export function createConnectionLine(start, end, color) {
    const geometry = new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(...start),
        new THREE.Vector3(...end)
    ]);
    
    const material = new THREE.LineBasicMaterial({ 
        color: color,
        transparent: true,
        opacity: 0.6,
        linewidth: 2
    });
    
    return new THREE.Line(geometry, material);
}

export function createAxisArrow(start, end, color, thickness) {
    const direction = new THREE.Vector3(...end).sub(new THREE.Vector3(...start));
    const length = direction.length();
    
    const arrow = new THREE.Group();
    
    const shaftGeometry = new THREE.CylinderGeometry(thickness, thickness, length * 0.9, 8);
    const shaftMaterial = new THREE.MeshPhongMaterial({ 
        color: color,
        transparent: true,
        opacity: 0.3
    });
    const shaft = new THREE.Mesh(shaftGeometry, shaftMaterial);
    
    const coneGeometry = new THREE.ConeGeometry(thickness * 2, length * 0.1, 8);
    const coneMaterial = new THREE.MeshPhongMaterial({ 
        color: color,
        transparent: true,
        opacity: 0.4
    });
    const cone = new THREE.Mesh(coneGeometry, coneMaterial);
    cone.position.y = length * 0.5;
    
    shaft.position.y = length * 0.45;
    
    arrow.add(shaft);
    arrow.add(cone);
    
    arrow.position.set(...start);
    const axis = new THREE.Vector3(0, 1, 0);
    const quaternion = new THREE.Quaternion().setFromUnitVectors(
        axis,
        direction.normalize()
    );
    arrow.quaternion.copy(quaternion);
    
    return arrow;
}

export function addAxisLabel(text, position, color, scene) {
    const sprite = createTextLabel(text, color);
    sprite.position.set(...position);
    sprite.scale.set(0.8, 0.4, 1);
    scene.add(sprite);
    return sprite;
}
