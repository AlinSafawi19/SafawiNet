'use client';

import React from 'react';

export const LoadingPage: React.FC = () => {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-site">
      <div className="relative w-full h-full flex items-center justify-center overflow-hidden">
        <div className="flex flex-col items-center justify-center space-y-4">
          <div className="w-8 h-8 border-4 border-gray-300 border-t-purple-600 rounded-full animate-spin"></div>
        </div>
      </div>
    </div>
  );
};
