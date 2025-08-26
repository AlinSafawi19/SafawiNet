import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import Select from 'react-select';
import {
  HiMapPin as HiLocationMarker,
  HiShoppingBag,
  HiUser,
  HiBars3 as HiMenu,
  HiChevronDown,
  HiMagnifyingGlass as HiSearch,
  HiHeart,
  HiOutlineShoppingCart,
  HiTruck,
  HiXMark as HiX,
  HiArrowRightOnRectangle as HiLogout,
  HiSun,
  HiMoon,
  HiComputerDesktop
} from 'react-icons/hi2';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';

// Custom AnimatedLink component with hover line animation
interface AnimatedLinkProps {
  to: string;
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
}

const AnimatedLink: React.FC<AnimatedLinkProps> = ({ to, children, className = '', onClick }) => {
  return (
    <Link
      to={to}
      className={`relative group ${className}`}
      onClick={onClick}
    >
      {children}
      <span className="absolute bottom-0 left-0 w-0 h-0.5 bg-red-500 transition-all duration-300 ease-out group-hover:w-full"></span>
    </Link>
  );
};

// Custom AnimatedButton component for non-link elements
interface AnimatedButtonProps {
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
  type?: 'button' | 'submit';
  title?: string;
  id?: string;
  'aria-label'?: string;
}

const AnimatedButton: React.FC<AnimatedButtonProps> = ({ children, className = '', onClick, type = 'button' }) => {
  return (
    <button
      type={type}
      className={`relative group ${className}`}
      onClick={onClick}
    >
      {children}
      <span className="absolute bottom-0 left-0 w-0 h-0.5 bg-red-500 transition-all duration-300 ease-out group-hover:w-full"></span>
    </button>
  );
};

