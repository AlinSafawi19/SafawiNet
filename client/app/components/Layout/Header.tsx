'use client';

import React, { useState, useEffect, useCallback } from 'react';
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
  HiChatBubbleLeftRight,
} from 'react-icons/hi2';
import { useAuth } from '../../contexts/AuthContext';
import { useLanguage } from '../../contexts/LanguageContext';
import UserDropdown from './UserDropdown';
import ThemeToggle from '../ThemeToggle';
import LanguageToggle from './LanguageToggle';

const Header = () => {
  const { user, logout } = useAuth();
  const { locale, t } = useLanguage();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);

  // Admin navigation items
  const adminNavigationItems = [
    {
      name: 'Dashboard',
      href: '/admin',
      icon: HiHome,
      label: 'admin.sidebar.dashboard',
    },
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
    {
      name: 'Customer Support',
      href: '/admin/support',
      icon: HiChatBubbleLeftRight,
      label: 'admin.sidebar.support',
    },
  ] as const;

  const toggleMobileMenu = () => {
    if (!isAnimating) {
      setIsMobileMenuOpen(!isMobileMenuOpen);
    }
  };

  const closeMobileMenu = useCallback(() => {
    if (!isAnimating) {
      setIsAnimating(true);
      setIsMobileMenuOpen(false);
      // Reset animation state after animation completes
      setTimeout(() => setIsAnimating(false), 300);
    }
  }, [isAnimating]);

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

  // Scroll detection
  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY > 0) {
        setIsScrolled(true);
      } else {
        setIsScrolled(false);
      }
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Check if user is admin
  const isAdmin = user && user.roles && user.roles.includes('ADMIN');

  return (
    <>
      <header
        className={`fixed top-0 left-0 right-0 h-header z-40 w-full bg-white dark:bg-dark-surface shadow-sm dark:shadow-gray-900/20 transition-all duration-300 ease-in-out ${
          isScrolled
            ? 'shadow-lg dark:shadow-gray-900/40 bg-white/95 dark:bg-dark-surface/95 backdrop-blur-sm'
            : 'shadow-sm dark:shadow-gray-900/20'
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
            <nav
              className={`hidden lg-tablet:flex items-center ${
                locale === 'ar' ? 'flex-row-reverse space-x-reverse' : ''
              } space-x-8`}
            >
              <Link
                href="/"
                className="text-gray-700 dark:text-gray-300 hover:text-purple-500 transition-colors font-medium text-lg"
              >
                {t('header.navigation.home')}
              </Link>
              <Link
                href="/products"
                className="text-gray-700 dark:text-gray-300 hover:text-purple-500 transition-colors font-medium text-lg"
              >
                {t('header.navigation.products')}
              </Link>
              <Link
                href="/deals"
                className="text-gray-700 dark:text-gray-300 hover:text-purple-500 transition-colors font-medium text-lg"
              >
                {t('header.navigation.deals')}
              </Link>
              <Link
                href="/about"
                className="text-gray-700 dark:text-gray-300 hover:text-purple-500 transition-colors font-medium text-lg"
              >
                {t('header.navigation.about')}
              </Link>
            </nav>
          )}

          {/* Desktop Navigation & Mobile Menu Button */}
          <div className="flex justify-end items-center space-x-2 sm:space-x-4 md-tablet:space-x-3 lg-tablet:space-x-6">
            {/* Desktop Navigation */}
            <nav className="hidden lg-tablet:flex items-center space-x-4 xl:space-x-6">
              <button
                className="hover:text-purple-500 transition-colors"
                aria-label={t('header.actions.notifications')}
              >
                {HiBell({ className: 'w-6 h-6' })}
              </button>
              {/* Wishlist - Hidden for admin users */}
              {!isAdmin && (
                <Link
                  href="/wishlist"
                  className="hover:text-purple-500 transition-colors"
                  aria-label={t('header.actions.wishlist')}
                >
                  {HiHeart({ className: 'w-6 h-6' })}
                </Link>
              )}
              {/* Cart - Hidden for admin users */}
              {!isAdmin && (
                <Link
                  href="/cart"
                  className="hover:text-purple-500 transition-colors"
                  aria-label={t('header.actions.cart')}
                >
                  {HiOutlineShoppingCart({ className: 'w-6 h-6' })}
                </Link>
              )}

              {/* Theme Toggle Button */}
              <ThemeToggle />

              {/* Language Toggle Button - Always Visible */}
              <LanguageToggle />

              {/* Login/Register or User Dropdown - Now inside the nav with proper spacing */}
              {user ? (
                <UserDropdown user={user} />
              ) : (
                <Link
                  href="/auth"
                  className="hover:text-purple-500 transition-colors text-base"
                >
                  {t('header.auth.loginRegister')}
                </Link>
              )}
            </nav>

            {/* Mobile Auth Section - Show Login/Register or User Dropdown next to menu button */}
            <div className="lg-tablet:hidden flex items-center space-x-2">
              {user ? (
                <UserDropdown user={user} />
              ) : (
                <Link
                  href="/auth"
                  className="hover:text-purple-500 transition-colors text-sm font-medium px-3 py-1 rounded-md transition-all duration-200"
                >
                  {t('header.auth.loginRegister')}
                </Link>
              )}
            </div>

            {/* Mobile Menu Button */}
            <button
              onClick={toggleMobileMenu}
              className="lg-tablet:hidden p-2 hover:text-purple-500 transition-colors"
              aria-label="Toggle mobile menu"
            >
              <div className="relative w-8 h-8">
                {/* Hamburger Icon */}
                <div
                  className={`absolute inset-0 transition-all duration-300 ease-in-out ${
                    isMobileMenuOpen
                      ? 'opacity-0 rotate-90 scale-75'
                      : 'opacity-100 rotate-0 scale-100'
                  }`}
                >
                  {HiBars3({ className: 'w-8 h-8' })}
                </div>

                {/* X Icon */}
                <div
                  className={`absolute inset-0 transition-all duration-300 ease-in-out ${
                    isMobileMenuOpen
                      ? 'opacity-100 rotate-0 scale-100'
                      : 'opacity-0 -rotate-90 scale-75'
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
            className={`absolute top-6 text-white hover:text-purple-500 transition-all duration-300 z-[10000] right-6 ${
              isMobileMenuOpen
                ? 'opacity-100 translate-x-0'
                : 'opacity-0 translate-x-4'
            }`}
            aria-label="Close mobile menu"
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
                  {t('header.mobile.navigation')}
                </h3>
                {isAdmin ? (
                  // Admin Navigation - Same grid layout as regular navigation
                  <div
                    className={`grid grid-cols-2 gap-4 max-w-xs mx-auto w-full place-items-center ${
                      locale === 'ar'
                        ? 'rtl [&>*:nth-child(1)]:order-2 [&>*:nth-child(2)]:order-1 [&>*:nth-child(3)]:order-4 [&>*:nth-child(4)]:order-3 [&>*:nth-child(5)]:order-6 [&>*:nth-child(6)]:order-5'
                        : ''
                    }`}
                  >
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
                          <span className="text-xs font-medium text-center leading-tight">
                            {t(item.label) || item.name}
                          </span>
                        </Link>
                      );
                    })}
                  </div>
                ) : (
                  // Regular User Navigation - Grid layout
                  <div
                    className={`grid grid-cols-2 gap-4 max-w-xs mx-auto w-full place-items-center ${
                      locale === 'ar'
                        ? 'rtl [&>*:nth-child(1)]:order-2 [&>*:nth-child(2)]:order-1 [&>*:nth-child(3)]:order-4 [&>*:nth-child(4)]:order-3'
                        : ''
                    }`}
                  >
                    <Link
                      href="/"
                      className="text-center py-3 px-4 rounded-lg bg-white/10 hover:bg-white/20 transition-all duration-300 text-white hover:text-purple-400 w-full h-full min-h-[48px] flex items-center justify-center text-base"
                      onClick={closeMobileMenu}
                    >
                      {t('header.navigation.home')}
                    </Link>
                    <Link
                      href="/products"
                      className="text-center py-3 px-4 rounded-lg bg-white/10 hover:bg-white/20 transition-all duration-300 text-white hover:text-purple-400 w-full h-full min-h-[48px] flex items-center justify-center text-base"
                      onClick={closeMobileMenu}
                    >
                      {t('header.navigation.products')}
                    </Link>
                    <Link
                      href="/deals"
                      className="text-center py-3 px-4 rounded-lg bg-white/10 hover:bg-white/20 transition-all duration-300 text-white hover:text-purple-400 w-full h-full min-h-[48px] flex items-center justify-center text-base"
                      onClick={closeMobileMenu}
                    >
                      {t('header.navigation.deals')}
                    </Link>
                    <Link
                      href="/about"
                      className="text-center py-3 px-4 rounded-lg bg-white/10 hover:bg-white/20 transition-all duration-300 text-white hover:text-purple-400 w-full h-full min-h-[48px] flex items-center justify-center text-base"
                      onClick={closeMobileMenu}
                    >
                      {t('header.navigation.about')}
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
                  {t('header.mobile.quickActions')}
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
                      <span className="text-sm text-white/80 group-hover:text-white">
                        {t('header.actions.wishlist')}
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
                      <span className="text-sm text-white/80 group-hover:text-white">
                        {t('header.actions.cart')}
                      </span>
                    </Link>
                  )}
                  <button className="flex flex-col items-center space-y-2 p-3 rounded-lg bg-white/10 hover:bg-white/20 transition-all duration-300 group">
                    <div className="text-white group-hover:text-purple-400 transition-colors">
                      {HiBell({ className: 'w-7 h-7' })}
                    </div>
                    <span className="text-sm text-white/80 group-hover:text-white">
                      {t('header.actions.alerts')}
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
                  {user ? (
                    <div className="flex flex-col items-center space-y-3">
                      <div className="flex items-center text-white">
                        <span className="text-white font-medium">
                          {user.name}
                        </span>
                      </div>
                      <button
                        onClick={() => {
                          logout();
                          closeMobileMenu();
                        }}
                        className="px-6 py-2 rounded-full bg-purple-600 hover:bg-purple-700 text-white font-medium transition-all duration-300 text-base"
                      >
                        {t('header.auth.logout')}
                      </button>
                    </div>
                  ) : (
                    <Link
                      href="/auth"
                      className="px-6 py-2 rounded-full bg-purple-600 hover:bg-purple-700 text-white font-medium transition-all duration-300 text-base"
                      onClick={closeMobileMenu}
                    >
                      {t('header.auth.loginRegister')}
                    </Link>
                  )}

                  {/* Language & Theme Section */}
                  <div className="flex flex-col items-center space-y-3">
                    <h4 className="text-white/60 text-sm font-medium uppercase tracking-wider">
                      {t('header.mobile.languageTheme')}
                    </h4>
                    <div className="flex space-x-3">
                      <LanguageToggle variant="mobile" />

                      {/* Theme Toggle for Mobile */}
                      <ThemeToggle variant="mobile" />
                    </div>
                  </div>
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
};

export default Header;
