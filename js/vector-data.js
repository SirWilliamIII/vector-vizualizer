// Vector data - representing embeddings in 3D
export const vectors = {
    "cat": { coords: [3, 4, 2], color: 0xf87171, description: "domestic animal, pet", isCustom: false },
    "dog": { coords: [3.2, 3.8, 2.1], color: 0xfb923c, description: "domestic animal, pet", isCustom: false },
    "python": { coords: [-2, 5, 3], color: 0x4ade80, description: "programming language", isCustom: false },
    "code": { coords: [-1.8, 4.5, 3.2], color: 0x22d3ee, description: "programming, software", isCustom: false },
    "car": { coords: [5, 1, -2], color: 0xfbbf24, description: "vehicle, transportation", isCustom: false }
};

// Store original embeddings for new words (for better projection)
export const originalEmbeddings = {
    "cat": null,
    "dog": null,
    "python": null,
    "code": null,
    "car": null
};
