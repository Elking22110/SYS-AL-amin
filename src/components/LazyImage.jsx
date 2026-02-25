import React, { useState, useRef, useEffect } from 'react';
import { Package } from 'lucide-react';

const LazyImage = ({ 
  src, 
  alt, 
  className = '', 
  placeholder = null,
  fallback = null,
  onLoad = null,
  onError = null
}) => {
  const [isLoaded, setIsLoaded] = useState(false);
  const [isInView, setIsInView] = useState(false);
  const [hasError, setHasError] = useState(false);
  const imgRef = useRef(null);

  // مراقبة العنصر عند دخوله للشاشة
  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsInView(true);
          observer.disconnect();
        }
      },
      {
        threshold: 0.1,
        rootMargin: '50px'
      }
    );

    if (imgRef.current) {
      observer.observe(imgRef.current);
    }

    return () => observer.disconnect();
  }, []);

  // تحميل الصورة عند دخولها للشاشة
  useEffect(() => {
    if (isInView && src && !isLoaded && !hasError) {
      const img = new Image();
      
      img.onload = () => {
        setIsLoaded(true);
        if (onLoad) onLoad();
      };
      
      img.onerror = () => {
        setHasError(true);
        if (onError) onError();
      };
      
      img.src = src;
    }
  }, [isInView, src, isLoaded, hasError, onLoad, onError]);

  return (
    <div ref={imgRef} className={`relative overflow-hidden ${className}`}>
      {!isInView ? (
        // Placeholder قبل دخول العنصر للشاشة
        <div className="w-full h-full bg-gray-600 flex items-center justify-center">
          {placeholder || <Package className="h-8 w-8 text-gray-400" />}
        </div>
      ) : !isLoaded ? (
        // Loading state
        <div className="w-full h-full bg-gray-600 flex items-center justify-center">
          <div className="animate-pulse">
            <Package className="h-8 w-8 text-gray-400" />
          </div>
        </div>
      ) : hasError ? (
        // Error state
        <div className="w-full h-full bg-gray-600 flex items-center justify-center">
          {fallback || <Package className="h-8 w-8 text-gray-400" />}
        </div>
      ) : (
        // الصورة المحملة
        <img
          src={src}
          alt={alt}
          className="w-full h-full object-cover"
          loading="lazy"
        />
      )}
    </div>
  );
};

export default LazyImage;