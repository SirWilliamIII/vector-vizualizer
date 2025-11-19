/**
 * Application Configuration Constants
 *
 * Centralizes all magic numbers and configuration values for easy tuning
 * and better code maintainability. All values are documented with their purpose.
 */

// ============================================================================
// CAMERA CONFIGURATION
// ============================================================================

export const CAMERA_CONFIG = {
    // Field of view in degrees
    FOV: 75,

    // Aspect ratio will be computed from container
    ASPECT: 1,

    // Near and far clipping planes
    NEAR_CLIP: 0.1,
    FAR_CLIP: 1000,

    // Default camera position (closer view for better label visibility)
    DEFAULT_POSITION: { x: 3.0, y: 3.0, z: 3.0 },

    // Camera animation duration in milliseconds
    ANIMATION_DURATION_MS: 800
};

// ============================================================================
// ORBIT CONTROLS CONFIGURATION
// ============================================================================

export const CONTROLS_CONFIG = {
    // Damping factor for smooth movement (higher = more damped/slower)
    DAMPING_FACTOR: 0.08,

    // Rotation speed multiplier
    ROTATE_SPEED: 0.8,

    // Zoom speed multiplier
    ZOOM_SPEED: 1.2,

    // Pan speed multiplier
    PAN_SPEED: 0.8,

    // Minimum camera distance from target
    MIN_DISTANCE: 1.2,

    // Maximum camera distance from target
    MAX_DISTANCE: 50,

    // Enable/disable various controls
    ENABLE_DAMPING: true,
    ENABLE_PAN: true,
    ZOOM_TO_CURSOR: false,
    SCREEN_SPACE_PANNING: true
};

// ============================================================================
// SCENE VISUAL CONFIGURATION
// ============================================================================

export const SCENE_CONFIG = {
    // Background color (dark blue)
    BACKGROUND_COLOR: 0x0a0e27,

    // Floor disc
    DISC_RADIUS: 15,
    DISC_SEGMENTS: 64,
    DISC_COLOR_CENTER: 0x040514,
    DISC_COLOR_EDGE: 0x0f1530,
    DISC_POSITION_Y: -0.01,
    DISC_OPACITY: 0.4,

    // Shadow at origin
    SHADOW_RADIUS: 1.2,
    SHADOW_SEGMENTS: 32,
    SHADOW_OPACITY: 0.25,
    SHADOW_POSITION_Y: 0.001,

    // Coordinate axes
    AXIS_LENGTH: 6,
    AXIS_THICKNESS: 0.05,
    AXIS_LABEL_OFFSET: 0.5,
    AXIS_OPACITY: 0.3,
    AXIS_DASH_SIZE: 0.15,
    AXIS_GAP_SIZE: 0.1,

    // Axis colors
    AXIS_COLOR_X: 0xff0000,
    AXIS_COLOR_Y: 0x00ff00,
    AXIS_COLOR_Z: 0xffff00
};

// ============================================================================
// LIGHTING CONFIGURATION
// ============================================================================

export const LIGHTING_CONFIG = {
    // Ambient light
    AMBIENT_COLOR: 0xffffff,
    AMBIENT_INTENSITY: 0.5,

    // Main directional light
    MAIN_LIGHT_COLOR: 0xffffff,
    MAIN_LIGHT_INTENSITY: 0.8,
    MAIN_LIGHT_POSITION: { x: 5, y: 10, z: 7 },

    // Fill light
    FILL_LIGHT_COLOR: 0x7a8cb8,
    FILL_LIGHT_INTENSITY: 0.3,
    FILL_LIGHT_POSITION: { x: -5, y: 3, z: -5 },

    // Rim/back light
    RIM_LIGHT_COLOR: 0xa8b5d1,
    RIM_LIGHT_INTENSITY: 0.4,
    RIM_LIGHT_DISTANCE: 50,
    RIM_LIGHT_POSITION: { x: 0, y: 8, z: -8 }
};

