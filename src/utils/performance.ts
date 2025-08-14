// Performance optimization utilities

/**
 * Load non-critical scripts after main content
 */
export const loadNonCriticalScript = (src: string, callback?: () => void) => {
  if (typeof window !== 'undefined' && 'requestIdleCallback' in window) {
    // Use requestIdleCallback if available (modern browsers)
    (window as any).requestIdleCallback(() => {
      loadScript(src, callback);
    });
  } else {
    // Fallback to setTimeout for older browsers
    setTimeout(() => {
      loadScript(src, callback);
    }, 1000);
  }
};

/**
 * Load analytics scripts with delay
 */
export const loadAnalytics = (src: string, callback?: () => void) => {
  // Delay analytics loading to prioritize main content
  setTimeout(() => {
    loadScript(src, callback);
  }, 2000);
};

/**
 * Load tracking scripts in background
 */
export const loadTrackingScript = (src: string, callback?: () => void) => {
  if (typeof window !== 'undefined' && 'requestIdleCallback' in window) {
    (window as any).requestIdleCallback(() => {
      loadScript(src, callback);
    }, { timeout: 5000 });
  } else {
    setTimeout(() => {
      loadScript(src, callback);
    }, 3000);
  }
};

/**
 * Preload critical resources
 */
export const preloadResource = (href: string, as: string) => {
  if (typeof window !== 'undefined') {
    const link = document.createElement('link');
    link.rel = 'preload';
    link.href = href;
    link.as = as;
    link.crossOrigin = 'anonymous';
    document.head.appendChild(link);
  }
};

/**
 * Prefetch non-critical resources
 */
export const prefetchResource = (href: string) => {
  if (typeof window !== 'undefined') {
    const link = document.createElement('link');
    link.rel = 'prefetch';
    link.href = href;
    document.head.appendChild(link);
  }
};

/**
 * Lazy load images with Intersection Observer
 */
export const lazyLoadImage = (img: HTMLImageElement, src: string) => {
  if ('IntersectionObserver' in window) {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          img.src = src;
          img.classList.remove('lazy');
          observer.unobserve(img);
        }
      });
    });
    observer.observe(img);
  } else {
    // Fallback for older browsers
    img.src = src;
  }
};

/**
 * Optimize font loading
 */
export const optimizeFontLoading = () => {
  if (typeof window !== 'undefined') {
    // Preload critical fonts
    preloadResource('/fonts/inter-var.woff2', 'font');
    
    // Use font-display: swap for better performance
    const style = document.createElement('style');
    style.textContent = `
      @font-face {
        font-family: 'Inter';
        font-display: swap;
        src: url('/fonts/inter-var.woff2') format('woff2');
      }
    `;
    document.head.appendChild(style);
  }
};

/**
 * Defer non-critical CSS
 */
export const deferCSS = (href: string) => {
  if (typeof window !== 'undefined') {
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = href;
    link.media = 'print';
    link.onload = () => {
      link.media = 'all';
    };
    document.head.appendChild(link);
  }
};

/**
 * Load script dynamically
 */
const loadScript = (src: string, callback?: () => void) => {
  const script = document.createElement('script');
  script.src = src;
  script.async = true;
  script.defer = true;
  
  if (callback) {
    script.onload = callback;
  }
  
  document.head.appendChild(script);
};

/**
 * Performance monitoring
 */
export const measurePerformance = (name: string, fn: () => void) => {
  if (typeof window !== 'undefined' && 'performance' in window) {
    const start = performance.now();
    fn();
    const end = performance.now();
    console.log(`${name} took ${end - start} milliseconds`);
  } else {
    fn();
  }
};

/**
 * Debounce function for performance
 */
export const debounce = <T extends (...args: any[]) => any>(
  func: T,
  wait: number
): ((...args: Parameters<T>) => void) => {
  let timeout: NodeJS.Timeout;
  return (...args: Parameters<T>) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
};

/**
 * Throttle function for performance
 */
export const throttle = <T extends (...args: any[]) => any>(
  func: T,
  limit: number
): ((...args: Parameters<T>) => void) => {
  let inThrottle: boolean;
  return (...args: Parameters<T>) => {
    if (!inThrottle) {
      func(...args);
      inThrottle = true;
      setTimeout(() => (inThrottle = false), limit);
    }
  };
};
