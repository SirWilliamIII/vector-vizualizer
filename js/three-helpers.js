import * as THREE from 'three';

export function createVectorArrow(start, end, color) {
    const direction = new THREE.Vector3(...end).sub(new THREE.Vector3(...start));
    const length = direction.length();
    
    const arrow = new THREE.Group();
    
    const thickness = 0.035;
    
    // Sleek modern shaft with subtle taper
    const shaftLength = length * 0.78;
    const shaftGeometry = new THREE.CylinderGeometry(thickness * 0.7, thickness * 0.85, shaftLength, 32);
    const shaftMaterial = new THREE.MeshPhysicalMaterial({ 
        color: color,
        emissive: color,
        emissiveIntensity: 0.2,
        metalness: 0.2,
        roughness: 0.15,
        transparent: true,
        opacity: 0.92,
        clearcoat: 0.8,
        clearcoatRoughness: 0.2
    });
    const shaft = new THREE.Mesh(shaftGeometry, shaftMaterial);
    
    // Sharp, modern cone head
    const coneHeight = length * 0.22;
    const coneGeometry = new THREE.ConeGeometry(thickness * 2.5, coneHeight, 32);
    const coneMaterial = new THREE.MeshPhysicalMaterial({ 
        color: color,
        emissive: color,
        emissiveIntensity: 0.3,
        metalness: 0.3,
        roughness: 0.1,
        transparent: true,
        opacity: 0.95,
        clearcoat: 1.0,
        clearcoatRoughness: 0.1
    });
    const cone = new THREE.Mesh(coneGeometry, coneMaterial);
    cone.position.y = shaftLength + coneHeight / 2;
    
    shaft.position.y = shaftLength / 2;
    
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
    const context = canvas.getContext('2d', { alpha: true, willReadFrequently: false });
    
    // Higher resolution for sharper text
    const scale = 3;
    canvas.width = 512 * scale;
    canvas.height = 256 * scale;
    context.scale(scale, scale);
    
    // Clear with transparency
    context.clearRect(0, 0, 512, 256);
    
    // Enable better text rendering
    context.imageSmoothingEnabled = true;
    context.imageSmoothingQuality = 'high';
    
    // Measure text for dynamic sizing
    context.font = '600 56px -apple-system, BlinkMacSystemFont, "Segoe UI", "Helvetica Neue", sans-serif';
    context.textRendering = 'geometricPrecision';
    const metrics = context.measureText(text);
    const textWidth = metrics.width;
    const padding = 32;
    const boxWidth = textWidth + padding * 2;
    const boxHeight = 96;
    const boxX = (512 - boxWidth) / 2;
    const boxY = (256 - boxHeight) / 2;
    const borderRadius = 16;
    
    // Create gradient background with glass morphism effect
    const gradient = context.createLinearGradient(boxX, boxY, boxX, boxY + boxHeight);
    gradient.addColorStop(0, 'rgba(25, 30, 50, 0.85)');
    gradient.addColorStop(1, 'rgba(15, 20, 40, 0.75)');
    
    // Draw outer glow
    context.shadowColor = `rgba(${(color >> 16) & 255}, ${(color >> 8) & 255}, ${color & 255}, 0.4)`;
    context.shadowBlur = 20;
    context.shadowOffsetX = 0;
    context.shadowOffsetY = 0;
    
    // Draw background with rounded corners
    context.fillStyle = gradient;
    context.beginPath();
    context.roundRect(boxX, boxY, boxWidth, boxHeight, borderRadius);
    context.fill();
    
    // Reset shadow for border
    context.shadowBlur = 0;
    
    // Draw subtle border with gradient
    const borderGradient = context.createLinearGradient(boxX, boxY, boxX, boxY + boxHeight);
    borderGradient.addColorStop(0, `rgba(${(color >> 16) & 255}, ${(color >> 8) & 255}, ${color & 255}, 0.3)`);
    borderGradient.addColorStop(0.5, `rgba(${(color >> 16) & 255}, ${(color >> 8) & 255}, ${color & 255}, 0.15)`);
    borderGradient.addColorStop(1, `rgba(${(color >> 16) & 255}, ${(color >> 8) & 255}, ${color & 255}, 0.3)`);
    
    context.strokeStyle = borderGradient;
    context.lineWidth = 2;
    context.beginPath();
    context.roundRect(boxX, boxY, boxWidth, boxHeight, borderRadius);
    context.stroke();
    
    // Add subtle inner highlight at top
    const highlightGradient = context.createLinearGradient(boxX, boxY, boxX, boxY + 30);
    highlightGradient.addColorStop(0, 'rgba(255, 255, 255, 0.12)');
    highlightGradient.addColorStop(1, 'rgba(255, 255, 255, 0)');
    
    context.fillStyle = highlightGradient;
    context.beginPath();
    context.roundRect(boxX + 1, boxY + 1, boxWidth - 2, 30, borderRadius - 1);
    context.fill();
    
    // Modern text rendering with subtle glow
    context.shadowColor = `rgba(${(color >> 16) & 255}, ${(color >> 8) & 255}, ${color & 255}, 0.6)`;
    context.shadowBlur = 8;
    context.fillStyle = `#${color.toString(16).padStart(6, '0')}`;
    context.textAlign = 'center';
    context.textBaseline = 'middle';
    context.fillText(text, 256, 128);
    
    const texture = new THREE.CanvasTexture(canvas);
    texture.minFilter = THREE.LinearFilter;
    texture.magFilter = THREE.LinearFilter;
    texture.generateMipmaps = false;
    texture.needsUpdate = true;
    
    const spriteMaterial = new THREE.SpriteMaterial({ 
        map: texture,
        transparent: true,
        opacity: 0.95,
        depthTest: true,
        depthWrite: false
    });
    const sprite = new THREE.Sprite(spriteMaterial);
    sprite.scale.set(2, 1, 1);
    
    return sprite;
}

