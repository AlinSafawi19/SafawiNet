'use client';

import React, {
  useState,
  useRef,
  useEffect,
  useCallback,
  useMemo,
} from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../contexts/AuthContext';
import { useLoyalty } from '../../hooks/useLoyalty';
import {
  HiUser,
  HiArrowRightOnRectangle,
  HiChevronDown,
  HiGift,
} from 'react-icons/hi2';

interface UserDropdownProps {
  user: {
    name: string;
    email: string;
  };
}

const UserDropdown: React.FC<UserDropdownProps> = ({ user }) => {
  // Add responsive optimization - prevent unnecessary re-renders on screen size changes
  useEffect(() => {
    let resizeTimeout: NodeJS.Timeout | undefined;

    const handleResize = () => {
      // Debounce resize events to prevent excessive re-renders
      clearTimeout(resizeTimeout);
    };

    window.addEventListener('resize', handleResize);
    return () => {
      window.removeEventListener('resize', handleResize);
      clearTimeout(resizeTimeout);
    };
  }, []);

  const { logout } = useAuth();
  const {
    loyaltyAccount,
    isLoading: loyaltyLoading,
    isCustomer,
  } = useLoyalty();

  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const closeDropdown = useCallback(() => {
    if (!isAnimating) {
      setIsAnimating(true);
      setIsOpen(false);
      // Reset animation state after animation completes
      setTimeout(() => {
        setIsAnimating(false);
      }, 600);
    }
  }, [isAnimating]);

  const openDropdown = useCallback(() => {
    if (!isAnimating) {
      setIsAnimating(true);
      setIsOpen(true);
      // Reset animation state after animation completes
      setTimeout(() => {
        setIsAnimating(false);
      }, 600);
    }
  }, [isAnimating]);

  // Optimized click outside handler - stable reference
  const handleClickOutside = useCallback(
    (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        closeDropdown();
      }
    },
    [closeDropdown]
  );

  // Optimized event listener management - only add when dropdown is open
  useEffect(() => {
    if (!isOpen) return;

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen, handleClickOutside]);

  const handleLogout = useCallback(() => {
    logout();
    closeDropdown();
  }, [logout, closeDropdown]);

  const handleMyAccount = useCallback(() => {
    router.push('/account');
    closeDropdown();
  }, [router, closeDropdown]);

  // Memoized click handler for performance
  const handleToggleDropdown = useCallback(() => {
    if (isOpen) {
      closeDropdown();
    } else {
      openDropdown();
    }
  }, [isOpen, closeDropdown, openDropdown]);

  // Memoized button props for performance
  const buttonProps = useMemo(
    () => ({
      type: 'button' as const,
      onClick: handleToggleDropdown,
      className:
        'flex items-center hover:text-purple-500 transition-colors text-base font-medium space-x-2 max-w-32 sm:max-w-40 md:max-w-48',
      'aria-label': 'User Menu',
      'aria-haspopup': true as const,
      disabled: isAnimating,
    }),
    [handleToggleDropdown, isAnimating]
  );

  return (
    <div className="relative" ref={dropdownRef}>
      <button {...buttonProps}>
        <span className="block truncate" title={user.name}>
          {user.name}
        </span>
        {HiChevronDown({
          className:
            'w-4 h-4 transition-transform duration-400 ease-out flex-shrink-0',
        })}
      </button>

      {/* Dropdown Container - Positioned to emerge from header */}
      <div
        className={`absolute right-0 top-full w-56 sm:w-64 z-50 overflow-hidden transition-all duration-600 ease-out dropdown-container ${
          isOpen ? 'opacity-100' : 'opacity-0'
        }`}
      >
        {/* Dropdown Content - seamless extension of header */}
        <div className="bg-white py-1">
          <div className="px-4 py-2 border-b border-gray-200 text-center">
            <p
              className="text-sm font-medium text-gray-900 truncate"
              title={user.name}
            >
              {user.name}
            </p>
            <p className="text-sm text-gray-500 truncate" title={user.email}>
              {user.email}
            </p>
          </div>

          {/* Loyalty Section - Only show for customers */}
          {isCustomer && (
            <div className="px-4 py-2 border-b border-gray-200">
              <div className="flex items-center mb-2 text-left justify-end">
                {HiGift({
                  className: 'w-4 h-4 text-purple-500 mr-2 flex-shrink-0',
                })}
                <span
                  className="text-sm font-medium text-gray-900 truncate"
                  title={'Loyalty'}
                >
                  {'Loyalty'}
                </span>
              </div>

              {loyaltyLoading ? (
                <div className="text-xs text-gray-500">{'Loading...'}</div>
              ) : loyaltyAccount ? (
                <div className="space-y-1">
                  <div className="flex justify-between items-center text-xs gap-1">
                    <span className="text-gray-600 text-left flex-shrink-0">
                      {'Current Tier'}:
                    </span>
                    <span
                      className="font-medium text-gray-900 text-right truncate"
                      title={loyaltyAccount.currentTier.name}
                    >
                      {loyaltyAccount.currentTier.name}
                    </span>
                  </div>
                  <div className="flex justify-between items-center text-xs gap-1">
                    <span className="text-gray-600 text-left flex-shrink-0">
                      {'Points'}:
                    </span>
                    <span
                      className="font-medium text-purple-600 text-right truncate"
                      title={loyaltyAccount.currentPoints.toLocaleString()}
                    >
                      {loyaltyAccount.currentPoints.toLocaleString()}
                    </span>
                  </div>
                  {loyaltyAccount.nextTier && (
                    <div className="flex justify-between items-center text-xs gap-1">
                      <span className="text-gray-600 text-left flex-shrink-0">
                        {'Next Tier'}:
                      </span>
                      <span
                        className="text-gray-900 font-medium text-right truncate"
                        title={`${
                          loyaltyAccount.nextTier.pointsNeeded
                        } ${'Points Needed'}`}
                      >
                        {loyaltyAccount.nextTier.pointsNeeded} {'Points Needed'}
                      </span>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-xs text-gray-500 text-center">
                  {'No Account'}
                </div>
              )}
            </div>
          )}

          <button
            type="button"
            onClick={handleMyAccount}
            className="flex items-center hover:text-purple-500 transition-colors text-sm font-medium space-x-2 w-full px-4 py-2 text-gray-700 hover:bg-gray-100 text-left"
          >
            {HiUser({ className: 'w-4 h-4 mr-3 flex-shrink-0' })}
            <span className="truncate" title={'My Account'}>
              {'My Account'}
            </span>
          </button>

          <button
            type="button"
            onClick={handleLogout}
            className="flex items-center hover:text-purple-500 transition-colors text-sm font-medium space-x-2 w-full px-4 py-2 text-gray-700 hover:bg-gray-100 text-left"
          >
            {HiArrowRightOnRectangle({
              className: 'w-4 h-4 mr-3 flex-shrink-0',
            })}
            <span className="truncate" title={'Logout'}>
              {'Logout'}
            </span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default UserDropdown;