// ============================================================================
// MODEL-SPECIFIC SCALING
// ============================================================================

export const MODEL_SCALING = {
  // MiniLM produces well-distributed embeddings, use default scale
  minilm: 5,

  // E5-small tends to cluster more tightly, needs more spread
  e5small: 8,

  // BGE-small also clusters tightly, needs significant spread
  bgesmall: 9
}

// ============================================================================
// VECTOR ARROW VISUAL CONFIGURATION
// ============================================================================

export const VECTOR_CONFIG = {
    // Arrow geometry
    SHAFT_THICKNESS_THIN: 0.015,   // Base of arrow shaft
    SHAFT_THICKNESS_THICK: 0.035,  // Top of arrow shaft (near head)
    SHAFT_LENGTH_RATIO: 0.88,      // Shaft is 88% of total arrow length
    SHAFT_SEGMENTS: 32,

    CONE_HEIGHT_RATIO: 0.12,       // Cone is 12% of total arrow length
    CONE_RADIUS_MULTIPLIER: 1.9,   // Cone radius relative to shaft
    CONE_SEGMENTS: 32,

    // Adaptive thickness based on vector count
    ADAPTIVE_THICKNESS: {
        ENABLED: true,
        MIN_SCALE: 0.4,           // Minimum thickness scale (40% of original)
        MAX_SCALE: 1.0,           // Maximum thickness scale (100% original)
        OPTIMAL_COUNT: 10,        // Number of vectors for full thickness
        CROWDED_COUNT: 50,        // Number of vectors for minimum thickness
        IMPORTANCE_WEIGHT: 0.3    // How much importance affects thickness (0-1)
    },

    // Adaptive label sizing based on vector count
    ADAPTIVE_LABEL_SIZE: {
        ENABLED: true,
        MIN_SCALE: 0.7,           // Minimum label scale (70% of original) when crowded
        MAX_SCALE: 1.4,           // Maximum label scale (140% of original) when sparse
        OPTIMAL_COUNT: 10,        // Number of vectors for full-size labels
        CROWDED_COUNT: 50,        // Number of vectors for minimum label size
        FONT_SIZE_MIN: 28,        // Minimum font size in pixels
        FONT_SIZE_MAX: 40,        // Maximum font size in pixels
        FONT_SIZE_DEFAULT: 32     // Default font size (current setting)
    },

    // Visual effects
    GLOW_THICKNESS_MULTIPLIER: 1.4,  // Glow tube thickness
    GLOW_OPACITY: 0.25,

    BASE_GLOW_INNER_RADIUS: 2.2,
    BASE_GLOW_OUTER_RADIUS: 3.1,
    BASE_GLOW_OPACITY: 0.35,
    BASE_GLOW_SEGMENTS: 32,

    // Hitbox for easier clicking
    HITBOX_MULTIPLIER_LARGE: 10,    // Default for spread-out vectors
    HITBOX_MULTIPLIER_MEDIUM: 6,    // For medium proximity
    HITBOX_MULTIPLIER_TIGHT: 4,     // For clustered vectors
    HITBOX_SEGMENTS: 8,

    // Distance thresholds for hitbox sizing
    DISTANCE_THRESHOLD_TIGHT: 2,    // Vectors closer than this use tight hitbox
    DISTANCE_THRESHOLD_MEDIUM: 4    // Vectors closer than this use medium hitbox
};

// ============================================================================
// VECTOR STATE VISUAL PROPERTIES
// ============================================================================

