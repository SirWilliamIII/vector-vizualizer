/**
 * VectorSearch - Fuzzy search functionality for vectors
 *
 * Features:
 * - Fuzzy string matching
 * - Keyboard navigation
 * - Live search results
 * - Integration with selection and camera systems
 */

import { vectors } from './vector-data.js'

export class VectorSearch {
  constructor(stateManager, cameraController, interactionHandler) {
    this.state = stateManager
    this.cameraController = cameraController
    this.interactionHandler = interactionHandler

    this.searchInput = document.getElementById('vector-search')
    this.searchResults = document.getElementById('search-results')
    this.clearButton = document.getElementById('search-clear')

    this.currentResults = []
    this.selectedIndex = -1

    this.setupEventListeners()
  }

  // ========================================================================
  // FUZZY SEARCH ALGORITHM
  // ========================================================================

  /**
   * Calculate fuzzy match score between query and target
   * Returns score from 0 to 1 (1 being perfect match)
   */
  fuzzyScore(query, target) {
    query = query.toLowerCase()
    target = target.toLowerCase()

    // Perfect match
    if (query === target) return 1.0

    // Contains exact query
    if (target.includes(query)) return 0.9

    // Start with query
    if (target.startsWith(query)) return 0.85

    // Calculate character-by-character fuzzy match
    let queryIndex = 0
    let targetIndex = 0
    let score = 0
    let consecutiveMatches = 0
    let matchPositions = []

    while (queryIndex < query.length && targetIndex < target.length) {
      if (query[queryIndex] === target[targetIndex]) {
        score += 1
        consecutiveMatches++
        matchPositions.push(targetIndex)
        queryIndex++

        // Bonus for consecutive matches
        if (consecutiveMatches > 1) {
          score += 0.5
        }
      } else {
        consecutiveMatches = 0
      }
      targetIndex++
    }

    // If we didn't match all query characters, no match
    if (queryIndex < query.length) {
      return 0
    }

    // Calculate final score based on:
    // - Ratio of matched characters to query length
    // - Ratio of matched characters to target length
    // - Position of matches (earlier is better)
    const baseScore = score / query.length
    const lengthPenalty = query.length / target.length
    const positionBonus = matchPositions.length > 0
      ? 1 - (matchPositions[0] / target.length) * 0.1
      : 0

    return Math.min(1, baseScore * lengthPenalty * positionBonus)
  }

  /**
   * Search for vectors matching the query
   */
  searchVectors(query) {
    if (!query || query.trim() === '') {
      return []
    }

    const results = []

    Object.keys(vectors).forEach(name => {
      const score = this.fuzzyScore(query, name)
      if (score > 0.3) { // Threshold for fuzzy matches
        results.push({
          name,
          score,
          data: vectors[name]
        })
      }
    })

    // Sort by score (highest first)
    results.sort((a, b) => b.score - a.score)

    // Return top 10 results
    return results.slice(0, 10)
  }

  // ========================================================================
  // UI MANAGEMENT
  // ========================================================================

  /**
   * Display search results
   */
  displayResults(results) {
    if (results.length === 0) {
      this.hideResults()
      return
    }

    let html = ''
    results.forEach((result, index) => {
      // If no item is explicitly selected, highlight the first result
      const selected = this.selectedIndex >= 0
        ? (index === this.selectedIndex ? 'selected' : '')
        : (index === 0 ? 'selected' : '')
      const scorePercent = Math.round(result.score * 100)
      const scoreClass = scorePercent > 80 ? 'high' : scorePercent > 60 ? 'medium' : 'low'

      html += `
        <div class="search-result-item ${selected}" data-index="${index}" data-name="${result.name}">
          <div class="search-result-name">
            <span class="result-text">${this.highlightMatch(this.searchInput.value, result.name)}</span>
            <span class="result-score ${scoreClass}">${scorePercent}%</span>
          </div>
        </div>
      `
    })

    this.searchResults.innerHTML = html
    this.searchResults.style.display = 'block'
    this.currentResults = results
  }

  /**
   * Highlight matched characters in result
   */
  highlightMatch(query, text) {
    const regex = new RegExp(`(${query.split('').join('|')})`, 'gi')
    return text.replace(regex, '<strong>$1</strong>')
  }

  /**
   * Hide search results
   */
  hideResults() {
    this.searchResults.style.display = 'none'
    this.currentResults = []
    this.selectedIndex = -1
  }

  /**
   * Clear search
   */
  clearSearch() {
    this.searchInput.value = ''
    this.clearButton.style.display = 'none'
    this.hideResults()
  }

  // ========================================================================
  // VECTOR SELECTION
  // ========================================================================

  /**
   * Select and focus on a vector
   */
  selectVector(name) {
    // Clear current selection
    this.state.clearSelection()

    // Select the vector
    this.state.selectVector(name)

    // Update the interaction handler
    this.interactionHandler.updateSelection()

    // Focus camera on the vector (pass only one coordinate to trigger single vector focus)
    const vectorData = vectors[name]
    if (vectorData && vectorData.coords) {
      // Pass null as second param to explicitly trigger single vector focus
      this.cameraController.focusOnVectors(vectorData.coords, null)
    }

    // Clear search after selection
    this.clearSearch()
  }

  // ========================================================================
  // EVENT LISTENERS
  // ========================================================================

  setupEventListeners() {
    // Input events
    this.searchInput.addEventListener('input', (e) => {
      const query = e.target.value

      if (query.length > 0) {
        this.clearButton.style.display = 'block'
        const results = this.searchVectors(query)
        this.displayResults(results)
      } else {
        this.clearButton.style.display = 'none'
        this.hideResults()
      }
    })

    // Keyboard navigation
    this.searchInput.addEventListener('keydown', (e) => {
      switch(e.key) {
        case 'ArrowDown':
          e.preventDefault()
          this.navigateResults(1)
          break
        case 'ArrowUp':
          e.preventDefault()
          this.navigateResults(-1)
          break
        case 'Enter':
          e.preventDefault()
          // Always select first result if any results exist
          if (this.currentResults.length > 0) {
            // Use selected index if one is selected, otherwise use first result
            const indexToUse = this.selectedIndex >= 0 ? this.selectedIndex : 0
            this.selectVector(this.currentResults[indexToUse].name)
          }
          break
        case 'Escape':
          this.clearSearch()
          this.searchInput.blur()
          break
      }
    })

    // Clear button
    this.clearButton.addEventListener('click', () => {
      this.clearSearch()
      this.searchInput.focus()
    })

    // Click on results
    this.searchResults.addEventListener('click', (e) => {
      const item = e.target.closest('.search-result-item')
      if (item) {
        const name = item.dataset.name
        this.selectVector(name)
      }
    })

    // Click outside to close
    document.addEventListener('click', (e) => {
      if (!this.searchInput.contains(e.target) &&
          !this.searchResults.contains(e.target) &&
          !this.clearButton.contains(e.target)) {
        this.hideResults()
      }
    })
  }

  /**
   * Navigate through results with arrow keys
   */
  navigateResults(direction) {
    if (this.currentResults.length === 0) return

    this.selectedIndex += direction

    // Wrap around
    if (this.selectedIndex < 0) {
      this.selectedIndex = this.currentResults.length - 1
    } else if (this.selectedIndex >= this.currentResults.length) {
      this.selectedIndex = 0
    }

    // Update UI
    const items = this.searchResults.querySelectorAll('.search-result-item')
    items.forEach((item, index) => {
      if (index === this.selectedIndex) {
        item.classList.add('selected')
        item.scrollIntoView({ block: 'nearest' })
      } else {
        item.classList.remove('selected')
      }
    })
  }
}