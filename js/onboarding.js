/**
 * Onboarding Tour System
 * Progressive disclosure tutorial for first-time users
 */

export class OnboardingTour {
  constructor() {
    this.currentStep = 0;
    this.isActive = false;

    this.steps = [
      {
        target: '#canvas-container',
        title: 'Welcome to Vector Space',
        content: `
          <p>Each arrow represents a <strong>word transformed into a 384-dimensional vector</strong>, then compressed to 3D using PCA (Principal Component Analysis).</p>
          <p style="margin-top: 12px;">Words that point in similar directions have <span style="color: var(--accent-primary);">similar meanings</span>.</p>
        `,
        position: 'center',
        highlight: false,
        actions: [
          { label: 'Next', type: 'primary', action: 'next' },
          { label: 'Skip Tour', type: 'secondary', action: 'skip' }
        ]
      },
      {
        target: '.legend',
        title: 'Color Coding',
        content: `
          <p>Colors show <strong>cosine similarity</strong> — how aligned two vectors are in direction.</p>
          <ul style="margin-top: 8px; padding-left: 20px;">
            <li><span style="color: var(--accent-primary);">Green</span>: Very similar (>0.7)</li>
            <li><span style="color: var(--accent-warning);">Yellow</span>: Somewhat similar (0.3-0.7)</li>
            <li><span style="color: var(--accent-danger);">Red</span>: Different (<0.3)</li>
          </ul>
        `,
        position: 'right',
        highlight: true,
        actions: [
          { label: 'Next', type: 'primary', action: 'next' },
          { label: 'Back', type: 'secondary', action: 'back' }
        ]
      },
      {
        target: '.instructions',
        title: 'Interact with Vectors',
        content: `
          <p><strong>Hover</strong> over any vector to see its relationships</p>
          <p style="margin-top: 8px;"><strong>Click two vectors</strong> to visualize the angle between them and see detailed similarity metrics</p>
          <p style="margin-top: 8px;"><strong>Drag</strong> to rotate your view in 3D space</p>
        `,
        position: 'right',
        highlight: true,
        actions: [
          { label: 'Next', type: 'primary', action: 'next' },
          { label: 'Back', type: 'secondary', action: 'back' }
        ]
      },
      {
        target: '#word-input',
        title: 'Add Your Own Words',
        content: `
          <p>Type <strong>any word or phrase</strong>. The AI will:</p>
          <ol style="margin-top: 8px; padding-left: 20px;">
            <li>Transform it into a 384D vector using transformers</li>
            <li>Project it into 3D space with PCA</li>
            <li>Place it relative to existing words</li>
          </ol>
          <p style="margin-top: 12px; font-style: italic; color: var(--text-muted);">Try: "artificial intelligence", "sunset", or "quantum computing"</p>
        `,
        position: 'right',
        highlight: true,
        actions: [
          { label: 'Try It Now', type: 'primary', action: 'complete' },
          { label: 'Back', type: 'secondary', action: 'back' }
        ]
      }
    ];
  }

  /**
   * Check if user has completed the tour before
   */
  hasCompletedTour() {
    return localStorage.getItem('vector-viz-tour-completed') === 'true';
  }

  /**
   * Mark tour as completed
   */
  markCompleted() {
    localStorage.setItem('vector-viz-tour-completed', 'true');
  }

  /**
   * Start the onboarding tour
   */
  start() {
    if (this.isActive) return;

    this.isActive = true;
    this.currentStep = 0;
    this.createOverlay();
    this.showStep(0);
  }

  /**
   * Create the backdrop overlay
   */
  createOverlay() {
    const overlay = document.createElement('div');
    overlay.id = 'onboarding-overlay';
    overlay.className = 'onboarding-overlay';
    overlay.innerHTML = `
      <div class="onboarding-backdrop"></div>
      <div class="onboarding-spotlight"></div>
    `;
    document.body.appendChild(overlay);
  }

