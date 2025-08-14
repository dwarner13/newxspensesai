import React, { useState, useEffect, useRef } from 'react';
import { lazyLoadImage } from '../utils/performance';

interface OptimizedImageProps {
  src: string;
  alt: string;
  className?: string;
  width?: number;
  height?: number;
  loading?: 'lazy' | 'eager';
  sizes?: string;
  priority?: boolean;
  placeholder?: string;
  fallback?: string;
}

const OptimizedImage: React.FC<OptimizedImageProps> = ({
  src,
  alt,
  className = '',
  width,
  height,
  loading = 'lazy',
  sizes = '100vw',
  priority = false,
  placeholder = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTAwIiBoZWlnaHQ9IjEwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAwIiBoZWlnaHQ9IjEwMCIgZmlsbD0iI2YzZjRmNiIvPjwvc3ZnPg==',
  fallback,
}) => {
  const [imageSrc, setImageSrc] = useState(placeholder);
  const [isLoaded, setIsLoaded] = useState(false);
  const [hasError, setHasError] = useState(false);
  const imgRef = useRef<HTMLImageElement>(null);

  // Generate WebP and AVIF sources
  const generateOptimizedSources = (originalSrc: string) => {
    const baseName = originalSrc.split('.').slice(0, -1).join('.');
    const extension = originalSrc.split('.').pop();
    
    // Only generate optimized sources for supported formats
    if (['jpg', 'jpeg', 'png'].includes(extension?.toLowerCase() || '')) {
      return {
        webp: `${baseName}.webp`,
        avif: `${baseName}.avif`,
        original: originalSrc,
      };
    }
    
    return { original: originalSrc };
  };

  const sources = generateOptimizedSources(src);

  useEffect(() => {
    if (priority) {
      // Load immediately for priority images
      setImageSrc(src);
    } else if (loading === 'lazy' && imgRef.current) {
      // Lazy load non-priority images
      lazyLoadImage(imgRef.current, src);
    } else {
      setImageSrc(src);
    }
  }, [src, priority, loading]);

  const handleLoad = () => {
    setIsLoaded(true);
    setImageSrc(src);
  };

  const handleError = () => {
    setHasError(true);
    if (fallback) {
      setImageSrc(fallback);
    }
  };

  const handleIntersection = (entries: IntersectionObserverEntry[]) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting && !isLoaded && !hasError) {
        setImageSrc(src);
      }
    });
  };

  useEffect(() => {
    if (loading === 'lazy' && imgRef.current && !priority) {
      const observer = new IntersectionObserver(handleIntersection, {
        rootMargin: '50px',
        threshold: 0.1,
      });
      
      observer.observe(imgRef.current);
      
      return () => observer.disconnect();
    }
  }, [loading, priority, isLoaded, hasError, src]);

  return (
    <picture>
      {/* AVIF format - best compression */}
      {sources.avif && (
        <source
          type="image/avif"
          srcSet={sources.avif}
          sizes={sizes}
        />
      )}
      
      {/* WebP format - good compression, wide support */}
      {sources.webp && (
        <source
          type="image/webp"
          srcSet={sources.webp}
          sizes={sizes}
        />
      )}
      
      {/* Fallback to original format */}
      <img
        ref={imgRef}
        src={imageSrc}
        alt={alt}
        className={`${className} ${isLoaded ? 'loaded' : 'loading'}`}
        width={width}
        height={height}
        loading={priority ? 'eager' : loading}
        onLoad={handleLoad}
        onError={handleError}
        style={{
          opacity: isLoaded ? 1 : 0.7,
          transition: 'opacity 0.3s ease-in-out',
        }}
      />
    </picture>
  );
};

export default OptimizedImage;
