'use client';

import { useState, useEffect, useRef } from 'react';
import Image from 'next/image';

interface ParallaxImageProps {
  src: string;
  alt: string;
  title: string;
  subtitle: string;
  className?: string;
}

export function ParallaxImage({
  src,
  alt,
  title,
  subtitle,
  className = '',
}: ParallaxImageProps) {
  // Parallax effect state
  const [parallaxOffset, setParallaxOffset] = useState(0);
  const [parallaxScale, setParallaxScale] = useState(1);
  const [isSmallScreen, setIsSmallScreen] = useState(false);
  const parallaxRef = useRef<HTMLDivElement>(null);

  // Handle screen size changes
  useEffect(() => {
    const handleResize = () => {
      setIsSmallScreen(window.innerWidth < 640);
    };

    // Set initial screen size
    handleResize();

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Parallax scroll effect with improved bounds and responsive behavior
  useEffect(() => {
    const handleScroll = () => {
      if (parallaxRef.current) {
        const rect = parallaxRef.current.getBoundingClientRect();
        const scrolled = window.pageYOffset;
        const windowHeight = window.innerHeight;

        // Much more conservative parallax movement to prevent cutoff
        const maxOffset = isSmallScreen ? 20 : 40; // Very small movement
        const parallaxRate = isSmallScreen ? -0.05 : -0.1; // Very slow movement
        const rate = Math.max(
          Math.min(scrolled * parallaxRate, maxOffset),
          -maxOffset
        );

        // Minimal scaling to prevent image from moving out of bounds
        const maxScale = isSmallScreen ? 1.02 : 1.05; // Very minimal scaling
        const scaleRate = isSmallScreen ? 0.0001 : 0.0002; // Very slow scaling
        const scale = Math.max(Math.min(1 + scrolled * scaleRate, maxScale), 1);

        setParallaxOffset(rate);
        setParallaxScale(scale);
      }
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, [isSmallScreen]);

  // Get responsive image sizing based on screen size
  const imageSizing = isSmallScreen
    ? { width: '180%', height: '180%', left: '-40%', top: '-40%' }
    : { width: '120%', height: '120%', left: '-10%', top: '-10%' };

  return (
    <div
      ref={parallaxRef}
      className={`flex-1 lg:basis-1/2 relative bg-zinc-900 overflow-hidden min-h-[300px] sm:min-h-[400px] md:min-h-[500px] lg:min-h-[600px] ${className}`}
    >
      <div
        className="absolute inset-0 w-full h-full"
        style={{
          transform: `translateY(${parallaxOffset}px) scale(${parallaxScale})`,
          transition: 'transform 0.1s ease-out',
          transformOrigin: 'center center',
          width: imageSizing.width,
          height: imageSizing.height,
          left: imageSizing.left,
          top: imageSizing.top,
        }}
      >
        <Image
          src={src}
          alt={alt}
          className="w-full h-full object-cover"
          width={1000}
          height={800}
          priority
        />
      </div>
      <div className="absolute inset-0 bg-gradient-to-br from-purple-900/80 to-pink-900/80 z-10"></div>
      <div className="auth-screen absolute inset-0 z-20 flex items-center justify-center px-3 sm:px-4 md:px-6 lg:px-8">
        <div className="text-center text-white">
          <h1 className="text-lg sm:text-xl md:text-2xl lg:text-3xl xl:text-4xl font-bold mb-2 sm:mb-3 md:mb-4">
            {title}
          </h1>
          <p className="text-xs sm:text-sm md:text-base lg:text-lg text-white/80 max-w-[200px] sm:max-w-xs md:max-w-sm lg:max-w-md">
            {subtitle}
          </p>
        </div>
      </div>
    </div>
  );
}
