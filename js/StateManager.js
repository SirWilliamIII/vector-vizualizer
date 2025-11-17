/**
 * StateManager - Centralized Application State Management
 *
 * This class manages all application state in one place, making it:
 * - Easier to debug state changes
 * - Possible to implement features like undo/redo
 * - Testable in isolation
 * - Observable via event listeners
 *
 * Follows Single Responsibility Principle: manages state only, no rendering logic
 */

import { COMPARISON_CONFIG } from './constants.js';

export class StateManager {
    constructor() {
        // Selection state
        this._selectedVectors = [];
        this._lastHoveredVector = null;

        // Scene object references
        this._vectorObjects = new Map();      // name -> Three.js Group
        this._labelSprites = new Map();       // name -> Three.js Sprite
        this._vectorMeshes = [];              // Array of all meshes for raycasting
        this._vectorGroups = [];              // Array of all vector groups
        this._labelSpritesList = [];          // Array of all label sprites for raycasting

        // Comparison mode visual objects
        this._connectionLines = [];           // Lines connecting selected vectors
        this._annotations = [];               // Angle arcs and distance labels

        // Animation tracking
        this._vectorAnimations = new Map();   // animation ID -> requestAnimationFrame ID

        // Camera state
        this._previousCameraState = null;     // Saved camera state before comparison

        // Event listeners for reactive updates
        this._listeners = new Map();
    }

    // ========================================================================
    // SELECTION MANAGEMENT
    // ========================================================================

    /**
     * Select a vector by name
     * If vector is already selected, deselects it
     * Maintains max 2 selected vectors
     */
    selectVector(name) {
        if (this._selectedVectors.includes(name)) {
            this.deselectVector(name);
            return;
        }

        this._selectedVectors.push(name);

        // Limit to max 2 selected vectors
        if (this._selectedVectors.length > COMPARISON_CONFIG.MAX_SELECTED_VECTORS) {
            this._selectedVectors.shift();
        }

        this.emit('selectionChanged', this.getSelectedVectors());
    }

    /**
     * Deselect a specific vector
     */
    deselectVector(name) {
        const index = this._selectedVectors.indexOf(name);
        if (index > -1) {
            this._selectedVectors.splice(index, 1);
            this.emit('selectionChanged', this.getSelectedVectors());
        }
    }

    /**
     * Clear all selections
     */
    clearSelection() {
        if (this._selectedVectors.length > 0) {
            this._selectedVectors = [];
            this.emit('selectionChanged', []);
        }
    }

    /**
     * Get array of currently selected vector names
     */
    getSelectedVectors() {
        return [...this._selectedVectors];
    }

    /**
     * Check if a vector is currently selected
     */
    isSelected(name) {
        return this._selectedVectors.includes(name);
    }

    /**
     * Get number of selected vectors
     */
    getSelectionCount() {
        return this._selectedVectors.length;
    }

    /**
     * Check if we're in comparison mode (2 vectors selected)
     */
    isComparisonMode() {
        return this._selectedVectors.length === COMPARISON_CONFIG.MAX_SELECTED_VECTORS;
    }

    /**
     * Check if any vectors are selected
     */
    hasSelection() {
        return this._selectedVectors.length > 0;
    }

    // ========================================================================
    // HOVER STATE MANAGEMENT
    // ========================================================================

    /**
     * Set the currently hovered vector
     */
    setHoveredVector(name) {
        if (this._lastHoveredVector !== name) {
            this._lastHoveredVector = name;
            this.emit('hoverChanged', name);
        }
    }

    /**
     * Get the currently hovered vector (or null)
     */
    getHoveredVector() {
        return this._lastHoveredVector;
    }

    /**
     * Clear hover state
     */
    clearHover() {
        if (this._lastHoveredVector !== null) {
            this._lastHoveredVector = null;
            this.emit('hoverChanged', null);
        }
    }

    // ========================================================================
    // VECTOR OBJECT MANAGEMENT
    // ========================================================================

    /**
     * Register a vector's Three.js objects
     */
    registerVectorObject(name, vectorGroup, labelSprite) {
        this._vectorObjects.set(name, vectorGroup);
        this._labelSprites.set(name, labelSprite);

        // Add to groups list if not already present
        if (!this._vectorGroups.includes(vectorGroup)) {
            this._vectorGroups.push(vectorGroup);
        }

        // Add to sprites list if not already present
        if (!this._labelSpritesList.includes(labelSprite)) {
            this._labelSpritesList.push(labelSprite);
        }

        this.emit('vectorRegistered', { name, vectorGroup, labelSprite });
    }

