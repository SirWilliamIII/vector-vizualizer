// Mathematical utility functions
import { MODEL_SCALING } from './constants.js'
import { getCurrentModel } from './embeddings.js'

export function cosineSimilarity(v1, v2) {
    const dot = v1[0] * v2[0] + v1[1] * v2[1] + v1[2] * v2[2];
    const mag1 = Math.sqrt(v1[0] ** 2 + v1[1] ** 2 + v1[2] ** 2);
    const mag2 = Math.sqrt(v2[0] ** 2 + v2[1] ** 2 + v2[2] ** 2);
    return dot / (mag1 * mag2);
}

export function euclideanDistance(v1, v2) {
    return Math.sqrt(
        (v1[0] - v2[0]) ** 2 + 
        (v1[1] - v2[1]) ** 2 + 
        (v1[2] - v2[2]) ** 2
    );
}

export function dotProduct(v1, v2) {
    return v1[0] * v2[0] + v1[1] * v2[1] + v1[2] * v2[2];
}

export function magnitude(v) {
    return Math.sqrt(v[0] ** 2 + v[1] ** 2 + v[2] ** 2);
}

// Map a value from one range to another
export function mapRange(value, inMin, inMax, outMin, outMax) {
    return outMin + (outMax - outMin) * ((value - inMin) / (inMax - inMin));
}

// Clamp a value between min and max
export function clamp(value, min, max) {
    return Math.min(Math.max(value, min), max);
}

// Proper PCA for dimensionality reduction (384D -> 3D)
export function pcaTo3D(embeddings, modelKey = null) {
    const words = Object.keys(embeddings).filter(w => embeddings[w] !== null);
    const matrix = words.map(w => embeddings[w]);

    if (matrix.length === 0) return null;

    if (matrix.length === 1) {
        return [[3, 0, 0]];
    }
    
    const n = matrix.length;
    const d = matrix[0].length;

    // Step 1: Center the data (subtract mean)
    const means = new Array(d).fill(0);
    for (let i = 0; i < n; i++) {
        for (let j = 0; j < d; j++) {
            means[j] += matrix[i][j];
        }
    }
    for (let j = 0; j < d; j++) {
        means[j] /= n;
    }
    
    const centered = matrix.map(row => 
        row.map((val, j) => val - means[j])
    );
    
    // Use power iteration to find top 3 eigenvectors
    const components = [];
    let residual = centered.map(row => [...row]);
    
    for (let comp = 0; comp < 3; comp++) {
        let vector = new Array(d).fill(0).map(() => Math.random() - 0.5);
        
        for (let iter = 0; iter < 50; iter++) {
            let newVector = new Array(d).fill(0);
            for (let i = 0; i < n; i++) {
                const projection = residual[i].reduce((sum, val, j) => sum + val * vector[j], 0);
                for (let j = 0; j < d; j++) {
                    newVector[j] += projection * residual[i][j];
                }
            }
            
            const norm = Math.sqrt(newVector.reduce((sum, val) => sum + val * val, 0));
            if (norm < 1e-10) break;
            
            vector = newVector.map(val => val / norm);
        }
        
        components.push(vector);
        
        for (let i = 0; i < n; i++) {
            const projection = residual[i].reduce((sum, val, j) => sum + val * vector[j], 0);
            for (let j = 0; j < d; j++) {
                residual[i][j] -= projection * vector[j];
            }
        }
    }
    
    // Project data onto components
    const projected = centered.map(row =>
        components.map(comp =>
            row.reduce((sum, val, j) => sum + val * comp[j], 0)
        )
    );

    // Use model-specific scaling for better visual distribution
    const currentModelKey = modelKey || getCurrentModel();
    const scale = MODEL_SCALING[currentModelKey] || 5;  // Default to 5 if model not found

    return projected.map(p => p.map(val => val * scale));
}
