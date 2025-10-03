'use client';

import React from 'react';

interface MessageDisplayProps {
  successMessage?: string;
  errorMessage?: string;
  className?: string;
  lightBg?: boolean;
}

export default function MessageDisplay({
  successMessage,
  errorMessage,
  className = '',
  lightBg = false,
}: MessageDisplayProps) {
  if (!successMessage && !errorMessage) {
    return null;
  }

  return (
    <div className={`space-y-2 ${className}`}>
      {successMessage && (
        <div className={`${lightBg 
          ? 'bg-green-50 border-green-200' 
          : 'bg-green-500/10 border-green-500/20'
        } border rounded-lg p-3 sm:p-4`}>
          <div className="flex items-start gap-2 sm:gap-3">
              <p className={`${lightBg 
                ? 'text-green-700' 
                : 'text-green-300/80'
              } text-xs sm:text-sm`}>
                {successMessage}
              </p>
          </div>
        </div>
      )}

      {errorMessage && (
        <div className={`${lightBg 
          ? 'bg-red-50 border-red-200' 
          : 'bg-red-500/10 border-red-500/20'
        } border rounded-lg p-3 sm:p-4`}>
          <div className="flex items-start gap-2 sm:gap-3">
              <p className={`${lightBg 
                ? 'text-red-700' 
                : 'text-red-300/80'
              } text-xs sm:text-sm`}>
                {errorMessage}
              </p>
          </div>
        </div>
      )}
    </div>
  );
}