export const VECTOR_VISUAL_STATE = {
    // Normal state (nothing selected)
    NORMAL: {
        emissiveIntensity: 0.15,
        opacity: 0.95,
        visible: true
    },

    // Hovered state
    HOVERED: {
        emissiveIntensity: 0.85,
        opacityMultiplier: 1.1
    },

    // Selected state
    SELECTED: {
        emissiveIntensity: 1.5,
        opacity: 1,
        visible: true
    },

    // Faded state (when something else is selected)
    FADED: {
        emissiveIntensity: 0.02,
        opacity: 0.25,
        visible: true
    },

    // Hidden state (in comparison mode)
    HIDDEN: {
        emissiveIntensity: 0.02,
        opacity: 0,
        visible: false
    }
};

// ============================================================================
// LABEL CONFIGURATION
// ============================================================================

export const LABEL_CONFIG = {
    // Canvas dimensions (multiplied by scale for high DPI)
    CANVAS_WIDTH: 512,
    CANVAS_HEIGHT: 160,
    CANVAS_SCALE: 4,  // 4x for retina displays

    // Font configuration
    FONT_SIZE: 48,
    FONT_WEIGHT: 500,
    FONT_FAMILY: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
    LETTER_SPACING: 6,  // pixels between letters

    // Shadow/glow effects
    SHADOW_COLOR: 'rgba(10, 14, 39, 0.8)',
    SHADOW_BLUR: 16,
    GLOW_BLUR: 12,
    GLOW_OPACITY: 0.4,

    // Label positioning
    POSITION_MULTIPLIER: 1.1,  // Distance from vector tip

    // Label scales for different states (adjusted for base scale 1.8 x 0.6)
    SCALE_NORMAL: { x: 1.0, y: 1.0, z: 1 },        // Use base scale as-is
    SCALE_SELECTED: { x: 1.15, y: 1.15, z: 1 },    // 15% larger when selected
    SCALE_COMPARISON: { x: 2.2, y: 1.3, z: 1 },    // Balanced scaling for better readability
    SCALE_FADED: { x: 0.8, y: 0.8, z: 1 },         // 20% smaller when faded

    // Label opacity for different states
    OPACITY_NORMAL: 0.95,
    OPACITY_SELECTED: 1,
    OPACITY_FADED: 0.3,
    OPACITY_HIDDEN: 0,

    // Axis label scale (smaller to match new label sizing)
    AXIS_LABEL_SCALE: { x: 0.6, y: 0.3, z: 1 }
};

// ============================================================================
// ANIMATION CONFIGURATION
// ============================================================================

export const ANIMATION_CONFIG = {
    // Animation durations in milliseconds
    DEFAULT_DURATION_MS: 400,
    REVEAL_DURATION_MS: 450,
    CAMERA_MOVE_DURATION_MS: 800,
    LABEL_ANIMATION_MS: 400,
    VECTOR_FADE_MS: 300,

    // Easing functions
    EASING: {
        // Standard ease in-out quadratic
        IN_OUT_QUAD: (t) => {
            return t < 0.5
                ? 2 * t * t
                : 1 - Math.pow(-2 * t + 2, 2) / 2;
        },

        // Ease out with back (bounce effect)
        OUT_BACK: (t) => {
            const c1 = 1.70158;
            const c3 = c1 + 1;
            return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
        },

        // Ease in-out cubic (smooth camera movement)
        IN_OUT_CUBIC: (t) => {
            return t < 0.5
                ? 4 * t * t * t
                : 1 - Math.pow(-2 * t + 2, 3) / 2;
        }
    }
};

// ============================================================================
// RAYCASTER CONFIGURATION
// ============================================================================

export const RAYCASTER_CONFIG = {
    // Detection thresholds for clicking thin geometries
    LINE_THRESHOLD: 0.2,
    POINTS_THRESHOLD: 0.2
};

// ============================================================================
// RENDERER CONFIGURATION
// ============================================================================

export const RENDERER_CONFIG = {
    // Enable antialiasing for smoother edges
    ANTIALIAS: true,

    // Disable alpha for better performance
    ALPHA: false,

    // Pixel ratio cap (don't exceed 2x for performance)
    MAX_PIXEL_RATIO: 2
};

