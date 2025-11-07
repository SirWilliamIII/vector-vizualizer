import * as THREE from 'three';

export function createVectorArrow(start, end, color, allVectorCoords = []) {
    const direction = new THREE.Vector3(...end).sub(new THREE.Vector3(...start));
    const length = direction.length();

    // Calculate minimum distance to other vectors for dynamic hitbox sizing
    let minDistance = Infinity;
    const currentVec = new THREE.Vector3(...end);
    for (const otherCoords of allVectorCoords) {
        if (otherCoords === end) continue; // Skip self
        const otherVec = new THREE.Vector3(...otherCoords);
        const dist = currentVec.distanceTo(otherVec);
        if (dist < minDistance) {
            minDistance = dist;
        }
    }

    const arrow = new THREE.Group();

    // Modern, thin elegant line
    const thinThickness = 0.015; // Thin at base
    const thickThickness = 0.035; // Thicker at arrowhead

    // Tapered shaft - gracefully flows toward arrowhead
    const shaftLength = length * 0.88;
    const shaftGeometry = new THREE.CylinderGeometry(thickThickness, thinThickness, shaftLength, 32, 1, true);
    const shaftMaterial = new THREE.MeshPhysicalMaterial({
        color,
        emissive: new THREE.Color(color).multiplyScalar(0.35),
        emissiveIntensity: 0.4,
        roughness: 0.25,
        metalness: 0.65,
        transmission: 0.25,
        thickness: 1.1,
        clearcoat: 0.6,
        clearcoatRoughness: 0.1,
        transparent: true,
        opacity: 0.92
    });

    // Add edge glow via shader modification
    shaftMaterial.onBeforeCompile = (shader) => {
        shader.fragmentShader = shader.fragmentShader.replace(
            '#include <output_fragment>',
            `
            // Fresnel edge glow
            vec3 viewDirection = normalize(vViewPosition);
            vec3 worldNormal = normalize((vec4(normal, 0.0) * viewMatrix).xyz);
            float fresnel = pow(1.0 - abs(dot(viewDirection, worldNormal)), 2.0);

            // Add subtle rim light
            gl_FragColor.rgb += vec3(${((color >> 16) & 255) / 255}, ${((color >> 8) & 255) / 255}, ${(color & 255) / 255}) * fresnel * 0.3;

            #include <output_fragment>
            `
        );
    };

    const shaft = new THREE.Mesh(shaftGeometry, shaftMaterial);

    // Sharp, minimal arrowhead - flows from tapered shaft
    const coneHeight = length * 0.12;
    const coneGeometry = new THREE.ConeGeometry(thickThickness * 1.9, coneHeight, 32, 1, true);
    const coneMaterial = new THREE.MeshPhysicalMaterial({
        color,
        emissive: new THREE.Color(color).multiplyScalar(0.45),
        emissiveIntensity: 0.5,
        roughness: 0.2,
        metalness: 0.55,
        transmission: 0.35,
        thickness: 1.2,
        clearcoat: 0.7,
        clearcoatRoughness: 0.08,
        transparent: true,
        opacity: 0.98
    });

    // Add edge glow to cone as well
    coneMaterial.onBeforeCompile = (shader) => {
        shader.fragmentShader = shader.fragmentShader.replace(
            '#include <output_fragment>',
            `
            // Fresnel edge glow
            vec3 viewDirection = normalize(vViewPosition);
            vec3 worldNormal = normalize((vec4(normal, 0.0) * viewMatrix).xyz);
            float fresnel = pow(1.0 - abs(dot(viewDirection, worldNormal)), 2.5);

            // Stronger glow on cone tip
            gl_FragColor.rgb += vec3(${((color >> 16) & 255) / 255}, ${((color >> 8) & 255) / 255}, ${(color & 255) / 255}) * fresnel * 0.5;

            #include <output_fragment>
            `
        );
    };

    const cone = new THREE.Mesh(coneGeometry, coneMaterial);
    cone.position.y = shaftLength + coneHeight / 2;

    shaft.position.y = shaftLength / 2;

    arrow.add(shaft);
    arrow.add(cone);

    const glowGeometry = new THREE.CylinderGeometry(thickThickness * 1.4, thinThickness * 1.2, shaftLength, 32, 1, true);
    const glowMaterial = new THREE.MeshBasicMaterial({
        color,
        transparent: true,
        opacity: 0.25,
        blending: THREE.AdditiveBlending,
        depthWrite: false
    });
    const glow = new THREE.Mesh(glowGeometry, glowMaterial);
    glow.position.y = shaftLength / 2;
    arrow.add(glow);

    const baseGlowGeometry = new THREE.RingGeometry(thickThickness * 2.2, thickThickness * 3.1, 32);
    const baseGlowMaterial = new THREE.MeshBasicMaterial({
        color,
        transparent: true,
        opacity: 0.35,
        blending: THREE.AdditiveBlending,
        side: THREE.DoubleSide,
        depthWrite: false
    });
    const baseGlow = new THREE.Mesh(baseGlowGeometry, baseGlowMaterial);
    baseGlow.rotation.x = -Math.PI / 2;
    baseGlow.position.y = 0.01;
    arrow.add(baseGlow);

    const registerPart = (mesh, part) => {
        mesh.userData.part = part;
        mesh.userData.baseScale = mesh.scale.clone();
        if (mesh.material && typeof mesh.material.opacity === 'number') {
            mesh.userData.baseOpacity = mesh.material.opacity;
        } else {
            mesh.userData.baseOpacity = 1;
        }
    };

    registerPart(shaft, 'shaft');
    registerPart(cone, 'cone');
    registerPart(glow, 'glow');
    registerPart(baseGlow, 'baseGlow');

    // Add invisible hitbox for easier clicking - dynamically sized based on proximity
    let hitboxMultiplier = 10; // Default: large hitbox

    // If vectors are close together, make hitbox more precise
    if (minDistance < 2) {
        hitboxMultiplier = 4; // Tight hitbox for clustered vectors
    } else if (minDistance < 4) {
        hitboxMultiplier = 6; // Medium hitbox for somewhat close vectors
    }

    const hitboxRadius = thickThickness * hitboxMultiplier;
    const hitboxGeometry = new THREE.CylinderGeometry(hitboxRadius, hitboxRadius, length, 8);
    const hitboxMaterial = new THREE.MeshBasicMaterial({
        transparent: true,
        opacity: 0,
        visible: false,
        colorWrite: false,
        depthTest: true,
        depthWrite: false,
        side: THREE.DoubleSide
    });
    const hitbox = new THREE.Mesh(hitboxGeometry, hitboxMaterial);
    hitbox.position.y = length / 2;
    hitbox.visible = true; // Keep visible for raycasting but material won't render
    hitbox.renderOrder = -1; // Render behind everything
    // Copy user data to hitbox so raycaster can identify it
    hitbox.userData.isHitbox = true;
    arrow.add(hitbox);

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

    // Higher resolution for sharp rendering
    const scale = 4;
    canvas.width = 512 * scale;
    canvas.height = 160 * scale;
    context.scale(scale, scale);

    // Clear with full transparency
    context.clearRect(0, 0, 512, 160);

    // Enable better text rendering
    context.imageSmoothingEnabled = true;
    context.imageSmoothingQuality = 'high';

    // Modern, clean sans-serif font
    context.font = '500 48px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
    context.textAlign = 'left';
    context.textBaseline = 'middle';
    context.fillStyle = `#${color.toString(16).padStart(6, '0')}`;

    // Manual letter spacing for better readability
    const letters = text.split('');
    const letterSpacing = 6; // pixels between letters
    let totalWidth = 0;

    // Calculate total width with spacing
    letters.forEach(letter => {
        totalWidth += context.measureText(letter).width + letterSpacing;
    });
    totalWidth -= letterSpacing; // Remove trailing space

    let xPos = 256 - totalWidth / 2;

    // Draw with shadow backdrop
    context.shadowColor = 'rgba(10, 14, 39, 0.8)';
    context.shadowBlur = 16;
    context.shadowOffsetX = 0;
    context.shadowOffsetY = 0;

    letters.forEach(letter => {
        context.fillText(letter, xPos, 80);
        xPos += context.measureText(letter).width + letterSpacing;
    });

    // Add subtle colored glow (redraw with glow)
    xPos = 256 - totalWidth / 2;
    context.shadowColor = `rgba(${(color >> 16) & 255}, ${(color >> 8) & 255}, ${color & 255}, 0.4)`;
    context.shadowBlur = 12;

    letters.forEach(letter => {
        context.fillText(letter, xPos, 80);
        xPos += context.measureText(letter).width + letterSpacing;
    });

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
        depthWrite: false,
        sizeAttenuation: true
    });
    const sprite = new THREE.Sprite(spriteMaterial);
    sprite.scale.set(2, 1, 1);
    sprite.userData.baseScale = sprite.scale.clone();

    return sprite;
}