export function createConnectionLine(start, end, color) {
    const startVec = new THREE.Vector3(...start);
    const endVec = new THREE.Vector3(...end);
    const distance = startVec.distanceTo(endVec);
    
    // Create tube geometry for better visual appearance
    const curve = new THREE.LineCurve3(startVec, endVec);
    const tubeGeometry = new THREE.TubeGeometry(curve, 20, 0.015, 8, false);
    
    // Custom shader material for animated gradient
    const material = new THREE.ShaderMaterial({
        uniforms: {
            time: { value: 0 },
            color1: { value: new THREE.Color(color) },
            color2: { value: new THREE.Color(color).multiplyScalar(0.3) }
        },
        vertexShader: `
            varying vec2 vUv;
            void main() {
                vUv = uv;
                gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
            }
        `,
        fragmentShader: `
            uniform float time;
            uniform vec3 color1;
            uniform vec3 color2;
            varying vec2 vUv;
            
            void main() {
                // Animated gradient flow
                float flow = fract(vUv.x * 2.0 - time * 0.5);
                float pulse = sin(flow * 3.14159) * 0.5 + 0.5;
                
                vec3 color = mix(color2, color1, pulse);
                float alpha = 0.6 + pulse * 0.3;
                
                gl_FragColor = vec4(color, alpha);
            }
        `,
        transparent: true,
        side: THREE.DoubleSide
    });
    
    const tube = new THREE.Mesh(tubeGeometry, material);
    tube.userData.isAnimated = true;
    
    return tube;
}