// ============================================================================
// DISTANCE-BASED PROMINENCE CONFIGURATION
// ============================================================================

export const PROMINENCE_CONFIG = {
    // Distance ranges for scaling vectors and labels
    THICKNESS_SCALE_MIN_DISTANCE: 4,
    THICKNESS_SCALE_MAX_DISTANCE: 20,
    THICKNESS_SCALE_MIN: 0.45,
    THICKNESS_SCALE_MAX: 1.2,

    OPACITY_MIN_DISTANCE: 5,
    OPACITY_MAX_DISTANCE: 18,
    OPACITY_MIN: 0.3,
    OPACITY_MAX: 1.0,

    LABEL_OPACITY_MIN_DISTANCE: 5,
    LABEL_OPACITY_MAX_DISTANCE: 18,
    LABEL_OPACITY_MIN: 0.25,
    LABEL_OPACITY_MAX: 1.0,

    LABEL_SCALE_MIN_DISTANCE: 4,
    LABEL_SCALE_MAX_DISTANCE: 20,
    LABEL_SCALE_MIN: 0.45,
    LABEL_SCALE_MAX: 1.2,

    // Label positioning offsets
    LABEL_LATERAL_OFFSET_MIN_DISTANCE: 3,
    LABEL_LATERAL_OFFSET_MAX_DISTANCE: 18,
    LABEL_LATERAL_OFFSET_MIN: 0.08,
    LABEL_LATERAL_OFFSET_MAX: 0.35,
    LABEL_VERTICAL_OFFSET_RATIO: 0.35,

    // Annotation (angle/distance labels) prominence
    ANNOTATION_OPACITY_MIN_DISTANCE: 4,
    ANNOTATION_OPACITY_MAX_DISTANCE: 18,
    ANNOTATION_OPACITY_MIN: 0.35,
    ANNOTATION_OPACITY_MAX: 1.0,

    ANNOTATION_SCALE_MIN_DISTANCE: 4,
    ANNOTATION_SCALE_MAX_DISTANCE: 20,
    ANNOTATION_SCALE_MIN: 0.55,
    ANNOTATION_SCALE_MAX: 1.15,

    // Hover boost for labels
    HOVER_SCALE_BOOST: 1.1,
    HOVER_OPACITY_BOOST: 1.1
};

// ============================================================================
// CAMERA FOCUS CONFIGURATION
// ============================================================================

export const FOCUS_CONFIG = {
    // Annotation offset for bounding sphere calculation
    ANNOTATION_OFFSET: 2.5,

    // Camera distance multiplier from bounding sphere
    CAMERA_DISTANCE_MULTIPLIER: 0.85,

    // Minimum camera distance
    MIN_CAMERA_DISTANCE: 3,

    // Threshold for detecting parallel vectors
    PARALLEL_VECTOR_THRESHOLD: 0.1
};

// ============================================================================
// COMPARISON MODE CONFIGURATION
// ============================================================================

export const COMPARISON_CONFIG = {
    // Maximum number of vectors that can be selected
    MAX_SELECTED_VECTORS: 2,

    // Similarity color thresholds
    SIMILARITY_HIGH_THRESHOLD: 0.7,
    SIMILARITY_MEDIUM_THRESHOLD: 0.3,

    // Similarity colors (for lines and annotations)
    COLOR_HIGH_SIMILARITY: 0x4ade80,    // Green
    COLOR_MEDIUM_SIMILARITY: 0xfbbf24,  // Yellow/amber
    COLOR_LOW_SIMILARITY: 0xf87171,     // Red

    // Comparison plate
    PLATE_SIZE_MULTIPLIER: { width: 1.4, height: 1.1 },
    PLATE_COLOR: 0x0a0f20,
    PLATE_OPACITY: 0.22,
    PLATE_RENDER_ORDER: -5,

    // Tip badges
    TIP_BADGE_CORE_RADIUS: 0.08,
    TIP_BADGE_GLOW_RADIUS: 0.16,
    TIP_BADGE_GLOW_OPACITY: 0.25,
    TIP_BADGE_RENDER_ORDER: 999
};

