"use client";

import {
    HiBell,
    HiOutlineShoppingCart,
    HiHeart,
    HiBars3,
    HiXMark,
    HiMagnifyingGlass
} from 'react-icons/hi2';
import { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import UserDropdown from './UserDropdown';
import ThemeToggle from '../ThemeToggle';

const Header = () => {
    const { user, logout } = useAuth();

    const [currentLanguage, setCurrentLanguage] = useState('EN');
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const [isAnimating, setIsAnimating] = useState(false);
    const [isSearchOpen, setIsSearchOpen] = useState(false);
    const [isSearchAnimating, setIsSearchAnimating] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');

    const toggleLanguage = () => {
        setCurrentLanguage(currentLanguage === 'EN' ? 'AR' : 'EN');
        // Here you can add logic to change the application language
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

    const toggleSearch = () => {
        if (isSearchOpen) {
            // Start closing animation
            setIsSearchAnimating(true);
            setTimeout(() => {
                setIsSearchOpen(false);
                setIsSearchAnimating(false);
                setSearchQuery('');
            }, 300);
        } else {
            // Open search immediately
            setIsSearchOpen(true);
        }
    };

    const handleSearchSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (searchQuery.trim()) {
            // Handle search logic here
            console.log('Searching for:', searchQuery);
            // You can add your search implementation here
        }
    };

    const handleSearchBlur = () => {
        if (!searchQuery.trim()) {
            // Start closing animation
            setIsSearchAnimating(true);
            setTimeout(() => {
                setIsSearchOpen(false);
                setIsSearchAnimating(false);
                setSearchQuery('');
            }, 300);
        }
    };

    // Close menu on escape key
    useEffect(() => {
        const handleEscape = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                if (isMobileMenuOpen) {
                    closeMobileMenu();
                }
                if (isSearchOpen) {
                    // Start closing animation
                    setIsSearchAnimating(true);
                    setTimeout(() => {
                        setIsSearchOpen(false);
                        setIsSearchAnimating(false);
                        setSearchQuery('');
                    }, 300);
                }
            }
        };

        if (isMobileMenuOpen || isSearchOpen) {
            document.addEventListener('keydown', handleEscape);
            // Prevent body scroll when menu is open
            if (isMobileMenuOpen) {
                document.body.style.overflow = 'hidden';
            }
        } else {
            document.removeEventListener('keydown', handleEscape);
            document.body.style.overflow = 'unset';
        }

        return () => {
            document.removeEventListener('keydown', handleEscape);
            document.body.style.overflow = 'unset';
        };
    }, [isMobileMenuOpen, isSearchOpen]);

    return (
        <>
            <header className="h-header z-40 w-full bg-white dark:bg-dark-surface shadow-sm dark:shadow-gray-900/20 transition-colors duration-200">
                <div className="flex justify-between px-4 sm:px-6 lg:px-14 h-header items-center">
                    {/* Left - Logo */}
                    <div className="flex justify-start">
                        <h2 className="text-xl sm:text-2xl lg:text-3xl font-bold">
                            <a href="/" className="hover:text-purple-500 transition-colors">$AFAWI NETT</a>
                        </h2>
                    </div>

                    {/* Center - Main Navigation */}
                    <nav className="hidden lg:flex items-center space-x-8">
                        <a href="/" className="text-gray-700 dark:text-gray-300 hover:text-purple-500 transition-colors font-medium text-lg">
                            Home
                        </a>
                        <a href="/products" className="text-gray-700 dark:text-gray-300 hover:text-purple-500 transition-colors font-medium text-lg">
                            All Products
                        </a>
                        <a href="/deals" className="text-gray-700 dark:text-gray-300 hover:text-purple-500 transition-colors font-medium text-lg">
                            Deals & Offers
                        </a>
                        <a href="/about" className="text-gray-700 dark:text-gray-300 hover:text-purple-500 transition-colors font-medium text-lg">
                            About
                        </a>
                    </nav>

                    {/* Right - Desktop Navigation & Mobile Menu Button */}
                    <div className="flex justify-end items-center space-x-2 sm:space-x-4 lg:space-x-6">
                        {/* Desktop Navigation */}
                        <nav className="hidden lg:flex items-center space-x-6">
                            {/* Search Icon/Input */}
                            <div className="relative flex items-center overflow-hidden">
                                {!isSearchOpen ? (
                                    <button
                                        onClick={toggleSearch}
                                        className="hover:text-purple-500 transition-colors flex items-center"
                                        aria-label="Search"
                                    >
                                        {HiMagnifyingGlass({ className: "w-6 h-6" })}
                                    </button>
                                ) : (
                                    <form
                                        onSubmit={handleSearchSubmit}
                                        className={`relative ${isSearchAnimating ? 'animate-slideOut' : 'animate-slideIn'}`}
                                    >
                                        <input
                                            type="text"
                                            value={searchQuery}
                                            onChange={(e) => setSearchQuery(e.target.value)}
                                            onBlur={handleSearchBlur}
                                            placeholder="Search..."
                                            className="w-64 px-4 py-2 text-base border-b-2 border-purple-500 focus:border-purple-600 transition-all duration-300 ease-in-out bg-transparent text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400"
                                            autoFocus
                                        />
                                        <button
                                            type="submit"
                                            className="absolute right-2 top-1/2 transform -translate-y-1/2 text-purple-500 hover:text-purple-600 transition-colors"
                                            aria-label="Submit search"
                                        >
                                            {HiMagnifyingGlass({ className: "w-5 h-5" })}
                                        </button>
                                    </form>
                                )}
                            </div>

                            <button
                                className="hover:text-purple-500 transition-colors"
                                aria-label="Notifications"
                            >
                                {HiBell({ className: "w-6 h-6" })}
                            </button>
                            <a href="/wishlist" className="hover:text-purple-500 transition-colors" aria-label="Wishlist">
                                {HiHeart({ className: "w-6 h-6" })}
                            </a>
                            <a href="/cart" className="hover:text-purple-500 transition-colors" aria-label="Cart">
                                {HiOutlineShoppingCart({ className: "w-6 h-6" })}
                            </a>
                        </nav>

                        {/* Language Toggle Button - Always Visible */}
                        <button
                            onClick={toggleLanguage}
                            className="flex items-center space-x-1 hover:text-purple-500 transition-colors"
                            aria-label="Toggle language"
                        >
                            <span className="text-base font-medium">{currentLanguage}</span>
                        </button>

                        {/* Theme Toggle Button */}
                        <ThemeToggle />

                        {/* Login/Register or User Dropdown */}
                        {user ? (
                            <UserDropdown user={user} />
                        ) : (
                            <a href="/auth" className="hover:text-purple-500 transition-colors text-base">
                                Login/Register
                            </a>
                        )}

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
                        className={`absolute top-6 right-6 text-white hover:text-purple-500 transition-all duration-300 z-10 ${isMobileMenuOpen
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
                            {/* Mobile Search Input */}
                            <div className={`mb-8 transition-all duration-700 ease-out delay-300 ${isMobileMenuOpen
                                ? 'opacity-100 translate-x-0'
                                : 'opacity-0 translate-x-full'
                                }`}>
                                <form onSubmit={handleSearchSubmit} className="w-full max-w-sm mx-auto">
                                    <div className="relative">
                                        <input
                                            type="text"
                                            value={searchQuery}
                                            onChange={(e) => setSearchQuery(e.target.value)}
                                            placeholder="Search..."
                                            className="w-full px-4 py-3 text-base bg-transparent border-b-2 border-white/30 focus:border-purple-400 transition-all duration-300 text-white placeholder-white/70"
                                        />
                                        <button
                                            type="submit"
                                            className="absolute right-3 top-1/2 transform -translate-y-1/2 text-white/70 hover:text-white transition-colors"
                                            aria-label="Submit search"
                                        >
                                            {HiMagnifyingGlass({ className: "w-6 h-6" })}
                                        </button>
                                    </div>
                                </form>
                            </div>

                            {/* Main Navigation Section */}
                            <div className={`mb-8 transition-all duration-700 ease-out delay-300 ${isMobileMenuOpen
                                ? 'opacity-100 translate-x-0'
                                : 'opacity-0 translate-x-full'
                                }`}>
                                <h3 className="text-white/60 text-base font-medium uppercase tracking-wider mb-4 text-center">
                                    Navigation
                                </h3>
                                <div className="grid grid-cols-2 gap-4 max-w-xs mx-auto w-full place-items-center">
                                    <a
                                        href="/"
                                        className="text-center py-3 px-4 rounded-lg bg-white/10 hover:bg-white/20 transition-all duration-300 text-white hover:text-purple-400 w-full h-full min-h-[48px] flex items-center justify-center text-base"
                                        onClick={closeMobileMenu}
                                    >
                                        Home
                                    </a>
                                    <a
                                        href="/products"
                                        className="text-center py-3 px-4 rounded-lg bg-white/10 hover:bg-white/20 transition-all duration-300 text-white hover:text-purple-400 w-full h-full min-h-[48px] flex items-center justify-center text-base"
                                        onClick={closeMobileMenu}
                                    >
                                        All Products
                                    </a>
                                    <a
                                        href="/deals"
                                        className="text-center py-3 px-4 rounded-lg bg-white/10 hover:bg-white/20 transition-all duration-300 text-white hover:text-purple-400 w-full h-full min-h-[48px] flex items-center justify-center text-base"
                                        onClick={closeMobileMenu}
                                    >
                                        Deals & Offers
                                    </a>
                                    <a
                                        href="/about"
                                        className="text-center py-3 px-4 rounded-lg bg-white/10 hover:bg-white/20 transition-all duration-300 text-white hover:text-purple-400 w-full h-full min-h-[48px] flex items-center justify-center text-base"
                                        onClick={closeMobileMenu}
                                    >
                                        About
                                    </a>
                                </div>
                            </div>

                            {/* Quick Actions Section */}
                            <div className={`mb-8 transition-all duration-700 ease-out delay-300 ${isMobileMenuOpen
                                ? 'opacity-100 translate-x-0'
                                : 'opacity-0 translate-x-full'
                                }`}>
                                <h3 className="text-white/60 text-base font-medium uppercase tracking-wider mb-4 text-center">
                                    Quick Actions
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
                                        <span className="text-sm text-white/80 group-hover:text-white">Wishlist</span>
                                    </a>
                                    <a
                                        href="/cart"
                                        className="flex flex-col items-center space-y-2 p-3 rounded-lg bg-white/10 hover:bg-white/20 transition-all duration-300 group"
                                        onClick={closeMobileMenu}
                                    >
                                        <div className="text-white group-hover:text-purple-400 transition-colors">
                                            {HiOutlineShoppingCart({ className: "w-7 h-7" })}
                                        </div>
                                        <span className="text-sm text-white/80 group-hover:text-white">Cart</span>
                                    </a>
                                    <button
                                        className="flex flex-col items-center space-y-2 p-3 rounded-lg bg-white/10 hover:bg-white/20 transition-all duration-300 group"
                                    >
                                        <div className="text-white group-hover:text-purple-400 transition-colors">
                                            {HiBell({ className: "w-7 h-7" })}
                                        </div>
                                        <span className="text-sm text-white/80 group-hover:text-white">Alerts</span>
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
                                            <div className="flex items-center space-x-2 text-white">
                                                <span className="text-white font-medium">{user.name}</span>
                                            </div>
                                            <button
                                                onClick={() => {
                                                    logout();
                                                    closeMobileMenu();
                                                }}
                                                className="px-6 py-2 rounded-full bg-purple-600 hover:bg-purple-700 text-white font-medium transition-all duration-300 text-base"
                                            >
                                                Logout
                                            </button>
                                        </div>
                                    ) : (
                                        <a
                                            href="/auth"
                                            className="px-6 py-2 rounded-full bg-purple-600 hover:bg-purple-700 text-white font-medium transition-all duration-300 text-base"
                                            onClick={closeMobileMenu}
                                        >
                                            Login/Register
                                        </a>
                                    )}
                                    
                                    {/* Language & Theme Section */}
                                    <div className="flex flex-col items-center space-y-3">
                                        <h4 className="text-white/60 text-sm font-medium uppercase tracking-wider">
                                            Language & Theme
                                        </h4>
                                        <div className="flex space-x-3">
                                    <button
                                        onClick={toggleLanguage}
                                        className="px-4 py-2 rounded-full border border-white/30 hover:border-white/50 text-white font-medium transition-all duration-300 text-base"
                                    >
                                        {currentLanguage}
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
