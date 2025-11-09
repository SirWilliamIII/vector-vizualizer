/**
 * Mobile-friendly tooltip behavior
 * Adds tap-to-toggle functionality for touch devices
 */

export function initMobileTooltips() {
  const isTouchDevice = ('ontouchstart' in window) || (navigator.maxTouchPoints > 0);

  if (!isTouchDevice) return; // Only apply for touch devices

  const helpIcons = document.querySelectorAll('.help-icon');

  helpIcons.forEach(icon => {
    let isTooltipVisible = false;

    // Prevent default hover behavior on touch devices
    icon.addEventListener('touchstart', (e) => {
      e.preventDefault();
      e.stopPropagation();

      const tooltip = icon.querySelector('.help-tooltip');
      if (!tooltip) return;

      // Toggle tooltip
      isTooltipVisible = !isTooltipVisible;

      if (isTooltipVisible) {
        // Show tooltip
        tooltip.style.opacity = '1';
        tooltip.style.visibility = 'visible';
        tooltip.style.bottom = '140%';
        tooltip.style.pointerEvents = 'auto';

        // Add active class to help icon
        icon.classList.add('tooltip-active');

        // Close when tapping outside
        const closeTooltip = (event) => {
          if (!icon.contains(event.target)) {
            tooltip.style.opacity = '0';
            tooltip.style.visibility = 'hidden';
            tooltip.style.bottom = '130%';
            tooltip.style.pointerEvents = 'none';
            icon.classList.remove('tooltip-active');
            isTooltipVisible = false;
            document.removeEventListener('touchstart', closeTooltip);
          }
        };

        setTimeout(() => {
          document.addEventListener('touchstart', closeTooltip);
        }, 100);
      } else {
        // Hide tooltip
        tooltip.style.opacity = '0';
        tooltip.style.visibility = 'hidden';
        tooltip.style.bottom = '130%';
        tooltip.style.pointerEvents = 'none';
        icon.classList.remove('tooltip-active');
      }
    });
  });
}

// Add pulse animation for help icons on first load (discovery hint)
export function pulseHelpIcons() {
  const helpIcons = document.querySelectorAll('.help-icon-text');

  helpIcons.forEach((icon, index) => {
    setTimeout(() => {
      icon.style.animation = 'pulse 2s ease-in-out 3';

      // Remove animation after 6 seconds
      setTimeout(() => {
        icon.style.animation = '';
      }, 6000);
    }, index * 500); // Stagger the pulse animations
  });
}

// Inject CSS for mobile tooltips
export function injectMobileTooltipStyles() {
  const style = document.createElement('style');
  style.textContent = `
    /* Pulse animation for discovery */
    @keyframes pulse {
      0%, 100% {
        transform: scale(1);
        box-shadow: 0 0 0 0 rgba(74, 222, 128, 0.4);
      }
      50% {
        transform: scale(1.15);
        box-shadow: 0 0 0 8px rgba(74, 222, 128, 0);
      }
    }

    /* Active state for tapped help icons */
    .help-icon.tooltip-active .help-icon-text {
      background: rgba(74, 222, 128, 0.35);
      border-color: var(--accent-primary);
      transform: scale(1.15);
    }

    /* Mobile-specific tooltip adjustments */
    @media (max-width: 768px) {
      .help-tooltip {
        position: fixed;
        left: 50% !important;
        bottom: auto !important;
        top: 50% !important;
        transform: translate(-50%, -50%) !important;
        min-width: 280px;
        max-width: calc(100vw - 40px);
        pointer-events: auto;
      }

      .help-tooltip::after {
        display: none; /* Hide arrow on mobile centered tooltips */
      }

      /* Add close button for mobile */
      .help-tooltip::before {
        content: '×';
        position: absolute;
        top: var(--space-sm);
        right: var(--space-sm);
        width: 28px;
        height: 28px;
        display: flex;
        align-items: center;
        justify-content: center;
        background: var(--state-hover-bg);
        border-radius: var(--radius-sm);
        color: var(--text-muted);
        font-size: 24px;
        line-height: 1;
        cursor: pointer;
      }
    }
  `;
  document.head.appendChild(style);
}