// ============================================================================
// INTRO ANIMATION CONFIGURATION
// ============================================================================

export const INTRO_CONFIG = {
    // Emergence sequence timing pattern
    // Structure: slower at start, accelerates as viewer understands concept
    SEQUENCE: [
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
        { word: 'ocean', start: 5900, duration: 300, featured: false }
    ],

    // Featured vs non-featured opacity
    FEATURED_OPACITY: 0.95,
    NON_FEATURED_OPACITY: 0.35,
    FEATURED_LABEL_OPACITY: 0.9,
    NON_FEATURED_LABEL_OPACITY: 0.3,

    // Initial scale for emergence
    INITIAL_SCALE: 0.05,

    // Delays for tour and help icon pulse
    TOUR_START_DELAY_MS: 3000,
    HELP_PULSE_DELAY_MS: 3500
};

// ============================================================================
// CONNECTION LINE CONFIGURATION
// ============================================================================

export const CONNECTION_LINE_CONFIG = {
    // Tube geometry
    CORE_RADIUS: 0.016,
    GLOW_RADIUS: 0.038,
    SEGMENTS: 48,
    RADIAL_SEGMENTS: 32,

    // Animation
    PULSE_SPEED: 1.5,
    PULSE_MIN_ALPHA: 0.75,
    PULSE_MAX_ALPHA: 0.9,

    // Glow
    GLOW_OPACITY: 0.22
};

// ============================================================================
// ANGLE ARC CONFIGURATION
// ============================================================================

export const ANGLE_ARC_CONFIG = {
    // Arc sizing
    RADIUS_MULTIPLIER: 0.45,  // Arc radius relative to vector length
    SEGMENTS: 48,

    // Arc styling
    LINE_OPACITY: 0.9,
    LINE_WIDTH: 2,

    // Glow tube
    GLOW_TUBE_RADIUS: 0.02,
    GLOW_TUBE_SEGMENTS: 16,
    GLOW_OPACITY: 0.25,

    // Label
    LABEL_POSITION_MULTIPLIER: 2.1,  // Distance from arc midpoint
    LABEL_SCALE: { x: 1.6, y: 0.8, z: 1 },

    // Label canvas
    CANVAS_WIDTH: 256,
    CANVAS_HEIGHT: 128,
    CANVAS_SCALE: 3,
    LABEL_WIDTH: 180,
    LABEL_HEIGHT: 68,
    LABEL_BORDER_RADIUS: 20,
    LABEL_BG_OPACITY: 0.18,
    LABEL_BORDER_OPACITY: 0.45,
    LABEL_BORDER_WIDTH: 3,
    LABEL_TEXT_COLOR: '#f8fafc',
    LABEL_FONT_SIZE: 32,
    LABEL_FONT_WEIGHT: 600,

    // Leader line
    LEADER_LINE_START_LERP: 0.25,
    LEADER_LINE_COLOR: 0xe2e8f0,
    LEADER_LINE_OPACITY: 0.45
};

// ============================================================================
// DISTANCE ANNOTATION CONFIGURATION
// ============================================================================

export const DISTANCE_ANNOTATION_CONFIG = {
    // Label canvas
    CANVAS_WIDTH: 512,
    CANVAS_HEIGHT: 128,
    CANVAS_SCALE: 4,
    LABEL_WIDTH: 320,
    LABEL_HEIGHT: 90,
    LABEL_BORDER_RADIUS: 28,
    LABEL_BG_OPACITY: 0.16,
    LABEL_BORDER_OPACITY: 0.45,
    LABEL_BORDER_WIDTH: 3,
    LABEL_TEXT_COLOR: '#f8fafc',
    LABEL_FONT_SIZE: 64,
    LABEL_FONT_WEIGHT: 600,

    // Sprite
    SPRITE_SCALE: { x: 2.2, y: 1.1, z: 1 },
    SPRITE_OPACITY: 0.95,
    SPRITE_RENDER_ORDER: 999,

    // Positioning
    OFFSET_DISTANCE: 2.2,  // Perpendicular offset from midpoint
    CONNECTOR_START_OFFSET: 0.4,
    CONNECTOR_END_OFFSET: 0.6,
    CONNECTOR_OPACITY: 0.6
};

