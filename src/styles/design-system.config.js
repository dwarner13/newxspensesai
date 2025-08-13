/**
 * XspensesAI Design System Configuration
 * PROTECTED - DO NOT MODIFY WITHOUT APPROVAL
 */

export const XspensesDesignSystem = {
  // ========================================
  // CORE THEME TOKENS
  // ========================================
  theme: {
    colors: {
      primary: {
        purple: '#8b5cf6',
        pink: '#a855f7',
        blue: '#06b6d4',
        green: '#10b981',
        red: '#ef4444'
      },
      background: {
        primary: 'linear-gradient(135deg, #1e1b4b 0%, #312e81 50%, #4c1d95 100%)',
        card: 'rgba(30, 27, 75, 0.6)',
        sidebar: 'rgba(30, 27, 75, 0.95)'
      },
      text: {
        primary: '#ffffff',
        secondary: '#e2e8f0',
        muted: '#a78bfa'
      }
    },
    spacing: {
      xs: '0.25rem',
      sm: '0.5rem',
      md: '1rem',
      lg: '1.5rem',
      xl: '2rem',
      xxl: '3rem'
    },
    borderRadius: {
      sm: '8px',
      md: '12px',
      lg: '16px',
      xl: '20px'
    },
    shadows: {
      sm: '0 2px 4px rgba(0, 0, 0, 0.1)',
      md: '0 4px 6px rgba(0, 0, 0, 0.1)',
      lg: '0 10px 15px rgba(0, 0, 0, 0.1)',
      xl: '0 10px 40px rgba(0, 0, 0, 0.1)'
    },
    breakpoints: {
      mobile: '768px',
      tablet: '1024px',
      desktop: '1280px'
    }
  },

  // ========================================
  // COMPONENT CONFIGURATIONS
  // ========================================
  components: {
    sidebar: {
      width: '280px',
      padding: '24px',
      sections: ['brand', 'navigation', 'user-profile']
    },
    card: {
      padding: '24px',
      borderRadius: '16px',
      backdropBlur: 'blur(20px)'
    },
    button: {
      padding: '12px 24px',
      borderRadius: '16px',
      fontWeight: '600'
    },
    grid: {
      gap: '24px',
      columns: {
        '2': '2fr 1fr',
        '3': 'repeat(3, 1fr)',
        '4': 'repeat(4, 1fr)'
      }
    }
  },

  // ========================================
  // UTILITY FUNCTIONS
  // ========================================
  utils: {
    /**
     * Get CSS variable value
     */
    getCSSVariable: (variableName) => {
      return getComputedStyle(document.documentElement)
        .getPropertyValue(`--xspenses-${variableName}`)
        .trim();
    },

    /**
     * Set CSS variable value (use with caution)
     */
    setCSSVariable: (variableName, value) => {
      document.documentElement.style.setProperty(`--xspenses-${variableName}`, value);
    },

    /**
     * Validate component class usage
     */
    validateComponentClass: (className) => {
      const validClasses = [
        'xspenses-dashboard-container',
        'xspenses-sidebar',
        'xspenses-main-content',
        'xspenses-card',
        'xspenses-title',
        'xspenses-subtitle',
        'xspenses-text',
        'xspenses-button',
        'xspenses-grid',
        'xspenses-grid-2',
        'xspenses-grid-3',
        'xspenses-grid-4',
        'xspenses-status-online',
        'xspenses-status-offline',
        'xspenses-status-dot'
      ];
      return validClasses.includes(className);
    },

    /**
     * Get responsive breakpoint
     */
    getBreakpoint: () => {
      const width = window.innerWidth;
      if (width < 768) return 'mobile';
      if (width < 1024) return 'tablet';
      return 'desktop';
    },

    /**
     * Check if design system is loaded
     */
    isDesignSystemLoaded: () => {
      return document.querySelector('link[href*="design-system.css"]') !== null;
    }
  },

  // ========================================
  // VALIDATION RULES
  // ========================================
  validation: {
    /**
     * Validate color usage
     */
    validateColor: (color) => {
      const validColors = [
        '#8b5cf6', '#a855f7', '#06b6d4', '#10b981', '#ef4444',
        '#ffffff', '#e2e8f0', '#a78bfa'
      ];
      return validColors.includes(color.toLowerCase());
    },

    /**
     * Validate spacing usage
     */
    validateSpacing: (spacing) => {
      const validSpacings = ['0', '0.25rem', '0.5rem', '1rem', '1.5rem', '2rem', '3rem'];
      return validSpacings.includes(spacing);
    },

    /**
     * Validate border radius usage
     */
    validateBorderRadius: (radius) => {
      const validRadii = ['8px', '12px', '16px', '20px'];
      return validRadii.includes(radius);
    }
  },

  // ========================================
  // VERSION INFO
  // ========================================
  version: '1.0.0',
  lastUpdated: '2024-12-19',
  maintainer: 'XspensesAI Design Team',

  // ========================================
  // DEPRECATION WARNINGS
  // ========================================
  deprecations: {
    'old-sidebar-class': {
      message: 'Use xspenses-sidebar instead of sidebar',
      replacement: 'xspenses-sidebar',
      version: '1.0.0'
    },
    'old-card-class': {
      message: 'Use xspenses-card instead of card',
      replacement: 'xspenses-card',
      version: '1.0.0'
    }
  }
};

// ========================================
// DESIGN SYSTEM VALIDATOR
// ========================================
export class DesignSystemValidator {
  constructor() {
    this.warnings = [];
    this.errors = [];
  }

  /**
   * Validate a component's class usage
   */
  validateComponent(element) {
    const classes = element.className.split(' ');
    
    classes.forEach(className => {
      if (className.startsWith('xspenses-')) {
        if (!XspensesDesignSystem.utils.validateComponentClass(className)) {
          this.warnings.push(`Unknown design system class: ${className}`);
        }
      }
    });
  }

  /**
   * Validate color usage in styles
   */
  validateColors(styles) {
    const colorRegex = /#[0-9a-fA-F]{6}/g;
    const colors = styles.match(colorRegex) || [];
    
    colors.forEach(color => {
      if (!XspensesDesignSystem.validation.validateColor(color)) {
        this.warnings.push(`Non-standard color used: ${color}`);
      }
    });
  }

  /**
   * Get validation report
   */
  getReport() {
    return {
      warnings: this.warnings,
      errors: this.errors,
      isValid: this.errors.length === 0
    };
  }

  /**
   * Clear validation results
   */
  clear() {
    this.warnings = [];
    this.errors = [];
  }
}

// ========================================
// DESIGN SYSTEM MONITOR
// ========================================
export class DesignSystemMonitor {
  constructor() {
    this.validator = new DesignSystemValidator();
    this.isMonitoring = false;
  }

  /**
   * Start monitoring for design system violations
   */
  startMonitoring() {
    if (this.isMonitoring) return;
    
    this.isMonitoring = true;
    this.observeDOM();
    console.log('🔍 XspensesAI Design System monitoring started');
  }

  /**
   * Stop monitoring
   */
  stopMonitoring() {
    this.isMonitoring = false;
    console.log('🔍 XspensesAI Design System monitoring stopped');
  }

  /**
   * Observe DOM changes for design system violations
   */
  observeDOM() {
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        mutation.addedNodes.forEach((node) => {
          if (node.nodeType === Node.ELEMENT_NODE) {
            this.validator.validateComponent(node);
          }
        });
      });
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true
    });
  }
}

// ========================================
// EXPORT DEFAULT CONFIGURATION
// ========================================
export default XspensesDesignSystem; 