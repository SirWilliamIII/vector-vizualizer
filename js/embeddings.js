import { pipeline, env } from '@xenova/transformers';

// Configure transformers.js
env.allowLocalModels = false;

// Model configurations
export const MODEL_CONFIGS = {
    'minilm': {
        id: 'Xenova/all-MiniLM-L6-v2',
        name: 'MiniLM-L6-v2',
        institution: 'Sentence-Transformers',
        dims: 384,
        size: '~50MB',
        paradigm: 'Paraphrase Detection',
        description: 'Specialized for semantic similarity and paraphrase detection'
    },
    'e5-small': {
        id: 'Xenova/e5-small-v2',
        name: 'E5-small-v2',
        institution: 'Microsoft Research',
        dims: 384,
        size: '~133MB',
        paradigm: 'Weakly-Supervised Contrastive',
        description: 'Trained on billions of web text pairs with diverse relationships'
    },
    'bge-small': {
        id: 'Xenova/bge-small-en-v1.5',
        name: 'BGE-small-en-v1.5',
        institution: 'BAAI (Beijing Academy of AI)',
        dims: 384,
        size: '~150MB',
        paradigm: 'RetroMAE + Distillation',
        description: 'Optimized for retrieval with knowledge distilled from expert models'
    }
};

// Embedding model state
let embedder = null;
let modelLoading = false;
let modelReady = false;
let currentModelKey = 'minilm';

export async function initEmbeddingModel(modelKey = 'minilm') {
    // If requesting the same model that's already loaded, skip
    if (modelLoading && currentModelKey === modelKey) return;
    if (modelReady && currentModelKey === modelKey) return;

    // Reset state for new model
    currentModelKey = modelKey;
    modelReady = false;
    modelLoading = true;

    try {
        const config = MODEL_CONFIGS[modelKey];
        if (!config) {
            throw new Error(`Unknown model key: ${modelKey}`);
        }

        console.log(`Loading ${config.institution} ${config.name}...`);
        embedder = await pipeline('feature-extraction', config.id);
        modelReady = true;
        modelLoading = false;
        console.log(`${config.name} loaded successfully`);
        return config;
    } catch (error) {
        console.error('Error loading model:', error);
        modelLoading = false;
        throw error;
    }
}

export async function getEmbedding(word, modelKey = null) {
    // If modelKey is specified and different from current, reload
    if (modelKey && modelKey !== currentModelKey) {
        await initEmbeddingModel(modelKey);
    } else if (!modelReady) {
        await initEmbeddingModel(currentModelKey);
    }

    const output = await embedder(word, { pooling: 'mean', normalize: true });
    return Array.from(output.data);
}

export function isModelReady() {
    return modelReady;
}

export function isModelLoading() {
    return modelLoading;
}

export function getCurrentModel() {
    return currentModelKey;
}

export function getCurrentModelConfig() {
    return MODEL_CONFIGS[currentModelKey];
}