export function createConnectionLine(start, end, color) {
    const startVec = new THREE.Vector3(...start);
    const endVec = new THREE.Vector3(...end);
    const curve = new THREE.LineCurve3(startVec, endVec);

    const coreGeometry = new THREE.TubeGeometry(curve, 48, 0.016, 32, false);
    const glowGeometry = new THREE.TubeGeometry(curve, 48, 0.038, 32, false);

    const coreMaterial = new THREE.ShaderMaterial({
        uniforms: {
            time: { value: 0 },
            colorMain: { value: new THREE.Color(color) },
            colorGlow: { value: new THREE.Color(color).multiplyScalar(1.2) }
        },
        vertexShader: `
            varying float vAlong;
            void main() {
                vAlong = uv.x;
                gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
            }
        `,
        fragmentShader: `
            uniform float time;
            uniform vec3 colorMain;
            uniform vec3 colorGlow;
            varying float vAlong;

            void main() {
                float pulse = 0.55 + 0.45 * sin((vAlong * 6.28318) - time * 1.5);
                vec3 color = mix(colorMain, colorGlow, pulse);
                float alpha = 0.75 + 0.15 * pulse;
                gl_FragColor = vec4(color, alpha);
            }
        `,
        transparent: true,
        side: THREE.DoubleSide,
        depthWrite: false
    });

    const glowMaterial = new THREE.MeshBasicMaterial({
        color,
        transparent: true,
        opacity: 0.22,
        blending: THREE.AdditiveBlending,
        depthWrite: false
    });

    const core = new THREE.Mesh(coreGeometry, coreMaterial);
    const glow = new THREE.Mesh(glowGeometry, glowMaterial);

    const group = new THREE.Group();
    group.add(glow);
    group.add(core);

    group.userData.isAnimated = true;
    group.userData.animatedMaterial = coreMaterial;

    return group;
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
    
    const segments = 48;
    const points = [];
    
    v1.normalize();
    v2.normalize();
    
    const axis = new THREE.Vector3().crossVectors(v1, v2).normalize();
    for (let i = 0; i <= segments; i++) {
        const t = i / segments;
        const currentAngle = angleRad * t;
        const rotatedVector = v1.clone().applyAxisAngle(axis, currentAngle);
        points.push(rotatedVector.multiplyScalar(radius));
    }
    
    const arcGeometry = new THREE.BufferGeometry().setFromPoints(points);
    const arcMaterial = new THREE.LineBasicMaterial({
        color: color,
        transparent: true,
        opacity: 0.9,
        linewidth: 2
    });
    const arc = new THREE.Line(arcGeometry, arcMaterial);
    group.add(arc);
    
    const glowGeometry = new THREE.TubeGeometry(
        new THREE.CatmullRomCurve3(points),
        segments,
        0.02,
        16,
        false
    );
    const glowMaterial = new THREE.MeshBasicMaterial({
        color: color,
        transparent: true,
        opacity: 0.25,
        blending: THREE.AdditiveBlending,
        depthWrite: false
    });
    const glow = new THREE.Mesh(glowGeometry, glowMaterial);
    group.add(glow);
    
    const midAngle = angleRad / 2;
    const labelPos = v1.clone().applyAxisAngle(axis, midAngle).multiplyScalar(radius * 2.1);
    
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    const scale = 3;
    canvas.width = 256 * scale;
    canvas.height = 128 * scale;
    context.scale(scale, scale);
    
    const labelWidth = 180;
    const labelHeight = 68;
    const labelX = (256 - labelWidth) / 2;
    const labelY = (128 - labelHeight) / 2;
    
    const accent = new THREE.Color(color);
    const accentRGB = {
        r: Math.round(accent.r * 255),
        g: Math.round(accent.g * 255),
        b: Math.round(accent.b * 255)
    };

    context.clearRect(0, 0, 256, 128);
    context.beginPath();
    context.moveTo(labelX + 20, labelY);
    context.lineTo(labelX + labelWidth - 20, labelY);
    context.quadraticCurveTo(labelX + labelWidth, labelY, labelX + labelWidth, labelY + 20);
    context.lineTo(labelX + labelWidth, labelY + labelHeight - 20);
    context.quadraticCurveTo(labelX + labelWidth, labelY + labelHeight, labelX + labelWidth - 20, labelY + labelHeight);
    context.lineTo(labelX + 20, labelY + labelHeight);
    context.quadraticCurveTo(labelX, labelY + labelHeight, labelX, labelY + labelHeight - 20);
    context.lineTo(labelX, labelY + 20);
    context.quadraticCurveTo(labelX, labelY, labelX + 20, labelY);
    context.closePath();
    context.fillStyle = `rgba(${accentRGB.r}, ${accentRGB.g}, ${accentRGB.b}, 0.18)`;
    context.strokeStyle = `rgba(${accentRGB.r}, ${accentRGB.g}, ${accentRGB.b}, 0.45)`;
    context.lineWidth = 3;
    context.fill();
    context.stroke();
    
    context.font = '600 32px -apple-system, sans-serif';
    context.fillStyle = '#f8fafc';
    context.textAlign = 'center';
    context.textBaseline = 'middle';
    context.fillText(`${angleDegrees.toFixed(1)}°`, 128, 64);
    
    const texture = new THREE.CanvasTexture(canvas);
    texture.minFilter = THREE.LinearFilter;
    texture.magFilter = THREE.LinearFilter;
    
    const spriteMaterial = new THREE.SpriteMaterial({
        map: texture,
        transparent: true,
        opacity: 0.95,
        depthTest: true,
        depthWrite: false
    });
    const sprite = new THREE.Sprite(spriteMaterial);
    sprite.position.copy(labelPos);
    sprite.scale.set(1.6, 0.8, 1);
    sprite.userData.depthResponsive = true;
    sprite.userData.baseScale = sprite.scale.clone();
    sprite.userData.baseOpacity = spriteMaterial.opacity;
    group.add(sprite);
    
    const anchorPoint = v1.clone().applyAxisAngle(axis, midAngle).multiplyScalar(radius * 1.05);
    const leaderGeometry = new THREE.BufferGeometry().setFromPoints([
        labelPos.clone().lerp(anchorPoint, 0.25),
        anchorPoint
    ]);
    const leaderMaterial = new THREE.LineBasicMaterial({
        color: 0xe2e8f0,
        transparent: true,
        opacity: 0.45
    });
    const leaderLine = new THREE.Line(leaderGeometry, leaderMaterial);
    group.add(leaderLine);
    
    return group;
}

