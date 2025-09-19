'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../contexts/AuthContext';
import { useLanguage } from '../../contexts/LanguageContext';
import { useLoyalty } from '../../hooks/useLoyalty';
import {
  HiUser,
  HiArrowRightOnRectangle,
  HiChevronDown,
  HiGift,
  HiBugAnt,
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
  const {
    loyaltyAccount,
    isLoading: loyaltyLoading,
    isCustomer,
    translateTierName,
  } = useLoyalty();

  const router = useRouter();
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

  const handleMyAccount = () => {
    router.push('/account');
    closeDropdown();
  };

  const handleTestLogging = () => {
    router.push('/test-logging');
    closeDropdown();
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => (isOpen ? closeDropdown() : openDropdown())}
        className="flex items-center hover:text-purple-500 transition-colors text-base font-medium space-x-2 max-w-32 sm:max-w-40 md:max-w-48"
        aria-label={t('accessibility.userMenu')}
        aria-haspopup="true"
        disabled={isAnimating}
      >
        <span className="block truncate" title={user.name}>
          {user.name}
        </span>
        {HiChevronDown({
          className: `w-4 h-4 transition-transform duration-400 ease-out flex-shrink-0 ${
            isOpen ? 'rotate-180' : ''
          }`,
        })}
      </button>

      {/* Dropdown Container - Positioned to emerge from header */}
      <div
        className={`absolute right-0 top-full w-56 sm:w-64 z-50 overflow-hidden transition-all duration-600 ease-out dropdown-container ${
          isOpen ? 'opacity-100' : 'opacity-0'
        }`}
      >
        {/* Dropdown Content - seamless extension of header */}
        <div className="bg-white dark:bg-dark-surface py-1">
          <div className="px-4 py-2 border-b border-gray-200 dark:border-gray-700 text-center">
            <p
              className="text-sm font-medium text-gray-900 dark:text-white truncate"
              title={user.name}
            >
              {user.name}
            </p>
            <p
              className="text-sm text-gray-500 dark:text-gray-400 truncate"
              title={user.email}
            >
              {user.email}
            </p>
          </div>

          {/* Loyalty Section - Only show for customers */}
          {isCustomer && (
            <div className="px-4 py-2 border-b border-gray-200 dark:border-gray-700">
              <div
                className={`flex items-center mb-2 ${
                  isRTL ? 'text-right justify-end' : 'text-left'
                }`}
              >
                {isRTL ? (
                  <>
                    <span
                      className="text-sm font-medium text-gray-900 dark:text-white truncate"
                      title={t('header.loyalty.title')}
                    >
                      {t('header.loyalty.title')}
                    </span>
                    {HiGift({
                      className: 'w-4 h-4 text-purple-500 ml-2 flex-shrink-0',
                    })}
                  </>
                ) : (
                  <>
                    {HiGift({
                      className: 'w-4 h-4 text-purple-500 mr-2 flex-shrink-0',
                    })}
                    <span
                      className="text-sm font-medium text-gray-900 dark:text-white truncate"
                      title={t('header.loyalty.title')}
                    >
                      {t('header.loyalty.title')}
                    </span>
                  </>
                )}
              </div>

              {loyaltyLoading ? (
                <div className="text-xs text-gray-500 dark:text-gray-400">
                  {t('header.loyalty.loading')}
                </div>
              ) : loyaltyAccount ? (
                <div className="space-y-1">
                  <div className="flex justify-between items-center text-xs gap-1">
                    {isRTL ? (
                      <>
                        <span
                          className="font-medium text-gray-900 dark:text-white text-right truncate"
                          title={translateTierName(
                            loyaltyAccount.currentTier.name
                          )}
                        >
                          {translateTierName(loyaltyAccount.currentTier.name)}
                        </span>
                        <span className="text-gray-600 dark:text-gray-400 text-right flex-shrink-0">
                          :{t('header.loyalty.currentTier')}
                        </span>
                      </>
                    ) : (
                      <>
                        <span className="text-gray-600 dark:text-gray-400 text-left flex-shrink-0">
                          {t('header.loyalty.currentTier')}:
                        </span>
                        <span
                          className="font-medium text-gray-900 dark:text-white text-right truncate"
                          title={translateTierName(
                            loyaltyAccount.currentTier.name
                          )}
                        >
                          {translateTierName(loyaltyAccount.currentTier.name)}
                        </span>
                      </>
                    )}
                  </div>
                  <div className="flex justify-between items-center text-xs gap-1">
                    {isRTL ? (
                      <>
                        <span
                          className="font-medium text-purple-600 dark:text-purple-400 text-right truncate"
                          title={loyaltyAccount.currentPoints.toLocaleString()}
                        >
                          {loyaltyAccount.currentPoints.toLocaleString()}
                        </span>
                        <span className="text-gray-600 dark:text-gray-400 text-right flex-shrink-0">
                          :{t('header.loyalty.points')}
                        </span>
                      </>
                    ) : (
                      <>
                        <span className="text-gray-600 dark:text-gray-400 text-left flex-shrink-0">
                          {t('header.loyalty.points')}:
                        </span>
                        <span
                          className="font-medium text-purple-600 dark:text-purple-400 text-right truncate"
                          title={loyaltyAccount.currentPoints.toLocaleString()}
                        >
                          {loyaltyAccount.currentPoints.toLocaleString()}
                        </span>
                      </>
                    )}
                  </div>
                  {loyaltyAccount.nextTier && (
                    <div className="flex justify-between items-center text-xs gap-1">
                      {isRTL ? (
                        <>
                          <span
                            className="text-gray-900 dark:text-white font-medium text-left truncate"
                            title={`${loyaltyAccount.nextTier.pointsNeeded} ${t(
                              'header.loyalty.pointsNeeded'
                            )}`}
                          >
                            {loyaltyAccount.nextTier.pointsNeeded}{' '}
                            {t('header.loyalty.pointsNeeded')}
                          </span>
                          <span className="text-gray-600 dark:text-gray-400 text-right flex-shrink-0">
                            :{t('header.loyalty.nextTier')}
                          </span>
                        </>
                      ) : (
                        <>
                          <span className="text-gray-600 dark:text-gray-400 text-left flex-shrink-0">
                            {t('header.loyalty.nextTier')}:
                          </span>
                          <span
                            className="text-gray-900 dark:text-white font-medium text-right truncate"
                            title={`${loyaltyAccount.nextTier.pointsNeeded} ${t(
                              'header.loyalty.pointsNeeded'
                            )}`}
                          >
                            {loyaltyAccount.nextTier.pointsNeeded}{' '}
                            {t('header.loyalty.pointsNeeded')}
                          </span>
                        </>
                      )}
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-xs text-gray-500 dark:text-gray-400 text-center">
                  {t('header.loyalty.noAccount')}
                </div>
              )}
            </div>
          )}

          <button
            onClick={handleMyAccount}
            className={`flex items-center hover:text-purple-500 transition-colors text-sm font-medium space-x-2 w-full px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 ${
              isRTL ? 'text-right justify-end' : 'text-left'
            }`}
          >
            {isRTL ? (
              <>
                <span className="truncate" title={t('header.auth.myAccount')}>
                  {t('header.auth.myAccount')}
                </span>
                {HiUser({ className: 'w-4 h-4 ml-3 flex-shrink-0' })}
              </>
            ) : (
              <>
                {HiUser({ className: 'w-4 h-4 mr-3 flex-shrink-0' })}
                <span className="truncate" title={t('header.auth.myAccount')}>
                  {t('header.auth.myAccount')}
                </span>
              </>
            )}
          </button>

          {/* Temporary Test Logging Link - Only show in development */}
          {process.env.NODE_ENV === 'development' && (
            <button
              onClick={handleTestLogging}
              className={`flex items-center hover:text-purple-500 transition-colors text-sm font-medium space-x-2 w-full px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 ${
                isRTL ? 'text-right justify-end' : 'text-left'
              }`}
            >
              {isRTL ? (
                <>
                  <span className="truncate" title="Test Logging System">
                    Test Logging
                  </span>
                  {HiBugAnt({ className: 'w-4 h-4 ml-3 flex-shrink-0' })}
                </>
              ) : (
                <>
                  {HiBugAnt({ className: 'w-4 h-4 mr-3 flex-shrink-0' })}
                  <span className="truncate" title="Test Logging System">
                    Test Logging
                  </span>
                </>
              )}
            </button>
          )}

          <button
            onClick={handleLogout}
            className={`flex items-center hover:text-purple-500 transition-colors text-sm font-medium space-x-2 w-full px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 ${
              isRTL ? 'text-right justify-end' : 'text-left'
            }`}
          >
            {isRTL ? (
              <>
                <span className="truncate" title={t('header.auth.logout')}>
                  {t('header.auth.logout')}
                </span>
                {HiArrowRightOnRectangle({
                  className: 'w-4 h-4 ml-3 flex-shrink-0',
                })}
              </>
            ) : (
              <>
                {HiArrowRightOnRectangle({
                  className: 'w-4 h-4 mr-3 flex-shrink-0',
                })}
                <span className="truncate" title={t('header.auth.logout')}>
                  {t('header.auth.logout')}
                </span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default UserDropdown;
