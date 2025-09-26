'use client';

import React from 'react';

export const LoadingPage: React.FC = () => {

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-site">
      <div className="relative w-full h-full flex items-center justify-center overflow-hidden">
        loading ...
      </div>
    </div>
  );
};