export function createDistanceAnnotation(start, end, distance, type = 'euclidean', color = 0xffffff) {
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
    const accent = new THREE.Color(color);
    const accentRGB = {
        r: Math.round(accent.r * 255),
        g: Math.round(accent.g * 255),
        b: Math.round(accent.b * 255)
    };

    const labelWidth = 320;
    const labelHeight = 90;
    const labelX = (512 - labelWidth) / 2;
    const labelY = (128 - labelHeight) / 2;
    
    context.beginPath();
    context.moveTo(labelX + 28, labelY);
    context.lineTo(labelX + labelWidth - 28, labelY);
    context.quadraticCurveTo(labelX + labelWidth, labelY, labelX + labelWidth, labelY + 28);
    context.lineTo(labelX + labelWidth, labelY + labelHeight - 28);
    context.quadraticCurveTo(labelX + labelWidth, labelY + labelHeight, labelX + labelWidth - 28, labelY + labelHeight);
    context.lineTo(labelX + 28, labelY + labelHeight);
    context.quadraticCurveTo(labelX, labelY + labelHeight, labelX, labelY + labelHeight - 28);
    context.lineTo(labelX, labelY + 28);
    context.quadraticCurveTo(labelX, labelY, labelX + 28, labelY);
    context.closePath();
    context.fillStyle = `rgba(${accentRGB.r}, ${accentRGB.g}, ${accentRGB.b}, 0.16)`;
    context.strokeStyle = `rgba(${accentRGB.r}, ${accentRGB.g}, ${accentRGB.b}, 0.45)`;
    context.lineWidth = 3;
    context.fill();
    context.stroke();
    
    context.font = '600 64px -apple-system, BlinkMacSystemFont, sans-serif';
    context.fillStyle = '#f8fafc';
    context.textAlign = 'center';
    context.textBaseline = 'middle';
    context.fillText(distanceText, 256, 64);
    
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
    
    const offset = perpendicular.multiplyScalar(2.2);
    sprite.position.copy(midpoint).add(offset);
    sprite.scale.set(2.2, 1.1, 1);
    sprite.renderOrder = 999;
    sprite.userData.depthResponsive = true;
    sprite.userData.baseScale = sprite.scale.clone();
    sprite.userData.baseOpacity = spriteMaterial.opacity;
    group.add(sprite);
    
    const connectorMaterial = new THREE.LineBasicMaterial({
        color,
        transparent: true,
        opacity: 0.6
    });
    const connectorStart = midpoint.clone().add(perpendicular.clone().multiplyScalar(0.4));
    const connectorGeometry = new THREE.BufferGeometry().setFromPoints([
        connectorStart,
        sprite.position.clone().sub(perpendicular.clone().multiplyScalar(0.6))
    ]);
    const connectorLine = new THREE.Line(connectorGeometry, connectorMaterial);
    group.add(connectorLine);
    
    return group;
}

