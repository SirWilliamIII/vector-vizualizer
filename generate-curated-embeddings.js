// Generate embeddings for curated starter dataset
import { pipeline } from '@xenova/transformers';

// Curated words that demonstrate clear semantic relationships
const curatedWords = {
    // Insight 1: Classic vector arithmetic (king - man + woman ≈ queen)
    royalty: {
        words: ['king', 'queen', 'man', 'woman'],
        colors: [0x8b5cf6, 0xe879f9, 0x60a5fa, 0xf472b6]
    },
    // Insight 2: Animals cluster together
    animals: {
        words: ['dog', 'cat', 'bird'],
        colors: [0x4ade80, 0x22c55e, 0x16a34a]
    },
    // Insight 3: Emotions cluster separately
    emotions: {
        words: ['happy', 'sad', 'angry'],
        colors: [0xfbbf24, 0xf59e0b, 0xef4444]
    },
    // Insight 4: Technology vs Nature
    mixed: {
        words: ['computer', 'code'],
        colors: [0x3b82f6, 0x2563eb]
    },
    nature: {
        words: ['tree', 'ocean'],
        colors: [0x15803d, 0x06b6d4]
    }
};

async function generateEmbeddings() {
    console.log('Loading MiniLM model...');
    const embedder = await pipeline('feature-extraction', 'Xenova/all-MiniLM-L6-v2');
    console.log('Model loaded!\n');

    const allEmbeddings = {};

    for (const [category, data] of Object.entries(curatedWords)) {
        console.log(`Processing ${category}...`);
        for (let i = 0; i < data.words.length; i++) {
            const word = data.words[i];
            process.stdout.write(`  "${word}"... `);
            const output = await embedder(word, { pooling: 'mean', normalize: true });
            allEmbeddings[word] = Array.from(output.data);
            console.log('✓');
        }
    }

    console.log('\n=== Generated vector-data.js ===\n');

    console.log('// Curated starter dataset demonstrating semantic relationships');
    console.log('export const vectors = {');

    for (const [category, data] of Object.entries(curatedWords)) {
        for (let i = 0; i < data.words.length; i++) {
            const word = data.words[i];
            const color = '0x' + data.colors[i].toString(16).padStart(6, '0');
            console.log(`    "${word}": { coords: [0, 0, 0], color: ${color}, cluster: "${category}", isCustom: false },`);
        }
    }

    console.log('};\n');
    console.log('// Original 384D embeddings');
    console.log('export const originalEmbeddings = {');

    for (const [word, embedding] of Object.entries(allEmbeddings)) {
        console.log(`    "${word}": ${JSON.stringify(embedding)},`);
    }

    console.log('};\n');

    console.log(`\n=== Stats ===`);
    console.log(`Total words: ${Object.keys(allEmbeddings).length}`);
    console.log(`Dimensions: ${allEmbeddings[Object.keys(allEmbeddings)[0]].length}`);
}

generateEmbeddings().catch(console.error);