// ============================================================================
// PCA CONFIGURATION
// ============================================================================

export const PCA_CONFIG = {
    // Number of components to extract
    NUM_COMPONENTS: 3,

    // Power iteration iterations for eigenvector convergence
    MAX_ITERATIONS: 50,

    // Convergence threshold
    CONVERGENCE_THRESHOLD: 1e-10,

    // Scale factor for 3D coordinates
    SCALE_FACTOR: 5,

    // Single vector fallback position
    SINGLE_VECTOR_POSITION: [3, 0, 0]
};

// ============================================================================
// STATUS MESSAGE CONFIGURATION
// ============================================================================

export const STATUS_CONFIG = {
    // Auto-clear timeouts in milliseconds
    ERROR_TIMEOUT_MS: 2000,
    SUCCESS_TIMEOUT_MS: 3000,
    LONG_SUCCESS_TIMEOUT_MS: 4000
};

// ============================================================================
// EXPORT CONFIGURATION
// ============================================================================

export const EXPORT_CONFIG = {
    // Image format
    FORMAT: 'image/png',

    // Filename pattern (uses timestamp)
    FILENAME_PREFIX: 'vector-viz',
    FILENAME_SUFFIX: '.png'
};

// ============================================================================
// LOD (Level of Detail) SYSTEM CONFIGURATION
// ============================================================================

export const LOD_CONFIG = {
    // Enable LOD by default (always on now)
    ENABLED_DEFAULT: true,

    // Maximum number of labels to show at once (fixed at 10 for cleaner visualization)
    MAX_LABELS_DEFAULT: 10,
    MAX_LABELS_MIN: 10,  // Fixed value, no longer adjustable
    MAX_LABELS_MAX: 10,  // Fixed value, no longer adjustable

    // Debounce time for updates during camera movement (milliseconds)
    UPDATE_DEBOUNCE_MS: 100,

    // Padding around labels for collision detection (pixels)
    LABEL_COLLISION_PADDING: 10
};

// Importance calculation weights (should sum to ~100)
export const LOD_IMPORTANCE_WEIGHTS = {
    DISTANCE: 50,        // Camera distance weight
    CENTER: 30,          // Screen center proximity weight
    SIMILARITY: 20,      // Semantic relevance weight (when vectors selected)
    VIEW_ANGLE: 10       // Facing camera weight
};

// Importance score thresholds for different visibility tiers
export const LOD_THRESHOLDS = {
    HIGH: 80,      // Full visibility
    MEDIUM: 60,    // Reduced visibility
    LOW: 40,       // Minimal visibility
    MINIMAL: 20    // Very low visibility
};

// Visual scales for different importance tiers
export const LOD_VISUAL_SCALES = {
    high: {
        vectorOpacity: 1.0,
        coneScale: 1.0,
        labelOpacity: 1.0,
        labelScale: 1.0
    },
    medium: {
        vectorOpacity: 0.85,
        coneScale: 0.9,
        labelOpacity: 0.8,
        labelScale: 0.85
    },
    low: {
        vectorOpacity: 0.6,
        coneScale: 0.75,
        labelOpacity: 0.5,
        labelScale: 0.7
    },
    minimal: {
        vectorOpacity: 0.4,
        coneScale: 0.6,
        labelOpacity: 0.3,
        labelScale: 0.6
    }
};