    /**
     * Unregister a vector's Three.js objects
     */
    unregisterVectorObject(name) {
        const vectorGroup = this._vectorObjects.get(name);
        const labelSprite = this._labelSprites.get(name);

        if (vectorGroup) {
            const groupIndex = this._vectorGroups.indexOf(vectorGroup);
            if (groupIndex > -1) {
                this._vectorGroups.splice(groupIndex, 1);
            }
        }

        if (labelSprite) {
            const spriteIndex = this._labelSpritesList.indexOf(labelSprite);
            if (spriteIndex > -1) {
                this._labelSpritesList.splice(spriteIndex, 1);
            }
        }

        // Remove from meshes array (all meshes with this name)
        this._vectorMeshes = this._vectorMeshes.filter(
            mesh => mesh.userData.name !== name
        );

        this._vectorObjects.delete(name);
        this._labelSprites.delete(name);

        this.emit('vectorUnregistered', name);
    }

    /**
     * Get a vector's Group object
     */
    getVectorObject(name) {
        return this._vectorObjects.get(name);
    }

    /**
     * Get a vector's label Sprite
     */
    getLabelSprite(name) {
        return this._labelSprites.get(name);
    }

    /**
     * Get all vector names
     */
    getAllVectorNames() {
        return Array.from(this._vectorObjects.keys());
    }

    /**
     * Get count of registered vectors
     */
    getVectorCount() {
        return this._vectorObjects.size;
    }

    // ========================================================================
    // MESH MANAGEMENT (for raycasting)
    // ========================================================================

    /**
     * Add meshes to the raycasting array
     */
    addVectorMeshes(meshes) {
        this._vectorMeshes.push(...meshes);
    }

    /**
     * Get all vector meshes for raycasting
     */
    getVectorMeshes() {
        return this._vectorMeshes;
    }

    /**
     * Get all vector groups
     */
    getVectorGroups() {
        return this._vectorGroups;
    }

    /**
     * Get all label sprites for raycasting
     */
    getLabelSprites() {
        return this._labelSpritesList;
    }

    /**
     * Clear all meshes
     */
    clearMeshes() {
        this._vectorMeshes = [];
    }

    // ========================================================================
    // COMPARISON MODE VISUAL OBJECTS
    // ========================================================================

    /**
     * Add a connection line
     */
    addConnectionLine(line) {
        this._connectionLines.push(line);
    }

    /**
     * Get all connection lines
     */
    getConnectionLines() {
        return this._connectionLines;
    }

    /**
     * Clear all connection lines
     */
    clearConnectionLines() {
        this._connectionLines = [];
    }

    /**
     * Add an annotation (angle arc or distance label)
     */
    addAnnotation(annotation) {
        this._annotations.push(annotation);
    }

    /**
     * Get all annotations
     */
    getAnnotations() {
        return this._annotations;
    }

    /**
     * Clear all annotations
     */
    clearAnnotations() {
        this._annotations = [];
    }

    // ========================================================================
    // ANIMATION TRACKING
    // ========================================================================

    /**
     * Register an active animation
     */
    registerAnimation(id, frameId) {
        // Cancel existing animation with same ID
        if (this._vectorAnimations.has(id)) {
            cancelAnimationFrame(this._vectorAnimations.get(id));
        }
        this._vectorAnimations.set(id, frameId);
    }

    /**
     * Unregister an animation (when complete)
     */
    unregisterAnimation(id) {
        this._vectorAnimations.delete(id);
    }

    /**
     * Cancel a specific animation
     */
    cancelAnimation(id) {
        if (this._vectorAnimations.has(id)) {
            cancelAnimationFrame(this._vectorAnimations.get(id));
            this._vectorAnimations.delete(id);
        }
    }

    /**
     * Cancel all animations
     */
    cancelAllAnimations() {
        this._vectorAnimations.forEach(frameId => {
            cancelAnimationFrame(frameId);
        });
        this._vectorAnimations.clear();
    }