export function createComparisonPlate(start, end) {
    const origin = new THREE.Vector3(0, 0, 0);
    const v1 = new THREE.Vector3(...start);
    const v2 = new THREE.Vector3(...end);
    const centroid = new THREE.Vector3().add(origin).add(v1).add(v2).divideScalar(3);
    const normal = new THREE.Vector3().crossVectors(v1, v2).normalize();
    if (normal.length() < 0.001) {
        normal.set(0, 0, 1);
    }
    
    const maxLen = Math.max(v1.length(), v2.length());
    const plateGeometry = new THREE.PlaneGeometry(1, 1, 1, 1);
    const plateMaterial = new THREE.MeshBasicMaterial({
        color: 0x0a0f20,
        transparent: true,
        opacity: 0.22,
        side: THREE.DoubleSide,
        depthWrite: false
    });
    const plate = new THREE.Mesh(plateGeometry, plateMaterial);
    plate.position.copy(centroid);
    plate.scale.set(maxLen * 1.4, maxLen * 1.1, 1);
    plate.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), normal);
    plate.renderOrder = -5;
    
    return plate;
}

export function createTipBadge(position, color) {
    const group = new THREE.Group();
    
    const coreGeometry = new THREE.SphereGeometry(0.08, 16, 16);
    const coreMaterial = new THREE.MeshBasicMaterial({
        color: color,
        transparent: true,
        opacity: 0.95
    });
    const core = new THREE.Mesh(coreGeometry, coreMaterial);
    group.add(core);
    
    const glowGeometry = new THREE.SphereGeometry(0.16, 16, 16);
    const glowMaterial = new THREE.MeshBasicMaterial({
        color: color,
        transparent: true,
        opacity: 0.25,
        blending: THREE.AdditiveBlending,
        depthWrite: false
    });
    const glow = new THREE.Mesh(glowGeometry, glowMaterial);
    group.add(glow);
    
    group.position.set(position[0], position[1], position[2]);
    group.renderOrder = 999;
    
    return group;
}
