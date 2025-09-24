'use client';

import { useEffect } from 'react';

export const PerformanceOptimizer: React.FC = () => {
  useEffect(() => {
    // Preload critical resources
    const preloadCriticalResources = () => {
      // Fonts are now handled via globals.css only

      // Preload critical images
      const heroImage = document.createElement('link');
      heroImage.rel = 'preload';
      heroImage.href = 'https://static.wixstatic.com/media/503ea4_ed9a38760ae04aab86b47e82525fdcac~mv2.jpg/v1/fill/w_918,h_585,al_c,q_85,usm_0.66_1.00_0.01,enc_auto/503ea4_ed9a38760ae04aab86b47e82525fdcac~mv2.jpg';
      heroImage.as = 'image';
      document.head.appendChild(heroImage);
    };

    // Optimize scroll performance
    const optimizeScrollPerformance = () => {
      let ticking = false;
      
      const updateScrollPosition = () => {
        // Use requestAnimationFrame for smooth scrolling
        if (!ticking) {
          requestAnimationFrame(() => {
            ticking = false;
          });
          ticking = true;
        }
      };

      window.addEventListener('scroll', updateScrollPosition, { passive: true });
      
      return () => {
        window.removeEventListener('scroll', updateScrollPosition);
      };
    };

    // Optimize resize performance
    const optimizeResizePerformance = () => {
      let resizeTimeout: NodeJS.Timeout;
      
      const handleResize = () => {
        clearTimeout(resizeTimeout);
        resizeTimeout = setTimeout(() => {
          // Handle resize logic here
        }, 250);
      };

      window.addEventListener('resize', handleResize, { passive: true });
      
      return () => {
        clearTimeout(resizeTimeout);
        window.removeEventListener('resize', handleResize);
      };
    };

    // Initialize optimizations
    preloadCriticalResources();
    const cleanupScroll = optimizeScrollPerformance();
    const cleanupResize = optimizeResizePerformance();

    return () => {
      cleanupScroll();
      cleanupResize();
    };
  }, []);

  return null;
};