    /**
     * Check if an animation is running
     */
    hasAnimation(id) {
        return this._vectorAnimations.has(id);
    }

    // ========================================================================
    // CAMERA STATE MANAGEMENT
    // ========================================================================

    /**
     * Save camera state (position and target)
     */
    saveCameraState(position, target) {
        this._previousCameraState = {
            position: position.clone(),
            target: target.clone()
        };
    }

    /**
     * Get saved camera state
     */
    getSavedCameraState() {
        return this._previousCameraState;
    }

    /**
     * Check if camera state is saved
     */
    hasSavedCameraState() {
        return this._previousCameraState !== null;
    }

    /**
     * Clear saved camera state
     */
    clearCameraState() {
        this._previousCameraState = null;
    }

    // ========================================================================
    // BULK OPERATIONS
    // ========================================================================

    /**
     * Clear everything (reset to initial state)
     * Useful for "Start Fresh" functionality
     */
    clearAll() {
        this.clearSelection();
        this.clearHover();
        this._vectorObjects.clear();
        this._labelSprites.clear();
        this._vectorMeshes = [];
        this._vectorGroups = [];
        this._labelSpritesList = [];
        this.clearConnectionLines();
        this.clearAnnotations();
        this.cancelAllAnimations();
        this.clearCameraState();

        this.emit('stateCleared');
    }

    /**
     * Remove custom vectors only
     * Used by clearCustomVectors functionality
     */
    clearCustomVectors(customWords) {
        customWords.forEach(word => {
            this.unregisterVectorObject(word);

            // Remove from selection if selected
            if (this.isSelected(word)) {
                this.deselectVector(word);
            }
        });
    }

    // ========================================================================
    // EVENT SYSTEM (Observer Pattern)
    // ========================================================================

    /**
     * Register an event listener
     *
     * Events:
     * - 'selectionChanged': (selectedVectors) => void
     * - 'hoverChanged': (vectorName | null) => void
     * - 'vectorRegistered': ({ name, vectorGroup, labelSprite }) => void
     * - 'vectorUnregistered': (name) => void
     * - 'stateCleared': () => void
     */
    on(event, handler) {
        if (!this._listeners.has(event)) {
            this._listeners.set(event, []);
        }
        this._listeners.get(event).push(handler);

        // Return unsubscribe function
        return () => this.off(event, handler);
    }

    /**
     * Unregister an event listener
     */
    off(event, handler) {
        if (!this._listeners.has(event)) return;

        const handlers = this._listeners.get(event);
        const index = handlers.indexOf(handler);
        if (index > -1) {
            handlers.splice(index, 1);
        }
    }

    /**
     * Emit an event to all listeners
     */
    emit(event, data) {
        if (!this._listeners.has(event)) return;

        const handlers = this._listeners.get(event);
        handlers.forEach(handler => {
            try {
                handler(data);
            } catch (error) {
                console.error(`Error in event handler for '${event}':`, error);
            }
        });
    }

    /**
     * Remove all listeners for an event (or all events if no event specified)
     */
    removeAllListeners(event = null) {
        if (event) {
            this._listeners.delete(event);
        } else {
            this._listeners.clear();
        }
    }

    // ========================================================================
    // DEBUG HELPERS
    // ========================================================================

    /**
     * Get current state snapshot for debugging
     */
    getStateSnapshot() {
        return {
            selectedVectors: this.getSelectedVectors(),
            hoveredVector: this.getHoveredVector(),
            vectorCount: this.getVectorCount(),
            meshCount: this._vectorMeshes.length,
            groupCount: this._vectorGroups.length,
            labelCount: this._labelSpritesList.length,
            connectionLineCount: this._connectionLines.length,
            annotationCount: this._annotations.length,
            activeAnimationCount: this._vectorAnimations.size,
            hasSavedCameraState: this.hasSavedCameraState(),
            isComparisonMode: this.isComparisonMode()
        };
    }

    /**
     * Log current state to console
     */
    logState() {
        console.group('StateManager State');
        console.table(this.getStateSnapshot());
        console.log('Registered vectors:', this.getAllVectorNames());
        console.log('Selected vectors:', this.getSelectedVectors());
        console.groupEnd();
    }
}

// Export singleton instance for convenience
// (Can also create new instances for testing)
export const state = new StateManager();