const Header: React.FC = () => {
  const { user, isAuthenticated, logout } = useAuth();
  const { theme, toggleTheme, setTheme } = useTheme();

  // Categories for search
  const categories = [
    { value: 'all', label: 'All Categories' },
    { value: 'electronics', label: 'Electronics' },
    { value: 'computers', label: 'Computers & Laptops' },
    { value: 'phones', label: 'Phones & Tablets' },
    { value: 'accessories', label: 'Accessories' },
    { value: 'gaming', label: 'Gaming' },
    { value: 'audio', label: 'Audio & Video' },
    { value: 'smart-home', label: 'Smart Home' }
  ];

  const languages = [
    { value: 'en', label: 'English' },
    { value: 'ar', label: 'العربية' },
    { value: 'fr', label: 'Français' },
    { value: 'es', label: 'Español' }
  ];

  const currencies = [
    { value: 'USD', label: 'US Dollar' },
    { value: 'SAR', label: 'Saudi Riyal' },
    { value: 'EUR', label: 'Euro' },
    { value: 'GBP', label: 'British Pound' }
  ];

  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isLangOpen, setIsLangOpen] = useState(false);
  const [isCurrencyOpen, setIsCurrencyOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState(categories[0]);
  const [selectedLanguage, setSelectedLanguage] = useState(languages[0]);
  const [selectedCurrency, setSelectedCurrency] = useState(currencies[0]);
  const [isSearchExpanded, setIsSearchExpanded] = useState(false);

  // Refs for dropdown containers
  const langDropdownRef = useRef<HTMLDivElement>(null);
  const currencyDropdownRef = useRef<HTMLDivElement>(null);
  const searchContainerRef = useRef<HTMLDivElement>(null);

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (langDropdownRef.current && !langDropdownRef.current.contains(event.target as Node)) {
        setIsLangOpen(false);
      }
      if (currencyDropdownRef.current && !currencyDropdownRef.current.contains(event.target as Node)) {
        setIsCurrencyOpen(false);
      }
      if (searchContainerRef.current && !searchContainerRef.current.contains(event.target as Node)) {
        setIsSearchExpanded(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Close mobile menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const mobileMenu = document.getElementById('mobile-menu');
      const menuButton = document.getElementById('mobile-menu-button');

      if (mobileMenu && !mobileMenu.contains(event.target as Node) &&
        menuButton && !menuButton.contains(event.target as Node)) {
        setIsMenuOpen(false);
      }
    };

    if (isMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.body.style.overflow = 'unset';
    };
  }, [isMenuOpen]);

  // Custom styles for React Select
  const selectStyles = {
    control: (provided: any) => ({
      ...provided,
      backgroundColor: 'transparent',
      border: 'none',
      boxShadow: 'none',
      minHeight: 'auto',
      cursor: 'pointer',
      '&:hover': {
        border: 'none'
      }
    }),
    valueContainer: (provided: any) => ({
      ...provided,
      padding: '0',
      fontSize: '0.875rem',
      fontWeight: '300',
      cursor: 'pointer'
    }),
    input: (provided: any) => ({
      ...provided,
      margin: '0',
      padding: '0'
    }),
    indicatorSeparator: () => ({
      display: 'none'
    }),
    dropdownIndicator: (provided: any, state: any) => ({
      ...provided,
      padding: '0',
      color: '#6B7280',
      cursor: 'pointer',
      transform: state.selectProps.menuIsOpen ? 'rotate(180deg)' : 'rotate(0deg)',
      transition: 'transform 0.2s ease'
    }),
    menu: (provided: any) => ({
      ...provided,
      backgroundColor: 'white',
      border: '1px solid #F3F4F6',
      borderRadius: '0',
      boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
      marginTop: '0.5rem',
      zIndex: 9999
    }),
    option: (provided: any, state: any) => ({
      ...provided,
      backgroundColor: state.isSelected ? '#FEF2F2' : state.isFocused ? '#F9FAFB' : 'transparent',
      color: state.isSelected ? '#DC2626' : '#374151',
      fontSize: '0.875rem',
      fontWeight: '300',
      padding: '0.75rem 1rem',
      cursor: 'pointer',
      '&:hover': {
        backgroundColor: '#F9FAFB'
      }
    }),
    singleValue: (provided: any) => ({
      ...provided,
      color: '#374151',
      cursor: 'pointer'
    }),
    menuList: (provided: any) => ({
      ...provided,
      padding: '0'
    })
  };

  // Mobile select styles
  const mobileSelectStyles = {
    ...selectStyles,
    control: (provided: any) => ({
      ...provided,
      backgroundColor: 'white',
      border: 'none',
      borderRadius: '0',
      minHeight: 'auto',
      boxShadow: 'none',
      '&:hover': {
        border: 'none'
      }
    }),
    valueContainer: (provided: any) => ({
      ...provided,
      padding: '0.75rem 1rem',
      fontSize: '0.875rem',
      fontWeight: '300'
    }),
    dropdownIndicator: (provided: any, state: any) => ({
      ...provided,
      padding: '0 0.75rem',
      color: '#6B7280',
      cursor: 'pointer',
      transform: state.selectProps.menuIsOpen ? 'rotate(180deg)' : 'rotate(0deg)',
      transition: 'transform 0.2s ease'
    }),
    menu: (provided: any) => ({
      ...provided,
      backgroundColor: 'white',
      border: '1px solid #F3F4F6',
      borderRadius: '0.375rem',
      boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
      marginTop: '0.25rem',
      zIndex: 9999
    })
  };

  return (
    <header className="bg-white dark:bg-gray-900 border-b border-gray-100 dark:border-gray-700 w-full transition-colors duration-200">
      {/* Top Information Bar - Hidden on mobile */}
      <div className="hidden md:block bg-gray-50 dark:bg-gray-800 text-gray-600 dark:text-gray-300 py-3 border-b border-gray-100 dark:border-gray-700">
        <div className="w-full max-w-7xl mx-auto px-4 lg:px-6 flex justify-between items-center text-sm">
          <div className="flex items-center space-x-4 lg:space-x-8">
            <span className="font-light text-xs lg:text-sm">Premium Electronics & Technology Solutions</span>
          </div>
          <div className="flex items-center space-x-4 lg:space-x-8">
            <AnimatedLink to="/store-locator" className="flex items-center space-x-2 hover:text-red-500 transition-colors duration-200">
              <HiLocationMarker className="w-4 h-4" />
              <span className="font-light hidden lg:inline">Store Locator</span>
            </AnimatedLink>
            <div className="w-px h-4 bg-gray-200"></div>
            <AnimatedLink to="/track-order" className="flex items-center space-x-2 hover:text-red-500 transition-colors duration-200">
              <HiTruck className="w-4 h-4" />
              <span className="font-light hidden lg:inline">Track Order</span>
            </AnimatedLink>
            <div className="w-px h-4 bg-gray-200"></div>
            <AnimatedLink to="/shop" className="flex items-center space-x-2 hover:text-red-500 transition-colors duration-200">
              <HiShoppingBag className="w-4 h-4" />
              <span className="font-light hidden lg:inline">Shop</span>
            </AnimatedLink>
            {!isAuthenticated && (
              <>
                <div className="w-px h-4 bg-gray-200"></div>
                <AnimatedLink to="/my-account" className="flex items-center space-x-2 hover:text-red-500 transition-colors duration-200">
                  <HiUser className="w-4 h-4" />
                  <span className="font-light hidden lg:inline">My Account</span>
                </AnimatedLink>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Main Header */}
      <div className="w-full max-w-7xl mx-auto px-4 lg:px-6 py-4 lg:py-8">
        <div className="flex items-center justify-between">
          {/* Logo */}
          <div className="flex items-center">
            <Link to="/" className="flex items-center">
              <div className="text-xl lg:text-3xl font-light text-gray-900 dark:text-white tracking-wider">
                SafawiNet
              </div>
            </Link>
          </div>

          {/* Navigation Menu - Hidden on mobile */}
          <nav className="hidden lg:flex items-center space-x-8 xl:space-x-12">
            <AnimatedLink to="/" className="text-gray-700 dark:text-gray-300 hover:text-red-500 transition-colors duration-200 font-light text-sm tracking-wide uppercase">
              Home
            </AnimatedLink>
            <AnimatedLink to="/about" className="text-gray-700 dark:text-gray-300 hover:text-red-500 transition-colors duration-200 font-light text-sm tracking-wide uppercase">
              About
            </AnimatedLink>
            <AnimatedLink to="/products" className="text-gray-700 dark:text-gray-300 hover:text-red-500 transition-colors duration-200 font-light text-sm tracking-wide uppercase">
              Products
            </AnimatedLink>
            <AnimatedLink to="/services" className="text-gray-700 dark:text-gray-300 hover:text-red-500 transition-colors duration-200 font-light text-sm tracking-wide uppercase">
              Services
            </AnimatedLink>
            <AnimatedLink to="/support" className="text-gray-700 dark:text-gray-300 hover:text-red-500 transition-colors duration-200 font-light text-sm tracking-wide uppercase">
              Support
            </AnimatedLink>
            <AnimatedLink to="/contact" className="text-gray-700 dark:text-gray-300 hover:text-red-500 transition-colors duration-200 font-light text-sm tracking-wide uppercase">
              Contact
            </AnimatedLink>
          </nav>

          {/* Controls - Hidden on mobile */}
          <div className="hidden lg:flex items-center space-x-6">
            {/* Theme Toggle */}
            <div className="relative">
              <AnimatedButton
                onClick={toggleTheme}
                className="flex items-center space-x-2 px-4 py-2 text-gray-600 dark:text-gray-200 hover:text-red-500 transition-colors duration-200 rounded-none border-b border-transparent hover:border-red-500"
                title={`Current theme: ${theme}`}
              >
                {theme === 'dark' ? (
                  <HiMoon className="w-4 h-4" />
                ) : theme === 'light' ? (
                  <HiSun className="w-4 h-4" />
                ) : (
                  <HiComputerDesktop className="w-4 h-4" />
                )}
                <span className="text-sm font-light tracking-wide capitalize">{theme}</span>
              </AnimatedButton>
            </div>

            {/* Language Selector */}
            <div className="relative" ref={langDropdownRef}>
              <AnimatedButton
                onClick={() => {
                  setIsLangOpen(!isLangOpen);
                  if (!isLangOpen) setIsCurrencyOpen(false);
                }}
                className="flex items-center space-x-2 px-4 py-2 text-gray-600 dark:text-gray-200 hover:text-red-500 transition-colors duration-200 rounded-none border-b border-transparent hover:border-red-500"
              >
                <span className="text-sm font-light tracking-wide">{selectedLanguage.value.toUpperCase()}</span>
                <HiChevronDown className={`w-3 h-3 transition-transform duration-200 ${isLangOpen ? 'rotate-180' : ''}`} />
              </AnimatedButton>

              {isLangOpen && (
                <div className="absolute right-0 mt-2 w-40 bg-white dark:bg-gray-800 rounded-none shadow-lg border border-gray-100 dark:border-gray-600 z-50 language-dropdown">
                  <div className="py-1">
                    {languages.map((lang) => (
                      <button
                        key={lang.value}
                        className="w-full text-left px-4 py-3 text-sm text-gray-600 dark:text-gray-200 hover:text-red-500 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors duration-200 font-light"
                        onClick={() => {
                          setSelectedLanguage(lang);
                          setIsLangOpen(false);
                        }}
                      >
                        {lang.label}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Currency Selector */}
            <div className="relative" ref={currencyDropdownRef}>
              <AnimatedButton
                onClick={() => {
                  setIsCurrencyOpen(!isCurrencyOpen);
                  if (!isCurrencyOpen) setIsLangOpen(false);
                }}
                className="flex items-center space-x-2 px-4 py-2 text-gray-600 dark:text-gray-200 hover:text-red-500 transition-colors duration-200 rounded-none border-b border-transparent hover:border-red-500"
              >
                <span className="text-sm font-light tracking-wide">{selectedCurrency.value}</span>
                <HiChevronDown className={`w-3 h-3 transition-transform duration-200 ${isCurrencyOpen ? 'rotate-180' : ''}`} />
              </AnimatedButton>

              {isCurrencyOpen && (
                <div className="absolute right-0 mt-2 w-40 bg-white dark:bg-gray-800 rounded-none shadow-lg border border-gray-100 dark:border-gray-600 z-50 currency-dropdown">
                  <div className="py-1">
                    {currencies.map((currency) => (
                      <button
                        key={currency.value}
                        className="w-full text-left px-4 py-3 text-sm text-gray-600 dark:text-gray-200 hover:text-red-500 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors duration-200 font-light"
                        onClick={() => {
                          setSelectedCurrency(currency);
                          setIsCurrencyOpen(false);
                        }}
                      >
                        {currency.label}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Mobile Controls */}
          <div className="flex lg:hidden items-center space-x-2">
            {/* Mobile Search Toggle */}
            <AnimatedButton
              onClick={() => setIsSearchExpanded(!isSearchExpanded)}
              className="p-2 text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white transition-colors duration-200"
              aria-label="Toggle search"
            >
              <HiSearch className="w-5 h-5" />
            </AnimatedButton>

            {/* Mobile Cart */}
            <AnimatedButton
              className="relative p-2 text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white transition-colors duration-200"
              aria-label="Shopping cart"
            >
              <HiOutlineShoppingCart className="w-5 h-5" />
            </AnimatedButton>

            {/* Mobile Menu Button */}
            <AnimatedButton
              id="mobile-menu-button"
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="p-2 text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white transition-colors duration-200"
              aria-label="Toggle mobile menu"
            >
              {isMenuOpen ? (
                <HiX className="w-5 h-5" />
              ) : (
                <HiMenu className="w-5 h-5" />
              )}
            </AnimatedButton>
          </div>
        </div>

        {/* Mobile Search Bar */}
        <div
          className={`mt-4 lg:hidden transition-all duration-300 ease-in-out overflow-hidden ${isSearchExpanded
            ? 'max-h-20 opacity-100'
            : 'max-h-0 opacity-0'
            }`}
          ref={searchContainerRef}
        >
          <form className="w-full">
            <div className="relative">
              <div className="flex items-stretch bg-white dark:bg-gray-800 shadow-lg border border-gray-200 dark:border-gray-600 overflow-hidden transition-colors duration-200 search-bar">
                {/* Categories Select */}
                <div className="flex-shrink-0 border-r border-gray-200 dark:border-gray-600">
                  <Select
                    options={categories}
                    value={selectedCategory}
                    onChange={(option) => setSelectedCategory(option as any)}
                    styles={mobileSelectStyles}
                    className="w-36"
                    classNamePrefix="react-select"
                    isSearchable={false}
                    isClearable={false}
                    menuPlacement="bottom"
                    closeMenuOnSelect={true}
                    blurInputOnSelect={true}
                    aria-label="Select category"
                  />
                </div>

                {/* Search Input */}
                <input
                  type="text"
                  placeholder="Search products..."
                  className="flex-1 px-4 py-2 text-sm font-light text-gray-700 dark:text-gray-200 placeholder-gray-400 dark:placeholder-gray-500 bg-white dark:bg-gray-800 focus:outline-none min-w-0 transition-colors duration-200"
                  aria-label="Search products"
                />

                {/* Search Button */}
                <AnimatedButton
                  type="submit"
                  className="flex-shrink-0 px-4 py-3 bg-gray-800 dark:bg-gray-700 hover:bg-gray-700 dark:hover:bg-gray-600 text-white transition-colors duration-200 focus:outline-none flex items-center justify-center min-w-[40px]"
                  aria-label="Search"
                >
                  <HiSearch className="w-4 h-4" />
                </AnimatedButton>
              </div>
            </div>
          </form>
        </div>
      </div>

      {/* Search and Cart Bar - Hidden on mobile */}
      <div className="hidden md:block bg-gray-900">
        <div className="w-full max-w-7xl mx-auto px-4 lg:px-6 py-4 lg:py-6">
          <div className="flex items-center justify-between space-x-4 lg:space-x-8">
            <div className="flex items-center space-x-4 lg:space-x-8">
              <Link
                to="/new-arrivals"
                className="text-white hover:text-red-400 transition-colors duration-200 text-xs lg:text-sm font-light tracking-wide uppercase"
              >
                New Arrivals
              </Link>
              <Link
                to="/best-sellers"
                className="text-white hover:text-red-400 transition-colors duration-200 text-xs lg:text-sm font-light tracking-wide uppercase"
              >
                Best Sellers
              </Link>
              <Link
                to="/special-offers"
                className="text-white hover:text-red-400 transition-colors duration-200 text-xs lg:text-sm font-light tracking-wide uppercase"
              >
                Special Offers
              </Link>
            </div>

            {/* Search Bar */}
            <form className="flex-1 max-w-2xl mx-4 lg:mx-8">
              <div className="relative">
                <div className="flex items-center bg-white dark:bg-gray-700 shadow-lg border border-gray-200 dark:border-gray-600 overflow-hidden transition-colors duration-200 search-bar">
                  {/* Categories Select */}
                  <div className="flex-shrink-0">
                    <Select
                      options={categories}
                      value={selectedCategory}
                      onChange={(option) => setSelectedCategory(option as any)}
                      styles={selectStyles}
                      className="w-40"
                      classNamePrefix="react-select"
                      isSearchable={false}
                      isClearable={false}
                      menuPlacement="bottom"
                      closeMenuOnSelect={true}
                      blurInputOnSelect={true}
                      menuPortalTarget={document.body}
                      aria-label="Select category"
                    />
                  </div>

                  {/* Search Input */}
                  <input
                    type="text"
                    placeholder="Search for products, brands, and more..."
                    className="flex-1 px-4 py-2 text-sm font-light text-gray-700 dark:text-gray-200 placeholder-gray-400 dark:placeholder-gray-500 bg-white dark:bg-gray-700 focus:outline-none transition-colors duration-200"
                    aria-label="Search products"
                  />

                  {/* Search Button */}
                  <button
                    type="submit"
                    className="px-4 py-3.5 bg-gray-800 dark:bg-gray-600 hover:bg-gray-700 dark:hover:bg-gray-500 text-white transition-colors duration-200 focus:outline-none"
                    aria-label="Search"
                  >
                    <HiSearch className="w-5 h-5" />
                  </button>
                </div>
              </div>
            </form>

            {/* User Utilities */}
            <div className="flex items-center space-x-4 lg:space-x-6">
              <button
                className="p-3 text-white hover:text-red-400 transition-colors duration-200"
                aria-label="Wishlist"
                title="Wishlist"
              >
                <HiHeart className="w-5 h-5 lg:w-6 lg:h-6" />
              </button>
              {isAuthenticated ? (
                <div className="relative group">
                  <button className="flex items-center space-x-2 p-3 text-white hover:text-red-400 transition-colors duration-200">
                    <HiUser className="w-5 h-5 lg:w-6 lg:h-6" />
                    <span className="text-sm font-light hidden lg:inline">{user?.name || 'User'}</span>
                    <HiChevronDown className="w-3 h-3" />
                  </button>
                  <div className="absolute right-0 mt-2 w-48 bg-white rounded-none shadow-lg border border-gray-100 z-50 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200">
                    <div className="py-1">
                      <Link
                        to="/account-settings"
                        className="block w-full text-left px-4 py-3 text-sm text-gray-600 hover:text-red-500 hover:bg-gray-50 transition-colors duration-200 font-light"
                      >
                        Account Settings
                      </Link>
                      <button
                        onClick={logout}
                        className="block w-full text-left px-4 py-3 text-sm text-gray-600 hover:text-red-500 hover:bg-gray-50 transition-colors duration-200 font-light flex items-center"
                      >
                        <HiLogout className="w-4 h-4 mr-2" />
                        Sign Out
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                <Link
                  to="/my-account"
                  className="p-3 text-white hover:text-red-400 transition-colors duration-200"
                  aria-label="User account"
                  title="My Account"
                >
                  <HiUser className="w-5 h-5 lg:w-6 lg:h-6" />
                </Link>
              )}
              <button
                className="relative p-3 text-white hover:text-red-400 transition-colors duration-200"
                aria-label="Shopping cart"
                title="Shopping Cart"
              >
                <HiOutlineShoppingCart className="w-5 h-5 lg:w-6 lg:h-6" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile Menu */}
      <div
        className={`lg:hidden fixed inset-0 z-50 bg-white dark:bg-gray-900 w-full transition-all duration-300 ease-in-out mobile-menu ${isMenuOpen
          ? 'translate-x-0 opacity-100'
          : 'translate-x-full opacity-0 pointer-events-none'
          }`}
      >
        <div className="h-full overflow-y-auto w-full">
          {/* Mobile Menu Header with Close Button */}
          <div className="flex items-center justify-between px-4 py-4 border-b border-gray-100 dark:border-gray-700">
            <h2 className="text-lg font-medium text-gray-900 dark:text-white">Menu</h2>
            <AnimatedButton
              onClick={() => setIsMenuOpen(false)}
              className="p-2 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-colors duration-200"
              aria-label="Close menu"
            >
              <HiX className="w-6 h-6" />
            </AnimatedButton>
          </div>

          <div className="px-4 py-6 space-y-2 w-full">
            {/* Mobile Navigation */}
            <div className="space-y-1">
              <AnimatedLink
                to="/"
                className="block px-4 py-3 text-gray-700 dark:text-gray-200 hover:text-red-500 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors duration-200 font-light rounded-lg"
                onClick={() => setIsMenuOpen(false)}
              >
                Home
              </AnimatedLink>
              <AnimatedLink
                to="/about"
                className="block px-4 py-3 text-gray-700 dark:text-gray-200 hover:text-red-500 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors duration-200 font-light rounded-lg"
                onClick={() => setIsMenuOpen(false)}
              >
                About
              </AnimatedLink>
              <AnimatedLink
                to="/products"
                className="block px-4 py-3 text-gray-700 dark:text-gray-200 hover:text-red-500 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors duration-200 font-light rounded-lg"
                onClick={() => setIsMenuOpen(false)}
              >
                Products
              </AnimatedLink>
              <AnimatedLink
                to="/services"
                className="block px-4 py-3 text-gray-700 dark:text-gray-200 hover:text-red-500 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors duration-200 font-light rounded-lg"
                onClick={() => setIsMenuOpen(false)}
              >
                Services
              </AnimatedLink>
              <AnimatedLink
                to="/support"
                className="block px-4 py-3 text-gray-700 dark:text-gray-200 hover:text-red-500 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors duration-200 font-light rounded-lg"
                onClick={() => setIsMenuOpen(false)}
              >
                Support
              </AnimatedLink>
              <AnimatedLink
                to="/contact"
                className="block px-4 py-3 text-gray-700 dark:text-gray-200 hover:text-red-500 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors duration-200 font-light rounded-lg"
                onClick={() => setIsMenuOpen(false)}
              >
                Contact
              </AnimatedLink>
            </div>

            {/* Mobile Quick Links */}
            <div className="border-t border-gray-100 dark:border-gray-700 pt-6 mt-6">
              <div className="text-sm font-medium text-gray-500 dark:text-gray-300 mb-4 px-4">Quick Links</div>
              <div className="space-y-1">
                <AnimatedLink
                  to="/new-arrivals"
                  className="block px-4 py-3 text-gray-700 dark:text-gray-200 hover:text-red-500 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors duration-200 font-light rounded-lg"
                  onClick={() => setIsMenuOpen(false)}
                >
                  New Arrivals
                </AnimatedLink>
                <AnimatedLink
                  to="/best-sellers"
                  className="block px-4 py-3 text-gray-700 dark:text-gray-200 hover:text-red-500 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors duration-200 font-light rounded-lg"
                  onClick={() => setIsMenuOpen(false)}
                >
                  Best Sellers
                </AnimatedLink>
                <AnimatedLink
                  to="/special-offers"
                  className="block px-4 py-3 text-gray-700 dark:text-gray-200 hover:text-red-500 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors duration-200 font-light rounded-lg"
                  onClick={() => setIsMenuOpen(false)}
                >
                  Special Offers
                </AnimatedLink>
                <AnimatedLink
                  to="/store-locator"
                  className="block px-4 py-3 text-gray-700 dark:text-gray-200 hover:text-red-500 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors duration-200 font-light rounded-lg"
                  onClick={() => setIsMenuOpen(false)}
                >
                  Store Locator
                </AnimatedLink>
                <AnimatedLink
                  to="/track-order"
                  className="block px-4 py-3 text-gray-700 dark:text-gray-200 hover:text-red-500 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors duration-200 font-light rounded-lg"
                  onClick={() => setIsMenuOpen(false)}
                >
                  Track Order
                </AnimatedLink>
              </div>
            </div>

            {/* Mobile Account Section */}
            <div className="border-t border-gray-100 dark:border-gray-700 pt-6 mt-6">
              <div className="text-sm font-medium text-gray-500 dark:text-gray-300 mb-4 px-4">Account</div>
              <div className="space-y-1">
                {isAuthenticated ? (
                  <>
                    <div className="px-4 py-3 text-gray-700 dark:text-gray-200 font-light">
                      Welcome, {user?.name || 'User'}
                    </div>
                    <AnimatedLink
                      to="/my-account"
                      className="block px-4 py-3 text-gray-700 dark:text-gray-200 hover:text-red-500 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors duration-200 font-light rounded-lg"
                      onClick={() => setIsMenuOpen(false)}
                    >
                      Account Settings
                    </AnimatedLink>
                    <button
                      onClick={() => {
                        logout();
                        setIsMenuOpen(false);
                      }}
                      className="block w-full text-left px-4 py-3 text-gray-700 dark:text-gray-200 hover:text-red-500 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors duration-200 font-light rounded-lg flex items-center"
                    >
                      <HiLogout className="w-4 h-4 mr-2" />
                      Sign Out
                    </button>
                  </>
                ) : (
                  <AnimatedLink
                    to="/my-account"
                    className="block px-4 py-3 text-gray-700 dark:text-gray-200 hover:text-red-500 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors duration-200 font-light rounded-lg"
                    onClick={() => setIsMenuOpen(false)}
                  >
                    Sign In / Register
                  </AnimatedLink>
                )}
              </div>
            </div>

            {/* Mobile Preferences */}
            <div className="border-t border-gray-100 dark:border-gray-700 pt-6 mt-6">
              <div className="text-sm font-medium text-gray-500 dark:text-gray-300 mb-4 px-4">Preferences</div>

              {/* Mobile Theme */}
              <div className="px-4 py-3">
                <div className="flex items-center justify-between">
                  <span className="text-gray-700 dark:text-gray-200 font-light">Theme</span>
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => setTheme('light')}
                      className={`p-2 rounded-lg transition-colors duration-200 ${
                        theme === 'light' 
                          ? 'bg-red-100 dark:bg-red-900 text-red-600 dark:text-red-400' 
                          : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-200 hover:bg-gray-200 dark:hover:bg-gray-600'
                      }`}
                      title="Light theme"
                    >
                      <HiSun className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => setTheme('dark')}
                      className={`p-2 rounded-lg transition-colors duration-200 ${
                        theme === 'dark' 
                          ? 'bg-red-100 dark:bg-red-900 text-red-600 dark:text-red-400' 
                          : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-200 hover:bg-gray-200 dark:hover:bg-gray-600'
                      }`}
                      title="Dark theme"
                    >
                      <HiMoon className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => setTheme('auto')}
                      className={`p-2 rounded-lg transition-colors duration-200 ${
                        theme === 'auto' 
                          ? 'bg-red-100 dark:bg-red-900 text-red-600 dark:text-red-400' 
                          : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-200 hover:bg-gray-200 dark:hover:bg-gray-600'
                      }`}
                      title="Auto theme"
                    >
                      <HiComputerDesktop className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>

              {/* Mobile Language */}
              <div className="px-4 py-3">
                <div className="flex items-center justify-between">
                  <span className="text-gray-700 dark:text-gray-100 font-light">Language</span>
                  <Select
                    options={languages}
                    value={selectedLanguage}
                    onChange={(option) => setSelectedLanguage(option as any)}
                    styles={mobileSelectStyles}
                    classNamePrefix="react-select"
                    aria-label="Select language"
                  />
                </div>
              </div>

              {/* Mobile Currency */}
              <div className="px-4 py-3">
                <div className="flex items-center justify-between">
                  <span className="text-gray-700 dark:text-gray-100 font-light">Currency</span>
                  <Select
                    options={currencies}
                    value={selectedCurrency}
                    onChange={(option) => setSelectedCurrency(option as any)}
                    styles={mobileSelectStyles}
                    classNamePrefix="react-select"
                    aria-label="Select currency"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;