  /**
   * Show a specific step
   */
  showStep(stepIndex) {
    if (stepIndex < 0 || stepIndex >= this.steps.length) return;

    this.currentStep = stepIndex;
    const step = this.steps[stepIndex];

    // Remove existing card
    const existingCard = document.querySelector('.onboarding-card');
    if (existingCard) {
      existingCard.remove();
    }

    // Remove previous highlights
    document.querySelectorAll('.onboarding-highlight').forEach(el => {
      el.classList.remove('onboarding-highlight');
    });

    // Create and position the card
    const card = this.createCard(step);
    document.body.appendChild(card);

    // Position spotlight and card
    if (step.target && step.highlight) {
      this.positionSpotlight(step.target);
      this.positionCard(card, step.target, step.position);
    } else {
      this.hideSpotlight();
      this.centerCard(card);
    }

    // Animate entrance
    requestAnimationFrame(() => {
      card.classList.add('visible');
    });
  }

  /**
   * Create the onboarding card UI
   */
  createCard(step) {
    const card = document.createElement('div');
    card.className = 'onboarding-card';

    const actionsHTML = step.actions.map(action => {
      const btnClass = action.type === 'primary' ? 'onboarding-btn-primary' : 'onboarding-btn-secondary';
      return `<button class="onboarding-btn ${btnClass}" data-action="${action.action}">${action.label}</button>`;
    }).join('');

    const progress = this.steps.map((_, i) =>
      `<div class="progress-dot ${i === this.currentStep ? 'active' : i < this.currentStep ? 'completed' : ''}"></div>`
    ).join('');

    card.innerHTML = `
      <div class="onboarding-card-header">
        <h2 class="onboarding-title">${step.title}</h2>
        <button class="onboarding-close" data-action="skip">×</button>
      </div>
      <div class="onboarding-content">${step.content}</div>
      <div class="onboarding-footer">
        <div class="onboarding-progress">${progress}</div>
        <div class="onboarding-actions">${actionsHTML}</div>
      </div>
    `;

    // Attach event listeners
    card.querySelectorAll('[data-action]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        this.handleAction(btn.dataset.action);
      });
    });

    return card;
  }

  /**
   * Handle action button clicks
   */
  handleAction(action) {
    switch (action) {
      case 'next':
        if (this.currentStep < this.steps.length - 1) {
          this.showStep(this.currentStep + 1);
        } else {
          this.complete();
        }
        break;
      case 'back':
        if (this.currentStep > 0) {
          this.showStep(this.currentStep - 1);
        }
        break;
      case 'skip':
        this.skip();
        break;
      case 'complete':
        this.complete();
        break;
    }
  }

  /**
   * Position the spotlight on target element
   */
  positionSpotlight(targetSelector) {
    const spotlight = document.querySelector('.onboarding-spotlight');
    const backdrop = document.querySelector('.onboarding-backdrop');
    const target = document.querySelector(targetSelector);

    if (!spotlight || !backdrop || !target) return;

    const rect = target.getBoundingClientRect();
    const padding = 16;

    // Position the spotlight border
    spotlight.style.display = 'block';
    spotlight.style.left = `${rect.left - padding}px`;
    spotlight.style.top = `${rect.top - padding}px`;
    spotlight.style.width = `${rect.width + padding * 2}px`;
    spotlight.style.height = `${rect.height + padding * 2}px`;
    spotlight.style.borderRadius = window.getComputedStyle(target).borderRadius || '12px';

    // Cut a hole in the backdrop using clip-path
    const x = rect.left - padding;
    const y = rect.top - padding;
    const w = rect.width + padding * 2;
    const h = rect.height + padding * 2;

    // Create a path that covers everything except the spotlight area
    backdrop.style.clipPath = `polygon(
      0% 0%,
      0% 100%,
      ${x}px 100%,
      ${x}px ${y}px,
      ${x + w}px ${y}px,
      ${x + w}px ${y + h}px,
      ${x}px ${y + h}px,
      ${x}px 100%,
      100% 100%,
      100% 0%
    )`;

    // Bring target element to front by adding highlight class
    target.classList.add('onboarding-highlight');
  }

  /**
   * Hide the spotlight
   */
  hideSpotlight() {
    const spotlight = document.querySelector('.onboarding-spotlight');
    const backdrop = document.querySelector('.onboarding-backdrop');

    if (spotlight) {
      spotlight.style.display = 'none';
    }

    // Reset backdrop clip-path to cover everything
    if (backdrop) {
      backdrop.style.clipPath = 'none';
    }

    // Remove highlight class from any previously highlighted elements
    document.querySelectorAll('.onboarding-highlight').forEach(el => {
      el.classList.remove('onboarding-highlight');
    });
  }

  /**
   * Position card relative to target
   */
  positionCard(card, targetSelector, position) {
    const target = document.querySelector(targetSelector);
    if (!target) {
      this.centerCard(card);
      return;
    }

    const rect = target.getBoundingClientRect();
    const cardRect = card.getBoundingClientRect();
    const spacing = 24;

    let top, left;

    switch (position) {
      case 'right':
        left = rect.right + spacing;
        top = rect.top + (rect.height / 2) - (cardRect.height / 2);
        break;
      case 'left':
        left = rect.left - cardRect.width - spacing;
        top = rect.top + (rect.height / 2) - (cardRect.height / 2);
        break;
      case 'bottom':
        left = rect.left + (rect.width / 2) - (cardRect.width / 2);
        top = rect.bottom + spacing;
        break;
      case 'top':
        left = rect.left + (rect.width / 2) - (cardRect.width / 2);
        top = rect.top - cardRect.height - spacing;
        break;
      default:
        this.centerCard(card);
        return;
    }

    // Ensure card stays within viewport
    const maxLeft = window.innerWidth - cardRect.width - 20;
    const maxTop = window.innerHeight - cardRect.height - 20;

    left = Math.max(20, Math.min(left, maxLeft));
    top = Math.max(20, Math.min(top, maxTop));

    card.style.left = `${left}px`;
    card.style.top = `${top}px`;
  }

  /**
   * Center card in viewport
   */
  centerCard(card) {
    card.style.left = '50%';
    card.style.top = '50%';
    card.style.transform = 'translate(-50%, -50%)';
  }

  /**
   * Skip the tour
   */
  skip() {
    this.cleanup();
  }

  /**
   * Complete the tour
   */
  complete() {
    this.markCompleted();
    this.cleanup();

    // Focus on the word input to encourage engagement
    const input = document.getElementById('word-input');
    if (input) {
      input.focus();
    }
  }

  /**
   * Clean up and remove tour elements
   */
  cleanup() {
    this.isActive = false;

    const overlay = document.getElementById('onboarding-overlay');
    const card = document.querySelector('.onboarding-card');

    if (card) {
      card.classList.remove('visible');
      setTimeout(() => card.remove(), 300);
    }

    if (overlay) {
      overlay.classList.add('fade-out');
      setTimeout(() => overlay.remove(), 300);
    }

    // Remove highlight class from all elements
    document.querySelectorAll('.onboarding-highlight').forEach(el => {
      el.classList.remove('onboarding-highlight');
    });
  }

  /**
   * Restart the tour
   */
  restart() {
    localStorage.removeItem('vector-viz-tour-completed');
    this.start();
  }
}

