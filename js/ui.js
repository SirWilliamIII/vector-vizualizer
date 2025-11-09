import { vectors } from './vector-data.js';
import { cosineSimilarity, euclideanDistance, dotProduct, magnitude } from './math-utils.js';

export function updateInfoPanel(selectedVectors) {
    const panel = document.getElementById('info-panel');

    if (selectedVectors.length === 0) {
        panel.innerHTML = `
            <div class="info-panel-empty">
                <div class="empty-icon">
                    <svg width="64" height="64" viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M32 8L32 56M8 32L56 32" stroke="currentColor" stroke-width="3" stroke-linecap="round" opacity="0.3"/>
                        <circle cx="32" cy="32" r="20" stroke="currentColor" stroke-width="2" opacity="0.4" stroke-dasharray="4 4"/>
                        <path d="M32 20L38 32L32 44" stroke="var(--accent-primary)" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" opacity="0.6"/>
                    </svg>
                </div>
                <h3 style="color: var(--text-primary); font-size: var(--text-lg); margin-bottom: var(--space-sm); text-transform: none; opacity: 1;">Ready to Compare</h3>
                <p style="color: var(--text-tertiary); font-size: var(--text-sm); line-height: var(--leading-relaxed); margin-bottom: var(--space-lg);">
                    Select any vector to see its details, or click <strong style="color: var(--accent-primary);">two vectors</strong> to visualize their similarity.
                </p>

                <div class="empty-hint">
                    <span class="hint-badge">💡 Pro Tip</span>
                    <p style="margin-top: var(--space-xs); color: var(--text-muted); font-size: var(--text-sm); line-height: var(--leading-normal);">
                        Try comparing opposites like "hot" and "cold" to see how embeddings capture semantic distance!
                    </p>
                </div>
            </div>
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

    // Color coding for cosine similarity (negative = opposite, positive = similar)
    const cosineClass = cosine > 0.7 ? 'high-similarity' : cosine > 0.3 ? 'medium-similarity' : 'low-similarity';

    // Color coding for euclidean distance (lower is better - inverted scale)
    // Typical range in 3D PCA space is ~0.5 to ~4.0
    const euclideanClass = euclidean < 1.0 ? 'high-similarity' : euclidean < 2.0 ? 'medium-similarity' : 'low-similarity';

    // Color coding for dot product (higher is better)
    // Range varies but typically -2.0 to +2.0 for normalized vectors
    const dotClass = dot > 0.5 ? 'high-similarity' : dot > -0.5 ? 'medium-similarity' : 'low-similarity';
    
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
                    Measures angle between vectors. <strong>+1 = same direction</strong>, 0 = perpendicular, <strong>-1 = opposite</strong>. Negative values mean semantically dissimilar.
                </div>
            </div>
            
            <div class="metric-card">
                <div class="metric-header">
                    <span class="metric-name">Euclidean Distance</span>
                    <span class="metric-value ${euclideanClass}">${euclidean.toFixed(3)}</span>
                </div>
                <div class="metric-explanation">
                    Straight-line distance between points. <strong>Lower = closer together.</strong> Sensitive to magnitude.
                </div>
            </div>

            <div class="metric-card">
                <div class="metric-header">
                    <span class="metric-name">Dot Product</span>
                    <span class="metric-value ${dotClass}">${dot.toFixed(3)}</span>
                </div>
                <div class="metric-explanation">
                    Combines angle and magnitude. <strong>Higher = more aligned</strong> and longer vectors.
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
