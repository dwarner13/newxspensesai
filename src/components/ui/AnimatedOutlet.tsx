/**
 * AnimatedOutlet Component
 * 
 * Wraps React Router's Outlet with smooth Framer Motion transitions.
 * Keeps the shell (header/sidebar/rail) mounted while animating only the main content.
 * 
 * Animation specs:
 * - Smooth fade/slide transition (opacity + y translation)
 * - NO blur (blur causes flash)
 * - Fast duration (220ms)
 * - Premium easing (easeOut)
 */

import { useLocation } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { Outlet } from 'react-router-dom';
import { useMemo } from 'react';

export function AnimatedOutlet() {
  const location = useLocation();
  
  // Use pathname as key to trigger animations on route change
  // Include search params if needed for query-based routes
  const key = useMemo(() => {
    return location.pathname + location.search;
  }, [location.pathname, location.search]);

  // Check for reduced motion preference
  const prefersReducedMotion = useMemo(() => {
    if (typeof window === 'undefined') return false;
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  }, []);

  // Animation variants - smooth fade/slide, NO blur (blur causes flash)
  const pageVariants = {
    initial: {
      opacity: 0,
      y: 8,
    },
    animate: {
      opacity: 1,
      y: 0,
    },
    exit: {
      opacity: 0,
      y: -8,
    },
  };

  // Reduced motion variants (minimal animation)
  const reducedMotionVariants = {
    initial: {
      opacity: 0.98,
    },
    animate: {
      opacity: 1,
    },
    exit: {
      opacity: 0.98,
    },
  };

  const variants = prefersReducedMotion ? reducedMotionVariants : pageVariants;

  return (
    <div className="w-full min-h-[calc(100vh-120px)]" style={{ position: 'relative' }}>
      <AnimatePresence mode="wait" initial={false}>
        <motion.div
          key={key}
          variants={variants}
          initial="initial"
          animate="animate"
          exit="exit"
          transition={{
            duration: prefersReducedMotion ? 0.1 : 0.22,
            ease: "easeOut", // Smooth easing, no blur
          }}
          style={{
            width: '100%',
            minHeight: 'inherit',
            // Ensure content doesn't shift during transition
            willChange: 'opacity, transform',
            position: 'relative',
          }}
          // Prevent layout shift by maintaining dimensions
          className="w-full"
        >
          <Outlet />
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