// CSS for onboarding tour
export function injectOnboardingStyles() {
  const style = document.createElement('style');
  style.textContent = `
    /* Onboarding Overlay */
    .onboarding-overlay {
      position: fixed;
      inset: 0;
      z-index: var(--z-modal);
      pointer-events: none;
      animation: fadeIn 0.3s ease-out;
    }

    .onboarding-overlay.fade-out {
      animation: fadeOut 0.3s ease-out;
    }

    .onboarding-backdrop {
      position: fixed;
      inset: 0;
      background: rgba(10, 14, 39, 0.85);
      backdrop-filter: blur(4px);
      pointer-events: auto;
      z-index: var(--z-modal);
    }

    .onboarding-spotlight {
      position: fixed;
      border: 3px solid var(--accent-primary);
      box-shadow: 0 0 40px var(--accent-primary),
                  inset 0 0 20px rgba(74, 222, 128, 0.2);
      transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
      pointer-events: none;
      z-index: calc(var(--z-modal) + 3);
      background: transparent;
    }

    /* Highlighted element - bring to front above backdrop but below spotlight border */
    .onboarding-highlight {
      position: relative !important;
      z-index: calc(var(--z-modal) + 2) !important;
      pointer-events: auto !important;
    }

    /* Onboarding Card */
    .onboarding-card {
      position: fixed;
      background: var(--bg-panel);
      backdrop-filter: blur(var(--blur-xl));
      border: 2px solid var(--accent-primary-border);
      border-radius: var(--radius-xl);
      box-shadow: var(--shadow-2xl), var(--glow-primary);
      padding: var(--space-xl);
      max-width: 420px;
      z-index: calc(var(--z-modal) + 1);
      pointer-events: auto;
      opacity: 0;
      transform: translateY(20px);
      transition: all 0.3s cubic-bezier(0.68, -0.55, 0.27, 1.55);
    }

    .onboarding-card.visible {
      opacity: 1;
      transform: translateY(0);
    }

    .onboarding-card-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: var(--space-lg);
    }

    .onboarding-title {
      color: var(--accent-primary);
      font-size: var(--text-xl);
      font-weight: var(--weight-semibold);
      line-height: var(--leading-tight);
      letter-spacing: var(--tracking-tight);
      margin: 0;
    }

    .onboarding-close {
      background: none;
      border: none;
      color: var(--text-muted);
      font-size: 2rem;
      line-height: 1;
      cursor: pointer;
      padding: 0;
      width: 32px;
      height: 32px;
      display: flex;
      align-items: center;
      justify-content: center;
      border-radius: var(--radius-sm);
      transition: all var(--transition-fast);
    }

    .onboarding-close:hover {
      background: var(--state-hover-bg);
      color: var(--text-primary);
    }

    .onboarding-content {
      color: var(--text-secondary);
      font-size: var(--text-base);
      line-height: var(--leading-relaxed);
      margin-bottom: var(--space-xl);
    }

    .onboarding-content p {
      margin: 0 0 var(--space-sm) 0;
    }

    .onboarding-content strong {
      color: var(--text-primary);
      font-weight: var(--weight-semibold);
    }

    .onboarding-content ul,
    .onboarding-content ol {
      margin: 0;
      color: var(--text-tertiary);
    }

    .onboarding-content li {
      margin: var(--space-xs) 0;
    }

    .onboarding-footer {
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: var(--space-lg);
    }

    .onboarding-progress {
      display: flex;
      gap: var(--space-xs);
    }

    .progress-dot {
      width: 8px;
      height: 8px;
      border-radius: var(--radius-full);
      background: var(--border-medium);
      transition: all var(--transition-base);
    }

    .progress-dot.active {
      background: var(--accent-primary);
      transform: scale(1.3);
      box-shadow: 0 0 8px var(--accent-primary);
    }

    .progress-dot.completed {
      background: var(--accent-primary-border);
    }

    .onboarding-actions {
      display: flex;
      gap: var(--space-sm);
    }

    .onboarding-btn {
      padding: var(--space-sm) var(--space-lg);
      border-radius: var(--radius-md);
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      font-size: var(--text-sm);
      font-weight: var(--weight-semibold);
      cursor: pointer;
      transition: all var(--transition-fast);
      border: none;
    }

    .onboarding-btn-primary {
      background: var(--accent-primary);
      color: #0a0e27;
    }

    .onboarding-btn-primary:hover {
      background: var(--accent-primary-hover);
      transform: translateY(-1px);
      box-shadow: 0 4px 12px rgba(74, 222, 128, 0.3);
    }

    .onboarding-btn-secondary {
      background: var(--state-hover-bg);
      color: var(--text-secondary);
      border: 1px solid var(--border-medium);
    }

    .onboarding-btn-secondary:hover {
      background: var(--state-active-bg);
      color: var(--text-primary);
      border-color: var(--border-strong);
    }

    .onboarding-btn:active {
      transform: translateY(0);
    }

    /* Animations */
    @keyframes fadeIn {
      from { opacity: 0; }
      to { opacity: 1; }
    }

    @keyframes fadeOut {
      from { opacity: 1; }
      to { opacity: 0; }
    }

    /* Mobile Responsive */
    @media (max-width: 768px) {
      .onboarding-card {
        max-width: calc(100vw - 40px);
        padding: var(--space-lg);
        left: 20px !important;
        right: 20px !important;
        top: 50% !important;
        transform: translate(0, -50%) !important;
      }

      .onboarding-card.visible {
        transform: translate(0, -50%) !important;
      }

      .onboarding-title {
        font-size: var(--text-lg);
      }

      .onboarding-content {
        font-size: var(--text-sm);
      }

      .onboarding-footer {
        flex-direction: column-reverse;
        gap: var(--space-md);
      }

      .onboarding-actions {
        width: 100%;
      }

      .onboarding-btn {
        flex: 1;
      }
    }
  `;
  document.head.appendChild(style);
}
