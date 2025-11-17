/**
 * Batch Upload Module
 *
 * Handles batch uploading of text items from files:
 * - File reading and validation
 * - Text parsing (line-by-line)
 * - Deduplication
 * - Progress tracking
 * - Batch embedding and PCA re-projection
 */

import { getEmbedding, initEmbeddingModel } from './embeddings.js'
import { vectors, originalEmbeddings } from './vector-data.js'
import { pcaTo3D, assignColorsBasedOnSimilarity } from './math-utils.js'
import { showStatus } from './ui.js'

// Configuration
const MAX_BATCH_SIZE = 50
const MAX_TEXT_LENGTH = 500 // characters for embedding (models have token limits)
const LABEL_TRUNCATE_LENGTH = 40 // characters for display

/**
 * Truncate text for display while keeping full text for embedding
 */
function truncateForDisplay(text) {
  if (text.length <= LABEL_TRUNCATE_LENGTH) {
    return text
  }
  return text.substring(0, LABEL_TRUNCATE_LENGTH) + '...'
}

/**
 * Parse file content into lines
 * - Split by newline
 * - Trim whitespace
 * - Remove empty lines
 * - Deduplicate
 */
function parseFileContent(content) {
  const lines = content
    .split('\n')
    .map(line => line.trim())
    .filter(line => line.length > 0)

  // Deduplicate using Set
  const uniqueLines = [...new Set(lines)]

  // Check existing vectors to avoid duplicates with already-added items
  const existingWords = Object.keys(vectors)
  const newLines = uniqueLines.filter(line => {
    const truncated = truncateForDisplay(line)
    return !existingWords.includes(truncated)
  })

  return {
    total: lines.length,
    unique: uniqueLines.length,
    new: newLines.length,
    lines: newLines
  }
}

/**
 * Validate parsed content
 */
function validateContent(parsed) {
  const errors = []

  if (parsed.new === 0) {
    errors.push('All items already exist in the visualization')
  }

  if (parsed.new > MAX_BATCH_SIZE) {
    errors.push(`Too many items (${parsed.new}). Maximum is ${MAX_BATCH_SIZE}`)
  }

  return errors
}

/**
 * Create progress overlay UI
 */
function createProgressOverlay(total) {
  const overlay = document.createElement('div')
  overlay.id = 'batch-progress-overlay'
  overlay.className = 'canvas-overlay'
  overlay.innerHTML = `
    <div class="loading-spinner"></div>
    <div style="color: var(--text-primary); font-size: var(--text-lg); margin-top: var(--space-lg); font-weight: var(--weight-semibold);">
      Processing Batch Upload
    </div>
    <div id="batch-progress-text" style="color: var(--text-tertiary); font-size: var(--text-base); margin-top: var(--space-sm);">
      Initializing...
    </div>
    <div style="width: 300px; height: 4px; background: rgba(255,255,255,0.1); border-radius: 2px; margin-top: var(--space-md); overflow: hidden;">
      <div id="batch-progress-bar" style="width: 0%; height: 100%; background: var(--accent-primary); transition: width 0.3s ease;"></div>
    </div>
  `

  document.getElementById('canvas-container').appendChild(overlay)

  return {
    updateProgress: (current, total, status) => {
      const percent = Math.round((current / total) * 100)
      document.getElementById('batch-progress-bar').style.width = `${percent}%`
      document.getElementById('batch-progress-text').textContent = status
    },
    remove: () => {
      overlay.classList.add('fade-out')
      setTimeout(() => overlay.remove(), 300)
    }
  }
}

/**
 * Process batch upload
 * - Generate embeddings for each item
 * - Add to vectors dictionary
 * - Re-run PCA on all vectors
 * - Update visualization
 */
export async function processBatchUpload(items, currentModel) {
  const progress = createProgressOverlay(items.length)

  try {
    // Ensure model is loaded
    progress.updateProgress(0, items.length, 'Loading embedding model...')
    await initEmbeddingModel(currentModel)

    // Process each item
    const newEmbeddings = []

    for (let i = 0; i < items.length; i++) {
      const fullText = items[i]
      const displayName = truncateForDisplay(fullText)

      progress.updateProgress(
        i + 1,
        items.length,
        `Embedding ${i + 1}/${items.length}: "${displayName}"`
      )

      // Truncate text for embedding if too long
      const embeddingText = fullText.length > MAX_TEXT_LENGTH
        ? fullText.substring(0, MAX_TEXT_LENGTH)
        : fullText

      // Generate embedding
      const embedding = await getEmbedding(embeddingText, currentModel)

      // Store with display name as key, but keep full text in metadata
      originalEmbeddings[displayName] = embedding
      newEmbeddings.push({ name: displayName, fullText, embedding })

      // Small delay to prevent UI blocking
      await new Promise(resolve => setTimeout(resolve, 10))
    }

    // Re-run PCA on all embeddings
    progress.updateProgress(items.length, items.length, 'Running PCA projection...')
    await new Promise(resolve => setTimeout(resolve, 100)) // UI update delay

    const coords3D = pcaTo3D(originalEmbeddings)
    const validWords = Object.keys(originalEmbeddings).filter(w => originalEmbeddings[w] !== null)

    // Update coordinates for all vectors
    validWords.forEach((word, i) => {
      if (!vectors[word]) {
        vectors[word] = {}
      }
      vectors[word].coords = coords3D[i]
      vectors[word].fullText = newEmbeddings.find(e => e.name === word)?.fullText || word
    })

    // Assign colors based on similarity
    progress.updateProgress(items.length, items.length, 'Assigning colors...')
    assignColorsBasedOnSimilarity(vectors)

    // Remove progress overlay
    progress.remove()

    // Show success message
    showStatus(`Successfully added ${items.length} vectors!`, 'success')

    // Return true to trigger visualization refresh
    return true

  } catch (error) {
    progress.remove()
    showStatus(`Batch upload failed: ${error.message}`, 'error')
    console.error('Batch upload error:', error)
    return false
  }
}

/**
 * Handle file upload event
 */
export async function handleBatchUpload(event, currentModel) {
  const file = event.target.files[0]

  if (!file) {
    return
  }

  // Validate file type
  if (!file.name.endsWith('.txt')) {
    showStatus('Please upload a .txt file', 'error')
    return
  }

  // Read file
  const reader = new FileReader()

  reader.onload = async (e) => {
    const content = e.target.result

    // Parse content
    const parsed = parseFileContent(content)

    // Validate
    const errors = validateContent(parsed)
    if (errors.length > 0) {
      showStatus(errors[0], 'error')
      return
    }

    // Show preview and confirm
    const message = `Found ${parsed.new} new items to add (${parsed.total} total, ${parsed.unique} unique). Continue?`

    if (!confirm(message)) {
      showStatus('Batch upload cancelled', 'error')
      return
    }

    // Process batch
    const success = await processBatchUpload(parsed.lines, currentModel)

    if (success) {
      // Trigger visualization refresh (will be handled by main.js)
      window.dispatchEvent(new CustomEvent('batchUploadComplete'))
    }
  }

  reader.onerror = () => {
    showStatus('Failed to read file', 'error')
  }

  reader.readAsText(file)

  // Clear input so same file can be uploaded again
  event.target.value = ''
}
