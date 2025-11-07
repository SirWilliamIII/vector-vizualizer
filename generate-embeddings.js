// Script to generate embeddings for seed data
// Run with: node generate-embeddings.js

import { pipeline } from '@xenova/transformers';

// Define semantic clusters with color palettes
const clusters = {
    nature: {
        words: ['dog', 'cat', 'bird', 'tree', 'flower', 'ocean', 'mountain', 'forest', 'rain', 'sunshine'],
        colors: [0x4ade80, 0x22c55e, 0x16a34a, 0x15803d, 0x84cc16, 0x65a30d, 0x14b8a6, 0x0d9488, 0x06b6d4, 0x0891b2],
        description: 'Natural world, animals, environment'
    },
    technology: {
        words: ['computer', 'code', 'python', 'algorithm', 'database', 'internet', 'robot', 'AI', 'software', 'data'],
        colors: [0x3b82f6, 0x2563eb, 0x1d4ed8, 0x1e40af, 0x60a5fa, 0x93c5fd, 0x6366f1, 0x4f46e5, 0x8b5cf6, 0x7c3aed],
        description: 'Technology, programming, computers'
    },
    emotions: {
        words: ['joy', 'sadness', 'anger', 'fear', 'love', 'hope', 'anxiety', 'peace', 'excitement', 'gratitude'],
        colors: [0xfbbf24, 0xf59e0b, 0xf87171, 0xef4444, 0xfb923c, 0xf97316, 0xfca5a5, 0xfecaca, 0xfde047, 0xfacc15],
        description: 'Human feelings and emotions'
    },
    arts: {
        words: ['music', 'painting', 'poetry', 'dance', 'sculpture', 'theater', 'film', 'novel', 'canvas', 'melody'],
        colors: [0xa855f7, 0x9333ea, 0x7e22ce, 0x6b21a8, 0xc084fc, 0xd8b4fe, 0xe879f9, 0xf0abfc, 0xf9a8d4, 0xf472b6],
        description: 'Creative arts and expression'
    },
    urban: {
        words: ['city', 'car', 'coffee', 'phone', 'building', 'subway', 'office', 'apartment', 'restaurant', 'traffic'],
        colors: [0xfbbf24, 0xfcd34d, 0xfde68a, 0xa8a29e, 0x78716c, 0x57534e, 0xd4d4d8, 0xa1a1aa, 0x71717a, 0x52525b],
        description: 'Modern urban life and infrastructure'
    }
};

async function generateEmbeddings() {
    console.log('Loading MiniLM model...');
    const embedder = await pipeline('feature-extraction', 'Xenova/all-MiniLM-L6-v2');
    console.log('Model loaded!\n');

    const allVectors = {};
    const allEmbeddings = {};

    for (const [clusterName, cluster] of Object.entries(clusters)) {
        console.log(`\nProcessing cluster: ${clusterName}`);
        console.log(`Description: ${cluster.description}`);

        for (let i = 0; i < cluster.words.length; i++) {
            const word = cluster.words[i];
            const color = cluster.colors[i];

            process.stdout.write(`  Embedding "${word}"... `);
            const output = await embedder(word, { pooling: 'mean', normalize: true });
            const embedding = Array.from(output.data);

            allEmbeddings[word] = embedding;
            console.log('✓');
        }
    }

    console.log('\n\n=== Generated vector-data.js content ===\n');

    // Generate the vectors object (we'll compute 3D coords from PCA later)
    console.log('// Vector data - representing embeddings in 3D');
    console.log('export const vectors = {');

    for (const [clusterName, cluster] of Object.entries(clusters)) {
        console.log(`    // ${clusterName.toUpperCase()} - ${cluster.description}`);
        for (let i = 0; i < cluster.words.length; i++) {
            const word = cluster.words[i];
            const color = cluster.colors[i];
            const colorHex = '0x' + color.toString(16).padStart(6, '0');
            console.log(`    "${word}": { coords: [0, 0, 0], color: ${colorHex}, cluster: "${clusterName}", isCustom: false },`);
        }
    }

    console.log('};\n');

    // Generate the originalEmbeddings object
    console.log('// Store original 384D embeddings for PCA projection');
    console.log('export const originalEmbeddings = {');

    for (const [word, embedding] of Object.entries(allEmbeddings)) {
        // Format embedding as compact array
        const embeddingStr = JSON.stringify(embedding);
        console.log(`    "${word}": ${embeddingStr},`);
    }

    console.log('};\n');

    console.log('\n=== Statistics ===');
    console.log(`Total words: ${Object.keys(allEmbeddings).length}`);
    console.log(`Embedding dimensions: ${allEmbeddings[Object.keys(allEmbeddings)[0]].length}`);
    console.log(`Clusters: ${Object.keys(clusters).length}`);
}

generateEmbeddings().catch(console.error);
