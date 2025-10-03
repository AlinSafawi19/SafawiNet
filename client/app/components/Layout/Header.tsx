'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import Link from 'next/link';
import {
  HiBell,
  HiOutlineShoppingCart,
  HiHeart,
  HiBars3,
  HiXMark,
  HiHome,
  HiUsers,
  HiCube,
  HiShoppingCart as HiOrders,
  HiChartBar,
} from 'react-icons/hi2';
import { useAuth } from '../../contexts/AuthContext';
import UserDropdown from './UserDropdown';

const Header = React.memo(() => {
  const { user, logout, isLoading: isAuthLoading, isSuperAdmin } = useAuth();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);

  // Admin navigation items - memoize to prevent re-creation
  const adminNavigationItems = useMemo(
    () =>
      [
        {
          name: 'Dashboard',
          href: '/admin',
          icon: HiHome,
          label: 'admin.sidebar.dashboard',
        },
        // Admins section - only for superadmin users
        ...(isSuperAdmin()
          ? [
              {
                name: 'Admins',
                href: '/admin/admins',
                icon: HiUsers,
                label: 'admin.sidebar.admins',
              },
            ]
          : []),
        {
          name: 'Customers',
          href: '/admin/customers',
          icon: HiUsers,
          label: 'admin.sidebar.customers',
        },
        {
          name: 'Products',
          href: '/admin/products',
          icon: HiCube,
          label: 'admin.sidebar.products',
        },
        {
          name: 'Orders',
          href: '/admin/orders',
          icon: HiOrders,
          label: 'admin.sidebar.orders',
        },
        {
          name: 'Analytics',
          href: '/admin/analytics',
          icon: HiChartBar,
          label: 'admin.sidebar.analytics',
        },
      ] as const,
    [isSuperAdmin]
  );

  const toggleMobileMenu = useCallback(() => {
    setIsMobileMenuOpen(!isMobileMenuOpen);
  }, [isMobileMenuOpen]);

  const closeMobileMenu = useCallback(() => {
    setIsMobileMenuOpen(false);
  }, []);

  // Close menu on escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (isMobileMenuOpen) {
          closeMobileMenu();
        }
      }
    };

    if (isMobileMenuOpen) {
      document.addEventListener('keydown', handleEscape);
      // Prevent body scroll when menu is open
      document.body.style.overflow = 'hidden';
    } else {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = 'unset';
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = 'unset';
    };
  }, [isMobileMenuOpen, closeMobileMenu]);

  // Scroll detection with throttling for better performance
  useEffect(() => {
    let ticking = false;

    const handleScroll = () => {
      if (!ticking) {
        requestAnimationFrame(() => {
          const scrollY = window.scrollY;
          const newIsScrolled = scrollY > 0;
          if (newIsScrolled !== isScrolled) {
            setIsScrolled(newIsScrolled);
          }
          ticking = false;
        });
        ticking = true;
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => {
      window.removeEventListener('scroll', handleScroll);
    };
  }, [isScrolled]);

  // Check if user is admin - memoize to prevent re-renders
  const isAdmin = useMemo(
    () => user && user.roles && user.roles.includes('ADMIN'),
    [user]
  );

  return (
    <>
      <header
        className={`fixed top-0 left-0 right-0 h-header z-40 w-full bg-white shadow-sm transition-all duration-300 ease-in-out ${
          isScrolled ? 'shadow-lg bg-white/95 backdrop-blur-sm' : 'shadow-sm'
        }`}
      >
        <div className="flex justify-between px-4 sm:px-6 lg:px-14 h-header items-center">
          {/* Logo */}
          <div className="flex justify-start">
            <h2 className="text-xl sm:text-2xl lg:text-3xl font-bold">
              <Link
                href="/"
                className="hover:text-purple-500 transition-colors"
              >
                SAFAWI NET
              </Link>
            </h2>
          </div>

          {/* Main Navigation - Hidden for admin users */}
          {!isAdmin && (
            <nav className="hidden lg-tablet:flex items-center space-x-8">
              <Link
                href="/"
                className="text-gray-700 hover:text-purple-500 transition-colors font-medium text-lg"
              >
                {'Home'}
              </Link>
              <Link
                href="/products"
                className="text-gray-700 hover:text-purple-500 transition-colors font-medium text-lg"
              >
                {'Products'}
              </Link>
              <Link
                href="/deals"
                className="text-gray-700 hover:text-purple-500 transition-colors font-medium text-lg"
              >
                {'Deals'}
              </Link>
              <Link
                href="/about"
                className="text-gray-700 hover:text-purple-500 transition-colors font-medium text-lg"
              >
                {'About'}
              </Link>
            </nav>
          )}

          {/* Desktop Navigation & Mobile Menu Button */}
          <div className="flex justify-end items-center space-x-2 sm:space-x-4 md-tablet:space-x-3 lg-tablet:space-x-6">
            {/* Desktop Navigation */}
            <nav className="hidden lg-tablet:flex items-center space-x-4 xl:space-x-6">
              <button
                type="button"
                className="flex flex-col items-center space-y-1 hover:text-purple-500 transition-colors group"
                aria-label={'Notifications'}
              >
                {HiBell({ className: 'w-4 h-4' })}
                <span className="text-xs text-gray-600 group-hover:text-purple-500 transition-colors">
                  {'Notifications'}
                </span>
              </button>
              {/* Wishlist - Hidden for admin users */}
              {!isAdmin && (
                <Link
                  href="/wishlist"
                  className="flex flex-col items-center space-y-1 hover:text-purple-500 transition-colors group"
                  aria-label={'Wishlist'}
                >
                  {HiHeart({ className: 'w-4 h-4' })}
                  <span className="text-xs text-gray-600 group-hover:text-purple-500 transition-colors">
                    {'Wishlist'}
                  </span>
                </Link>
              )}
              {/* Cart - Hidden for admin users */}
              {!isAdmin && (
                <Link
                  href="/cart"
                  className="flex flex-col items-center space-y-1 hover:text-purple-500 transition-colors group"
                  aria-label={'Cart'}
                >
                  {HiOutlineShoppingCart({ className: 'w-4 h-4' })}
                  <span className="text-xs text-gray-600 group-hover:text-purple-500 transition-colors">
                    {'Cart'}
                  </span>
                </Link>
              )}

              {/* Login/Register or User Dropdown - Desktop version */}
              {isAuthLoading ? (
                <div className="w-20 h-6 bg-gray-300 rounded animate-pulse"></div>
              ) : user ? (
                <UserDropdown key="desktop-dropdown" user={user} />
              ) : (
                <Link
                  href="/auth"
                  className="hover:text-purple-500 transition-colors text-base max-w-32 sm:max-w-40 truncate"
                  title={'Login/Register'}
                >
                  {'Login/Register'}
                </Link>
              )}
            </nav>

            {/* Mobile Auth Section - Show Login/Register or User Dropdown next to menu button */}
            <div className="lg-tablet:hidden flex items-center space-x-2">
              {isAuthLoading ? (
                <div className="w-16 h-6 bg-gray-300 rounded animate-pulse"></div>
              ) : user ? (
                <UserDropdown key="mobile-dropdown" user={user} />
              ) : (
                <Link
                  href="/auth"
                  className="hover:text-purple-500 transition-colors text-sm font-medium px-3 py-1 rounded-md transition-all duration-200 max-w-24 sm:max-w-32 truncate"
                  title={'Login/Register'}
                >
                  {'Login/Register'}
                </Link>
              )}
            </div>

            {/* Mobile Menu Button */}
            <button
              onClick={toggleMobileMenu}
              type="button"
              className="lg-tablet:hidden p-2 hover:text-purple-500 transition-colors group"
              aria-label={'Toggle Mobile Menu'}
            >
              <div className="relative w-8 h-8 overflow-hidden">
                {/* Hamburger Icon */}
                <div
                  className={`absolute inset-0 transition-all duration-300 ease-in-out ${
                    isMobileMenuOpen
                      ? 'opacity-0 rotate-180 scale-50 translate-y-2'
                      : 'opacity-100 rotate-0 scale-100 translate-y-0'
                  }`}
                >
                  {HiBars3({ className: 'w-8 h-8' })}
                </div>

                {/* X Icon */}
                <div
                  className={`absolute inset-0 transition-all duration-300 ease-in-out ${
                    isMobileMenuOpen
                      ? 'opacity-100 rotate-0 scale-100 translate-y-0'
                      : 'opacity-0 -rotate-180 scale-50 -translate-y-2'
                  }`}
                >
                  {HiXMark({ className: 'w-8 h-8' })}
                </div>
              </div>
            </button>
          </div>
        </div>

        {/* Mobile Menu Overlay */}
        <div
          className={`fixed top-0 left-0 right-0 bottom-0 w-screen h-screen bg-black z-[9999] lg-tablet:hidden transition-all duration-300 ease-in-out ${
            isMobileMenuOpen ? 'opacity-100 visible' : 'opacity-0 invisible'
          }`}
        >
          {/* Close Button */}
          <button
            onClick={closeMobileMenu}
            type="button"
            className={`absolute top-6 text-white hover:text-purple-500 transition-all duration-300 z-[10000] right-6 ${
              isMobileMenuOpen
                ? 'opacity-100 translate-x-0'
                : 'opacity-0 translate-x-4'
            }`}
            aria-label={'Close Mobile Menu'}
          >
            {HiXMark({ className: 'w-8 h-8' })}
          </button>

          {/* Full Screen Menu Content */}
          <div
            className={`flex flex-col h-screen w-full text-white px-6 transition-all duration-500 ease-out overflow-y-auto scrollbar-thin scrollbar-track-transparent scrollbar-thumb-white/20 hover:scrollbar-thumb-white/40 ${
              isMobileMenuOpen
                ? 'opacity-100 translate-x-0'
                : 'opacity-0 translate-x-full'
            }`}
          >
            {/* Top Section - Logo & Image */}
            <div className="flex flex-col items-center pt-20 pb-6">
              <div className="flex flex-col-reverse sm:flex-col items-center">
                <h2
                  className={`text-center text-2xl sm:text-3xl md:text-4xl lg:text-4xl xl:text-5xl z-20 transition-all duration-700 ease-out delay-200 ${
                    isMobileMenuOpen
                      ? 'opacity-100 translate-x-0'
                      : 'opacity-0 translate-x-full'
                  }`}
                >
                  SAFAWI NET
                </h2>
              </div>
            </div>

            {/* Bottom Section - Navigation & Actions */}
            <div className="flex-1 flex flex-col justify-center pb-8">
              {/* Main Navigation Section */}
              <div
                className={`mb-8 transition-all duration-700 ease-out delay-300 ${
                  isMobileMenuOpen
                    ? 'opacity-100 translate-x-0'
                    : 'opacity-0 translate-x-full'
                }`}
              >
                <h3 className="text-white/60 text-base font-medium uppercase tracking-wider mb-4 text-center">
                  {'Navigation'}
                </h3>
                {isAdmin ? (
                  // Admin Navigation - Same grid layout as regular navigation
                  <div className="grid grid-cols-2 gap-4 max-w-xs mx-auto w-full place-items-center">
                    {adminNavigationItems.map((item) => {
                      const IconComponent = item.icon;
                      return (
                        <Link
                          key={item.name}
                          href={item.href}
                          className="text-center py-3 px-4 rounded-lg bg-white/10 hover:bg-white/20 transition-all duration-300 text-white hover:text-purple-400 w-full h-full min-h-[48px] flex flex-col items-center justify-center text-base group"
                          onClick={closeMobileMenu}
                        >
                          {IconComponent({
                            className:
                              'w-5 h-5 text-white group-hover:text-purple-400 transition-colors mb-1',
                          })}
                          <span
                            className={`text-xs font-medium text-center leading-tight max-w-full truncate`}
                            title={item.label || item.name}
                          >
                            {item.label || item.name}
                          </span>
                        </Link>
                      );
                    })}
                  </div>
                ) : (
                  // Regular User Navigation - Grid layout
                  <div className="grid grid-cols-2 gap-4 max-w-xs mx-auto w-full place-items-center">
                    <Link
                      href="/"
                      className="text-center py-3 px-4 rounded-lg bg-white/10 hover:bg-white/20 transition-all duration-300 text-white hover:text-purple-400 w-full h-full min-h-[48px] flex items-center justify-center text-base"
                      onClick={closeMobileMenu}
                      title={'Home'}
                    >
                      <span className="truncate">{'Home'}</span>
                    </Link>
                    <Link
                      href="/products"
                      className="text-center py-3 px-4 rounded-lg bg-white/10 hover:bg-white/20 transition-all duration-300 text-white hover:text-purple-400 w-full h-full min-h-[48px] flex items-center justify-center text-base"
                      onClick={closeMobileMenu}
                      title={'Products'}
                    >
                      <span className="truncate">{'Products'}</span>
                    </Link>
                    <Link
                      href="/deals"
                      className="text-center py-3 px-4 rounded-lg bg-white/10 hover:bg-white/20 transition-all duration-300 text-white hover:text-purple-400 w-full h-full min-h-[48px] flex items-center justify-center text-base"
                      onClick={closeMobileMenu}
                      title={'Deals'}
                    >
                      <span className="truncate">{'Deals'}</span>
                    </Link>
                    <Link
                      href="/about"
                      className="text-center py-3 px-4 rounded-lg bg-white/10 hover:bg-white/20 transition-all duration-300 text-white hover:text-purple-400 w-full h-full min-h-[48px] flex items-center justify-center text-base"
                      onClick={closeMobileMenu}
                      title={'About'}
                    >
                      <span className="truncate">{'About'}</span>
                    </Link>
                  </div>
                )}
              </div>

              {/* Quick Actions Section */}
              <div
                className={`mb-8 transition-all duration-700 ease-out delay-300 ${
                  isMobileMenuOpen
                    ? 'opacity-100 translate-x-0'
                    : 'opacity-0 translate-x-full'
                }`}
              >
                <h3 className="text-white/60 text-base font-medium uppercase tracking-wider mb-4 text-center">
                  {'Quick Actions'}
                </h3>
                <div className="flex justify-center space-x-6">
                  {/* Wishlist - Hidden for admin users */}
                  {!isAdmin && (
                    <Link
                      href="/wishlist"
                      className="flex flex-col items-center space-y-2 p-3 rounded-lg bg-white/10 hover:bg-white/20 transition-all duration-300 group"
                      onClick={closeMobileMenu}
                    >
                      <div className="text-white group-hover:text-purple-400 transition-colors">
                        {HiHeart({ className: 'w-7 h-7' })}
                      </div>
                      <span
                        className="text-sm text-white/80 group-hover:text-white truncate"
                        title={'Wishlist'}
                      >
                        {'Wishlist'}
                      </span>
                    </Link>
                  )}
                  {/* Cart - Hidden for admin users */}
                  {!isAdmin && (
                    <Link
                      href="/cart"
                      className="flex flex-col items-center space-y-2 p-3 rounded-lg bg-white/10 hover:bg-white/20 transition-all duration-300 group"
                      onClick={closeMobileMenu}
                    >
                      <div className="text-white group-hover:text-purple-400 transition-colors">
                        {HiOutlineShoppingCart({ className: 'w-7 h-7' })}
                      </div>
                      <span
                        className="text-sm text-white/80 group-hover:text-white truncate"
                        title={'Cart'}
                      >
                        {'Cart'}
                      </span>
                    </Link>
                  )}
                  <button
                    type="button"
                    className="flex flex-col items-center space-y-2 p-3 rounded-lg bg-white/10 hover:bg-white/20 transition-all duration-300 group"
                  >
                    <div className="text-white group-hover:text-purple-400 transition-colors">
                      {HiBell({ className: 'w-7 h-7' })}
                    </div>
                    <span
                      className="text-sm text-white/80 group-hover:text-white truncate"
                      title={'Notifications'}
                    >
                      {'Notifications'}
                    </span>
                  </button>
                </div>
              </div>

              {/* Account Section */}
              <div
                className={`transition-all duration-700 ease-out delay-300 ${
                  isMobileMenuOpen
                    ? 'opacity-100 translate-x-0'
                    : 'opacity-0 translate-x-full'
                }`}
              >
                <div className="flex flex-col items-center space-y-4">
                  {isAuthLoading ? (
                    <div className="w-32 h-10 bg-white/20 rounded-full animate-pulse"></div>
                  ) : user ? (
                    <div className="flex flex-col items-center space-y-3">
                      <div className="flex items-center text-white max-w-xs">
                        <span
                          className="text-white font-medium truncate"
                          title={user.name}
                        >
                          {user.name}
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          logout();
                          closeMobileMenu();
                        }}
                        className="px-6 py-2 rounded-full bg-purple-600 hover:bg-purple-700 text-white font-medium transition-all duration-300 text-base"
                      >
                        {'Logout'}
                      </button>
                    </div>
                  ) : (
                    <Link
                      href="/auth"
                      className="px-6 py-2 rounded-full bg-purple-600 hover:bg-purple-700 text-white font-medium transition-all duration-300 text-base"
                      onClick={closeMobileMenu}
                    >
                      {'Login/Register'}
                    </Link>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Spacer to prevent content from being hidden behind fixed header */}
      <div className="h-header"></div>
    </>
  );
});

Header.displayName = 'Header';

export default Header;
