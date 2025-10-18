/**
 * Performance monitoring utilities
 */

// Measure component render time
export function measurePerformance(componentName: string, fn: () => void) {
  if (typeof window !== 'undefined' && 'performance' in window) {
    const startTime = performance.now();
    fn();
    const endTime = performance.now();
    console.log(`[Performance] ${componentName}: ${(endTime - startTime).toFixed(2)}ms`);
  } else {
    fn();
  }
}

// Report Web Vitals
export function reportWebVitals(metric: {
  id: string;
  name: string;
  value: number;
  label: 'web-vital' | 'custom';
}) {
  if (process.env.NODE_ENV === 'production') {
    console.log(metric);
    // You can send to analytics service here
  }
}

// Prefetch images
export function prefetchImages(urls: string[]) {
  if (typeof window !== 'undefined') {
    urls.forEach(url => {
      const link = document.createElement('link');
      link.rel = 'prefetch';
      link.as = 'image';
      link.href = url;
      document.head.appendChild(link);
    });
  }
}

// Check if user prefers reduced motion
export function prefersReducedMotion(): boolean {
  if (typeof window !== 'undefined') {
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  }
  return false;
}


