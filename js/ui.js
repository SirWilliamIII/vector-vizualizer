import { vectors } from './vector-data.js';
import { cosineSimilarity, euclideanDistance, dotProduct, magnitude } from './math-utils.js';

export function updateInfoPanel(selectedVectors) {
    const panel = document.getElementById('info-panel');
    
    if (selectedVectors.length === 0) {
        panel.innerHTML = `
            <h3>Select Vectors to Compare</h3>
            <p style="color: rgba(255, 255, 255, 0.6); font-size: 0.85rem; line-height: 1.5;">
                Click on any vector to select it. Click a second vector to see detailed similarity metrics and understand what each metric captures.
            </p>
        `;
        return;
    }
    
    if (selectedVectors.length === 1) {
        const name = selectedVectors[0];
        const data = vectors[name];
        const mag = magnitude(data.coords);
        
        panel.innerHTML = `
            <h3>Selected Vector</h3>
            <div class="vector-detail" style="border-color: #${data.color.toString(16).padStart(6, '0')}">
                <div class="vector-name" style="color: #${data.color.toString(16).padStart(6, '0')}">${name}</div>
                <div class="vector-coords">[${data.coords.map(v => v.toFixed(2)).join(', ')}]</div>
                <div class="vector-magnitude">Magnitude: ${mag.toFixed(3)}</div>
            </div>
            <p style="color: rgba(255, 255, 255, 0.6); font-size: 0.85rem; margin-top: 15px;">
                Click another vector to compare.
            </p>
        `;
        return;
    }
    
    // Two vectors selected - show comparison
    const [name1, name2] = selectedVectors;
    const data1 = vectors[name1];
    const data2 = vectors[name2];
    
    const cosine = cosineSimilarity(data1.coords, data2.coords);
    const euclidean = euclideanDistance(data1.coords, data2.coords);
    const dot = dotProduct(data1.coords, data2.coords);
    
    const cosineAbs = Math.abs(cosine);
    const cosineClass = cosineAbs > 0.7 ? 'high-similarity' : cosineAbs > 0.3 ? 'medium-similarity' : 'low-similarity';
    
    panel.innerHTML = `
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
            <h3 style="margin: 0;">Vector Comparison</h3>
            <button id="close-comparison" style="background: none; border: none; color: rgba(255, 255, 255, 0.6); cursor: pointer; font-size: 1.5rem; padding: 0; width: 32px; height: 32px; display: flex; align-items: center; justify-content: center; border-radius: 6px; transition: all 0.2s ease;" onmouseover="this.style.background='rgba(255,255,255,0.1)'; this.style.color='rgba(255,255,255,0.9)';" onmouseout="this.style.background='none'; this.style.color='rgba(255,255,255,0.6)';">×</button>
        </div>
        
        <div class="vector-detail" style="border-color: #${data1.color.toString(16).padStart(6, '0')}">
            <div class="vector-name" style="color: #${data1.color.toString(16).padStart(6, '0')}">${name1}</div>
            <div class="vector-coords">[${data1.coords.map(v => v.toFixed(2)).join(', ')}]</div>
            <div class="vector-magnitude">Magnitude: ${magnitude(data1.coords).toFixed(3)}</div>
        </div>
        
        <div class="vector-detail" style="border-color: #${data2.color.toString(16).padStart(6, '0')}">
            <div class="vector-name" style="color: #${data2.color.toString(16).padStart(6, '0')}">${name2}</div>
            <div class="vector-coords">[${data2.coords.map(v => v.toFixed(2)).join(', ')}]</div>
            <div class="vector-magnitude">Magnitude: ${magnitude(data2.coords).toFixed(3)}</div>
        </div>
        
        <div class="comparison">
            <div class="comparison-header">SIMILARITY METRICS</div>
            
            <div class="metric-card">
                <div class="metric-header">
                    <span class="metric-name">Cosine Similarity</span>
                    <span class="metric-value ${cosineClass}">${cosine.toFixed(3)}</span>
                </div>
                <div class="metric-explanation">
                    Measures angle between vectors. Range: -1 to 1. Higher = more similar direction. Best for comparing meaning.
                </div>
            </div>
            
            <div class="metric-card">
                <div class="metric-header">
                    <span class="metric-name">Euclidean Distance</span>
                    <span class="metric-value">${euclidean.toFixed(3)}</span>
                </div>
                <div class="metric-explanation">
                    Straight-line distance between points. Lower = closer together. Sensitive to magnitude.
                </div>
            </div>
            
            <div class="metric-card">
                <div class="metric-header">
                    <span class="metric-name">Dot Product</span>
                    <span class="metric-value">${dot.toFixed(3)}</span>
                </div>
                <div class="metric-explanation">
                    Combines angle and magnitude. Higher = more aligned and longer vectors.
                </div>
            </div>
        </div>
    `;
}

export function showStatus(message, type = 'success') {
    const statusDiv = document.getElementById('status-message');
    if (statusDiv) {
        statusDiv.textContent = message;
        statusDiv.className = `status-message ${type}`;
        statusDiv.style.display = 'block';
    }
}

export function clearStatus() {
    const statusDiv = document.getElementById('status-message');
    if (statusDiv) {
        statusDiv.style.display = 'none';
        statusDiv.textContent = '';
    }
}
