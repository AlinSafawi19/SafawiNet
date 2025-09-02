'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useLanguage } from '../../contexts/LanguageContext';
import {
  HiUser,
  HiArrowRightOnRectangle,
  HiChevronDown,
} from 'react-icons/hi2';

interface UserDropdownProps {
  user: {
    name: string;
    email: string;
  };
}

const UserDropdown: React.FC<UserDropdownProps> = ({ user }) => {
  const { logout } = useAuth();
  const { t, locale } = useLanguage();
  const [isOpen, setIsOpen] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Check if current language is RTL
  const isRTL = locale === 'ar';

  const closeDropdown = useCallback(() => {
    if (!isAnimating) {
      setIsAnimating(true);
      setIsOpen(false);
      // Reset animation state after animation completes
      setTimeout(() => setIsAnimating(false), 600);
    }
  }, [isAnimating]);

  const openDropdown = () => {
    if (!isAnimating) {
      setIsAnimating(true);
      setIsOpen(true);
      // Reset animation state after animation completes
      setTimeout(() => setIsAnimating(false), 600);
    }
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        closeDropdown();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen, isAnimating, closeDropdown]);

  const handleLogout = () => {
    logout();
    closeDropdown();
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => (isOpen ? closeDropdown() : openDropdown())}
        className="flex items-center hover:text-purple-500 transition-colors text-base font-medium space-x-2"
        aria-label="User menu"
        aria-haspopup="true"
        disabled={isAnimating}
      >
        <span className="block">{user.name}</span>
        {HiChevronDown({
          className: `w-4 h-4 transition-transform duration-400 ease-out ${
            isOpen ? 'rotate-180' : ''
          }`,
        })}
      </button>

      {/* Dropdown Container - Positioned to emerge from header */}
      <div
        className={`absolute right-0 top-full w-48 z-50 overflow-hidden transition-all duration-600 ease-out dropdown-container ${
          isOpen ? 'opacity-100' : 'opacity-0'
        }`}
      >
        {/* Dropdown Content - seamless extension of header */}
        <div className="bg-white dark:bg-dark-surface py-1">
          <div className="px-4 py-2 border-b border-gray-200 dark:border-gray-700 text-center">
            <p className="text-sm font-medium text-gray-900 dark:text-white">
              {user.name}
            </p>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {user.email}
            </p>
          </div>

          <button
            onClick={() => closeDropdown()}
            className={`flex items-center hover:text-purple-500 transition-colors text-sm font-medium space-x-2 w-full px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 ${
              isRTL ? 'text-right justify-end' : 'text-left'
            }`}
          >
            {isRTL ? (
              <>
                <span>{t('header.auth.myAccount')}</span>
                {HiUser({ className: 'w-4 h-4 ml-3' })}
              </>
            ) : (
              <>
                {HiUser({ className: 'w-4 h-4 mr-3' })}
                <span>{t('header.auth.myAccount')}</span>
              </>
            )}
          </button>

          <button
            onClick={handleLogout}
            className={`flex items-center hover:text-purple-500 transition-colors text-sm font-medium space-x-2 w-full px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 ${
              isRTL ? 'text-right justify-end' : 'text-left'
            }`}
          >
            {isRTL ? (
              <>
                <span>{t('header.auth.logout')}</span>
                {HiArrowRightOnRectangle({ className: 'w-4 h-4 ml-3' })}
              </>
            ) : (
              <>
                {HiArrowRightOnRectangle({ className: 'w-4 h-4 mr-3' })}
                <span>{t('header.auth.logout')}</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default UserDropdown;
