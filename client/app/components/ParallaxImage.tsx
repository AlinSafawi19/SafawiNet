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
  className = '' 
}: ParallaxImageProps) {
  // Parallax effect state
  const [parallaxOffset, setParallaxOffset] = useState(0);
  const [parallaxScale, setParallaxScale] = useState(1);
  const parallaxRef = useRef<HTMLDivElement>(null);

  // Parallax scroll effect with widening/zooming
  useEffect(() => {
    const handleScroll = () => {
      if (parallaxRef.current) {
        const rect = parallaxRef.current.getBoundingClientRect();
        const scrolled = window.pageYOffset;
        const rate = scrolled * -0.3; // Vertical movement (slower)
        const scale = 1 + (scrolled * 0.0005); // Scale effect (zooming/widening)
        
        setParallaxOffset(rate);
        setParallaxScale(Math.max(scale, 1)); // Ensure scale doesn't go below 1
      }
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <div 
      ref={parallaxRef}
      className={`flex-1 lg:basis-1/2 relative hidden sm:block bg-zinc-900 overflow-hidden ${className}`}
    >
      <div 
        className="absolute inset-0 w-full h-full"
        style={{
          transform: `translateY(${parallaxOffset}px) scale(${parallaxScale})`,
          transition: 'transform 0.1s ease-out',
          transformOrigin: 'center center',
          width: '120%',
          height: '120%',
          left: '-10%',
          top: '-10%'
        }}
      >
        <Image
          src={src}
          alt={alt}
          className="w-full h-full object-cover"
          width={1000}
          height={800}
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