export function createAxisArrow(start, end, color, thickness) {
    const direction = new THREE.Vector3(...end).sub(new THREE.Vector3(...start));
    const length = direction.length();
    
    const arrow = new THREE.Group();
    
    // Thin, dashed line style for axis
    const points = [];
    const segments = 20;
    for (let i = 0; i <= segments; i++) {
        const t = i / segments;
        points.push(new THREE.Vector3(0, t * length * 0.92, 0));
    }
    
    const lineGeometry = new THREE.BufferGeometry().setFromPoints(points);
    const lineMaterial = new THREE.LineDashedMaterial({ 
        color: color,
        transparent: true,
        opacity: 0.3,
        dashSize: 0.15,
        gapSize: 0.1,
        linewidth: 1
    });
    const line = new THREE.Line(lineGeometry, lineMaterial);
    line.computeLineDistances();
    
    arrow.add(line);
    
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

export function createAngleArc(start, end, color, angleDegrees) {
    const group = new THREE.Group();
    
    const v1 = new THREE.Vector3(...start);
    const v2 = new THREE.Vector3(...end);
    
    const angleRad = Math.acos(v1.normalize().dot(v2.normalize()));
    const radius = Math.min(v1.length(), v2.length()) * 0.45;
    
    const segments = 32;
    const points = [];
    
    v1.normalize();
    v2.normalize();
    
    for (let i = 0; i <= segments; i++) {
        const t = i / segments;
        const currentAngle = angleRad * t;
        
        const axis = new THREE.Vector3().crossVectors(v1, v2).normalize();
        const rotatedVector = v1.clone().applyAxisAngle(axis, currentAngle);
        points.push(rotatedVector.multiplyScalar(radius));
    }
    
    const arcGeometry = new THREE.BufferGeometry().setFromPoints(points);
    const arcMaterial = new THREE.LineBasicMaterial({
        color: color,
        transparent: true,
        opacity: 0.8,
        linewidth: 3
    });
    const arc = new THREE.Line(arcGeometry, arcMaterial);
    group.add(arc);
    
    const tubeGeometry = new THREE.TubeGeometry(
        new THREE.CatmullRomCurve3(points),
        segments,
        0.03,
        8,
        false
    );
    const tubeMaterial = new THREE.MeshBasicMaterial({
        color: color,
        transparent: true,
        opacity: 0.7
    });
    const tube = new THREE.Mesh(tubeGeometry, tubeMaterial);
    group.add(tube);
    
    const midAngle = angleRad / 2;
    const axis = new THREE.Vector3().crossVectors(v1, v2).normalize();
    const labelPos = v1.clone().applyAxisAngle(axis, midAngle).multiplyScalar(radius * 2.2);
    
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    const scale = 2;
    canvas.width = 256 * scale;
    canvas.height = 128 * scale;
    context.scale(scale, scale);
    
    context.clearRect(0, 0, 256, 128);
    context.font = 'bold 32px -apple-system, sans-serif';
    context.fillStyle = '#cccccc';
    context.textAlign = 'center';
    context.textBaseline = 'middle';
    context.shadowColor = 'rgba(0, 0, 0, 0.8)';
    context.shadowBlur = 8;
    context.fillText(`${angleDegrees.toFixed(1)}°`, 128, 64);
    
    const texture = new THREE.CanvasTexture(canvas);
    texture.minFilter = THREE.LinearFilter;
    texture.magFilter = THREE.LinearFilter;
    
    const spriteMaterial = new THREE.SpriteMaterial({
        map: texture,
        transparent: true,
        opacity: 0.95
    });
    const sprite = new THREE.Sprite(spriteMaterial);
    sprite.position.copy(labelPos);
    sprite.scale.set(1.5, 0.75, 1);
    group.add(sprite);
    
    return group;
}

export function createDistanceAnnotation(start, end, distance, type = 'euclidean') {
    const group = new THREE.Group();
    
    const startVec = new THREE.Vector3(...start);
    const endVec = new THREE.Vector3(...end);
    const midpoint = new THREE.Vector3().addVectors(startVec, endVec).multiplyScalar(0.5);
    
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d', { alpha: true, willReadFrequently: false });
    const scale = 4;
    canvas.width = 512 * scale;
    canvas.height = 128 * scale;
    context.scale(scale, scale);
    
    context.clearRect(0, 0, 512, 128);
    context.imageSmoothingEnabled = true;
    context.imageSmoothingQuality = 'high';
    
    const distanceText = distance.toFixed(3);
    const chars = distanceText.split('');
    
    context.font = 'bold 52px -apple-system, BlinkMacSystemFont, sans-serif';
    context.fillStyle = '#cccccc';
    context.textAlign = 'center';
    context.textBaseline = 'middle';
    context.shadowColor = 'rgba(0, 0, 0, 0.8)';
    context.shadowBlur = 12;
    
    const charSpacing = 10;
    const totalWidth = context.measureText(distanceText).width + (chars.length - 1) * charSpacing;
    let xPos = 256 - totalWidth / 2;
    
    chars.forEach((char, i) => {
        const charWidth = context.measureText(char).width;
        context.fillText(char, xPos + charWidth / 2, 64);
        xPos += charWidth + charSpacing;
    });
    
    const texture = new THREE.CanvasTexture(canvas);
    texture.minFilter = THREE.LinearFilter;
    texture.magFilter = THREE.LinearFilter;
    
    const spriteMaterial = new THREE.SpriteMaterial({
        map: texture,
        transparent: true,
        opacity: 0.95,
        depthTest: true,
        depthWrite: false,
        sizeAttenuation: true
    });
    const sprite = new THREE.Sprite(spriteMaterial);
    
    const direction = new THREE.Vector3().subVectors(endVec, startVec);
    
    const up = new THREE.Vector3(0, 1, 0);
    const perpendicular = new THREE.Vector3().crossVectors(direction, up).normalize();
    if (perpendicular.length() < 0.1) {
        perpendicular.crossVectors(direction, new THREE.Vector3(1, 0, 0)).normalize();
    }
    
    const offset = perpendicular.multiplyScalar(1.8);
    sprite.position.copy(midpoint).add(offset);
    sprite.scale.set(2, 1, 1);
    sprite.renderOrder = 999;
    group.add(sprite);
    
    const tickMaterial = new THREE.LineBasicMaterial({
        color: 0xffffff,
        transparent: true,
        opacity: 0.6
    });
    
    const tickDir = perpendicular.clone().normalize();
    const startTick1 = startVec.clone().add(tickDir.clone().multiplyScalar(1.5));
    const startTick2 = startVec.clone().add(tickDir.clone().multiplyScalar(2.1));
    const startTickGeometry = new THREE.BufferGeometry().setFromPoints([startTick1, startTick2]);
    const startTickLine = new THREE.Line(startTickGeometry, tickMaterial);
    group.add(startTickLine);
    
    const endTick1 = endVec.clone().add(tickDir.clone().multiplyScalar(1.5));
    const endTick2 = endVec.clone().add(tickDir.clone().multiplyScalar(2.1));
    const endTickGeometry = new THREE.BufferGeometry().setFromPoints([endTick1, endTick2]);
    const endTickLine = new THREE.Line(endTickGeometry, tickMaterial);
    group.add(endTickLine);
    
    const guideStart = startVec.clone().add(tickDir.clone().multiplyScalar(1.8));
    const guideEnd = endVec.clone().add(tickDir.clone().multiplyScalar(1.8));
    const guideGeometry = new THREE.BufferGeometry().setFromPoints([guideStart, guideEnd]);
    const guideMaterial = new THREE.LineDashedMaterial({
        color: 0xffffff,
        transparent: true,
        opacity: 0.3,
        dashSize: 0.1,
        gapSize: 0.1
    });
    const guideLine = new THREE.Line(guideGeometry, guideMaterial);
    guideLine.computeLineDistances();
    group.add(guideLine);
    
    return group;
}
