"use client";

import React, { useState, useEffect } from 'react';
import {
    HiBell,
    HiOutlineShoppingCart,
    HiHeart,
    HiBars3,
    HiXMark
} from 'react-icons/hi2';
import { useAuth } from '../../contexts/AuthContext';
import { useLanguage } from '../../contexts/LanguageContext';
import UserDropdown from './UserDropdown';
import ThemeToggle from '../ThemeToggle';
import LanguageToggle from './LanguageToggle';

const Header = () => {
    const { user, logout } = useAuth();
    const { locale, setLocale, t } = useLanguage();
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const [isAnimating, setIsAnimating] = useState(false);

    const toggleLanguage = () => {
        const newLocale = locale === 'en' ? 'ar' : 'en';
        setLocale(newLocale);
    };

    const toggleMobileMenu = () => {
        if (!isAnimating) {
            setIsMobileMenuOpen(!isMobileMenuOpen);
        }
    };

    const closeMobileMenu = () => {
        if (!isAnimating) {
            setIsAnimating(true);
            setIsMobileMenuOpen(false);
            // Reset animation state after animation completes
            setTimeout(() => setIsAnimating(false), 300);
        }
    };

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
    }, [isMobileMenuOpen]);

    return (
        <>
            <header className="h-header z-40 w-full bg-white dark:bg-dark-surface shadow-sm dark:shadow-gray-900/20 transition-colors duration-200">
                <div className="flex justify-between px-4 sm:px-6 lg:px-14 h-header items-center">
                    {/* Logo */}
                    <div className="flex justify-start">
                        <h2 className="text-xl sm:text-2xl lg:text-3xl font-bold">
                            <a href="/" className="hover:text-purple-500 transition-colors">$AFAWI NETT</a>
                        </h2>
                    </div>

                    {/* Main Navigation */}
                    <nav className={`hidden lg:flex items-center ${locale === 'ar' ? 'flex-row-reverse space-x-reverse' : ''} space-x-8`}>
                        <a href="/" className="text-gray-700 dark:text-gray-300 hover:text-purple-500 transition-colors font-medium text-lg">
                            {t('header.navigation.home')}
                        </a>
                        <a href="/products" className="text-gray-700 dark:text-gray-300 hover:text-purple-500 transition-colors font-medium text-lg">
                            {t('header.navigation.products')}
                        </a>
                        <a href="/deals" className="text-gray-700 dark:text-gray-300 hover:text-purple-500 transition-colors font-medium text-lg">
                            {t('header.navigation.deals')}
                        </a>
                        <a href="/about" className="text-gray-700 dark:text-gray-300 hover:text-purple-500 transition-colors font-medium text-lg">
                            {t('header.navigation.about')}
                        </a>
                    </nav>

                    {/* Desktop Navigation & Mobile Menu Button */}
                    <div className="flex justify-end items-center space-x-2 sm:space-x-4 lg:space-x-6">
                        {/* Desktop Navigation */}
                        <nav className="hidden lg:flex items-center space-x-6">
                            <button
                                className="hover:text-purple-500 transition-colors"
                                aria-label={t('header.actions.notifications')}
                            >
                                {HiBell({ className: "w-6 h-6" })}
                            </button>
                            <a href="/wishlist" className="hover:text-purple-500 transition-colors" aria-label={t('header.actions.wishlist')}>
                                {HiHeart({ className: "w-6 h-6" })}
                            </a>
                            <a href="/cart" className="hover:text-purple-500 transition-colors" aria-label={t('header.actions.cart')}>
                                {HiOutlineShoppingCart({ className: "w-6 h-6" })}
                            </a>

                            {/* Theme Toggle Button */}
                            <ThemeToggle />

                            {/* Language Toggle Button - Always Visible */}
                            <LanguageToggle />

                            {/* Login/Register or User Dropdown - Now inside the nav with proper spacing */}
                            {user ? (
                                <UserDropdown user={user} />
                            ) : (
                                <a href="/auth" className="hover:text-purple-500 transition-colors text-base">
                                    {t('header.auth.loginRegister')}
                                </a>
                            )}
                        </nav>

                        {/* Mobile Auth Section - Show Login/Register or User Dropdown next to menu button */}
                        <div className="lg:hidden flex items-center space-x-2">
                            {user ? (
                                <UserDropdown user={user} />
                            ) : (
                                <a href="/auth" className="hover:text-purple-500 transition-colors text-sm font-medium px-3 py-1 rounded-md hover:bg-gray-100 dark:hover:bg-gray-800 transition-all duration-200">
                                    {t('header.auth.loginRegister')}
                                </a>
                            )}
                        </div>

                        {/* Mobile Menu Button */}
                        <button
                            onClick={toggleMobileMenu}
                            className="lg:hidden p-2 hover:text-purple-500 transition-colors"
                            aria-label="Toggle mobile menu"
                        >
                            <div className="relative w-8 h-8">
                                {/* Hamburger Icon */}
                                <div className={`absolute inset-0 transition-all duration-300 ease-in-out ${isMobileMenuOpen
                                    ? 'opacity-0 rotate-90 scale-75'
                                    : 'opacity-100 rotate-0 scale-100'
                                    }`}>
                                    {HiBars3({ className: "w-8 h-8" })}
                                </div>

                                {/* X Icon */}
                                <div className={`absolute inset-0 transition-all duration-300 ease-in-out ${isMobileMenuOpen
                                    ? 'opacity-100 rotate-0 scale-100'
                                    : 'opacity-0 -rotate-90 scale-75'
                                    }`}>
                                    {HiXMark({ className: "w-8 h-8" })}
                                </div>
                            </div>
                        </button>
                    </div>
                </div>

                {/* Mobile Menu Overlay */}
                <div
                    className={`fixed inset-0 bg-black z-50 lg:hidden transition-all duration-300 ease-in-out ${isMobileMenuOpen
                        ? 'opacity-100 visible'
                        : 'opacity-0 invisible'
                        }`}
                >
                    {/* Close Button */}
                    <button
                        onClick={closeMobileMenu}
                        className={`absolute top-6 text-white hover:text-purple-500 transition-all duration-300 z-10 right-6 ${isMobileMenuOpen
                            ? 'opacity-100 translate-x-0'
                            : 'opacity-0 translate-x-4'
                            }`}
                        aria-label="Close mobile menu"
                    >
                        {HiXMark({ className: "w-8 h-8" })}
                    </button>

                    {/* Full Screen Menu Content */}
                    <div className={`flex flex-col h-full text-white px-6 transition-all duration-500 ease-out overflow-y-auto scrollbar-thin scrollbar-track-transparent scrollbar-thumb-white/20 hover:scrollbar-thumb-white/40 ${isMobileMenuOpen
                        ? 'opacity-100 translate-x-0'
                        : 'opacity-0 translate-x-full'
                        }`}>

                        {/* Top Section - Logo & Image */}
                        <div className="flex flex-col items-center pt-16 sm:pt-20">
                            <div className="flex flex-col-reverse sm:flex-col items-center">
                                <h2 className={`text-center text-2xl sm:text-3xl md:text-4xl lg:text-5xl xl:text-6xl z-20 transition-all duration-700 ease-out delay-200 ${isMobileMenuOpen
                                    ? 'opacity-100 translate-x-0'
                                    : 'opacity-0 translate-x-full'
                                    }`}>
                                    $AFAWI NETT
                                </h2>
                            </div>
                        </div>

                        {/* Bottom Section - Navigation & Actions */}
                        <div className="flex-1 flex flex-col justify-center pb-8">
                            {/* Main Navigation Section */}
                            <div className={`mb-8 transition-all duration-700 ease-out delay-300 ${isMobileMenuOpen
                                ? 'opacity-100 translate-x-0'
                                : 'opacity-0 translate-x-full'
                                }`}>
                                <h3 className="text-white/60 text-base font-medium uppercase tracking-wider mb-4 text-center">
                                    {t('header.mobile.navigation')}
                                </h3>
                                <div className={`grid grid-cols-2 gap-4 max-w-xs mx-auto w-full place-items-center ${locale === 'ar' ? 'rtl [&>*:nth-child(1)]:order-2 [&>*:nth-child(2)]:order-1 [&>*:nth-child(3)]:order-4 [&>*:nth-child(4)]:order-3' : ''}`}>
                                    <a
                                        href="/"
                                        className="text-center py-3 px-4 rounded-lg bg-white/10 hover:bg-white/20 transition-all duration-300 text-white hover:text-purple-400 w-full h-full min-h-[48px] flex items-center justify-center text-base"
                                        onClick={closeMobileMenu}
                                    >
                                        {t('header.navigation.home')}
                                    </a>
                                    <a
                                        href="/products"
                                        className="text-center py-3 px-4 rounded-lg bg-white/10 hover:bg-white/20 transition-all duration-300 text-white hover:text-purple-400 w-full h-full min-h-[48px] flex items-center justify-center text-base"
                                        onClick={closeMobileMenu}
                                    >
                                        {t('header.navigation.products')}
                                    </a>
                                    <a
                                        href="/deals"
                                        className="text-center py-3 px-4 rounded-lg bg-white/10 hover:bg-white/20 transition-all duration-300 text-white hover:text-purple-400 w-full h-full min-h-[48px] flex items-center justify-center text-base"
                                        onClick={closeMobileMenu}
                                    >
                                        {t('header.navigation.deals')}
                                    </a>
                                    <a
                                        href="/about"
                                        className="text-center py-3 px-4 rounded-lg bg-white/10 hover:bg-white/20 transition-all duration-300 text-white hover:text-purple-400 w-full h-full min-h-[48px] flex items-center justify-center text-base"
                                        onClick={closeMobileMenu}
                                    >
                                        {t('header.navigation.about')}
                                    </a>
                                </div>
                            </div>

                            {/* Quick Actions Section */}
                            <div className={`mb-8 transition-all duration-700 ease-out delay-300 ${isMobileMenuOpen
                                ? 'opacity-100 translate-x-0'
                                : 'opacity-0 translate-x-full'
                                }`}>
                                <h3 className="text-white/60 text-base font-medium uppercase tracking-wider mb-4 text-center">
                                    {t('header.mobile.quickActions')}
                                </h3>
                                <div className="flex justify-center space-x-6">
                                    <a
                                        href="/wishlist"
                                        className="flex flex-col items-center space-y-2 p-3 rounded-lg bg-white/10 hover:bg-white/20 transition-all duration-300 group"
                                        onClick={closeMobileMenu}
                                    >
                                        <div className="text-white group-hover:text-purple-400 transition-colors">
                                            {HiHeart({ className: "w-7 h-7" })}
                                        </div>
                                        <span className="text-sm text-white/80 group-hover:text-white">{t('header.actions.wishlist')}</span>
                                    </a>
                                    <a
                                        href="/cart"
                                        className="flex flex-col items-center space-y-2 p-3 rounded-lg bg-white/10 hover:bg-white/20 transition-all duration-300 group"
                                        onClick={closeMobileMenu}
                                    >
                                        <div className="text-white group-hover:text-purple-400 transition-colors">
                                            {HiOutlineShoppingCart({ className: "w-7 h-7" })}
                                        </div>
                                        <span className="text-sm text-white/80 group-hover:text-white">{t('header.actions.cart')}</span>
                                    </a>
                                    <button
                                        className="flex flex-col items-center space-y-2 p-3 rounded-lg bg-white/10 hover:bg-white/20 transition-all duration-300 group"
                                    >
                                        <div className="text-white group-hover:text-purple-400 transition-colors">
                                            {HiBell({ className: "w-7 h-7" })}
                                        </div>
                                        <span className="text-sm text-white/80 group-hover:text-white">{t('header.actions.alerts')}</span>
                                    </button>
                                </div>
                            </div>

                            {/* Account Section */}
                            <div className={`transition-all duration-700 ease-out delay-300 ${isMobileMenuOpen
                                ? 'opacity-100 translate-x-0'
                                : 'opacity-0 translate-x-full'
                                }`}>
                                <div className="flex flex-col items-center space-y-4">
                                    {user ? (
                                        <div className="flex flex-col items-center space-y-3">
                                            <div className="flex items-center text-white">
                                                <span className="text-white font-medium">{user.name}</span>
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
                                        <a
                                            href="/auth"
                                            className="px-6 py-2 rounded-full bg-purple-600 hover:bg-purple-700 text-white font-medium transition-all duration-300 text-base"
                                            onClick={closeMobileMenu}
                                        >
                                            {t('header.auth.loginRegister')}
                                        </a>
                                    )}

                                    {/* Language & Theme Section */}
                                    <div className="flex flex-col items-center space-y-3">
                                        <h4 className="text-white/60 text-sm font-medium uppercase tracking-wider">
                                            {t('header.mobile.languageTheme')}
                                        </h4>
                                        <div className="flex space-x-3">
                                            <button
                                                onClick={toggleLanguage}
                                                className="px-4 py-2 rounded-full border border-white/30 hover:border-white/50 text-white font-medium transition-all duration-300 text-base"
                                            >
                                                {locale === 'en' ? 'العربية' : 'English'}
                                            </button>
                                            {/* Theme Toggle for Mobile */}
                                            <div className="px-4 py-2 rounded-full border border-white/30 hover:border-white/50 transition-all duration-300">
                                                <ThemeToggle variant="mobile" />
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </header>
        </>
    );
};

export default Header;
