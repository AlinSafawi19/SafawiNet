'use client';

import React, { useState } from 'react';
import { useTheme } from '../contexts/ThemeContext';
import { HiSun, HiMoon } from 'react-icons/hi2';

interface ThemeToggleProps {
  variant?: 'default' | 'mobile';
}

const ThemeToggle: React.FC<ThemeToggleProps> = ({ variant = 'default' }) => {
  const { theme, setTheme } = useTheme();
  const [isUpdating, setIsUpdating] = useState(false);

  const isMobile = variant === 'mobile';

  const toggleTheme = async () => {
    if (isUpdating) return; // Prevent multiple rapid clicks
    
    setIsUpdating(true);
    try {
      await setTheme(theme === 'light' ? 'dark' : 'light');
    } catch (error) {
      console.error('Failed to toggle theme:', error);
    } finally {
      setIsUpdating(false);
    }
  };

  // Mobile variant styling
  if (isMobile) {
    return (
      <button
        onClick={toggleTheme}
        disabled={isUpdating}
        className={`flex items-center space-x-2 transition-colors ${
          isUpdating 
            ? 'opacity-50 cursor-not-allowed' 
            : 'hover:text-purple-400'
        } text-white`}
        aria-label="Toggle theme"
      >
        {theme === 'light' ? (
          HiMoon({ className: "w-5 h-5" })
        ) : (
          HiSun({ className: "w-5 h-5" })
        )}
        <span className="text-sm font-medium">
          {isUpdating ? 'Updating...' : (theme === 'light' ? 'Dark' : 'Light')}
        </span>
      </button>
    );
  }

  // Default variant styling
  return (
    <button
      onClick={toggleTheme}
      disabled={isUpdating}
      className={`flex items-center space-x-1 transition-colors ${
        isUpdating 
          ? 'opacity-50 cursor-not-allowed' 
          : 'hover:text-purple-500'
      }`}
      aria-label="Toggle theme"
    >
      {theme === 'light' ? (
        HiMoon({ className: "w-5 h-5" })
      ) : (
        HiSun({ className: "w-5 h-5" })
      )}
      <span className="text-base font-medium">
        {isUpdating ? 'Updating...' : (theme === 'light' ? 'Dark' : 'Light')}
      </span>
    </button>
  );
};

export default ThemeToggle;
