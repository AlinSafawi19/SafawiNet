'use client';

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
  return (
    <div
      className={`flex-1 lg:basis-1/2 relative bg-zinc-900 overflow-hidden min-h-[300px] sm:min-h-[400px] md:min-h-[500px] lg:min-h-[600px] ${className}`}
    >
      <Image
        src={src}
        alt={alt}
        className="w-full h-full object-cover"
        width={1000}
        height={800}
        priority
      />
      <div className="absolute inset-0 bg-gradient-to-br from-purple-900/80 to-pink-900/80 z-10"></div>
      <div className="absolute inset-0 z-20 flex items-center justify-center px-3 sm:px-4 md:px-6 lg:px-8">
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
