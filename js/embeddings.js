import { pipeline, env } from '@xenova/transformers';

// Configure transformers.js
env.allowLocalModels = false;

// Embedding model state
let embedder = null;
let modelLoading = false;
let modelReady = false;

export async function initEmbeddingModel() {
    if (modelLoading || modelReady) return;
    
    modelLoading = true;
    
    try {
        embedder = await pipeline('feature-extraction', 'Xenova/all-MiniLM-L6-v2');
        modelReady = true;
        modelLoading = false;
        return true;
    } catch (error) {
        console.error('Error loading model:', error);
        modelLoading = false;
        throw error;
    }
}

export async function getEmbedding(word) {
    if (!modelReady) {
        await initEmbeddingModel();
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
