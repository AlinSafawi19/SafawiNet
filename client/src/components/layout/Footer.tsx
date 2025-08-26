import React from 'react';
import { Link } from 'react-router-dom';
import {
  HiPhone,
  HiMail,
  HiClock,
  HiLocationMarker
} from 'react-icons/hi';

const Footer: React.FC = () => {
  return (
    <footer className="bg-gray-50 dark:bg-gray-800 border-t border-gray-100 dark:border-gray-700 w-full overflow-x-hidden relative transition-colors duration-200">
      {/* Background overlay for opacity */}
      <div className="absolute inset-0 bg-gray-50/80 dark:bg-gray-800/80"></div>
      {/* Main Footer Content */}
      <div className="relative z-10 w-full max-w-7xl mx-auto px-4 sm:px-6 py-12 lg:py-20">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 lg:gap-16">

          {/* Company Information */}
          <div className="space-y-6">
            <div className="text-2xl font-light text-gray-900 dark:text-white tracking-wider">
              SafawiNet
            </div>
            <p className="text-gray-600 dark:text-gray-300 text-sm leading-relaxed font-light">
              Premium electronics and technology solutions for the modern world.
              Delivering innovation, quality, and exceptional service since 2010.
            </p>
            <div className="pt-4">
              <div className="flex items-center space-x-3">
                <HiLocationMarker className="w-5 h-5 text-red-500 flex-shrink-0" />
                <span className="text-sm text-gray-600 dark:text-gray-300 font-light">
                  Riyadh, Saudi Arabia
                </span>
              </div>
            </div>
          </div>

          {/* Quick Links */}
          <div className="space-y-6">
            <h3 className="text-lg font-light text-gray-900 dark:text-white tracking-wide uppercase relative before:content-[''] before:absolute before:left-0 before:-bottom-1 before:w-8 before:h-0.5 before:bg-red-500 before:rounded-full">Quick Links</h3>
            <ul className="space-y-3">
              <li>
                <Link to="/" className="text-gray-600 dark:text-gray-300 hover:text-red-500 transition-colors duration-200 text-sm font-light">
                  Home
                </Link>
              </li>
              <li>
                <Link to="/about" className="text-gray-600 dark:text-gray-300 hover:text-red-500 transition-colors duration-200 text-sm font-light">
                  About Us
                </Link>
              </li>
              <li>
                <Link to="/products" className="text-gray-600 dark:text-gray-300 hover:text-red-500 transition-colors duration-200 text-sm font-light">
                  Products
                </Link>
              </li>
              <li>
                <Link to="/services" className="text-gray-600 dark:text-gray-300 hover:text-red-500 transition-colors duration-200 text-sm font-light">
                  Services
                </Link>
              </li>
              <li>
                <Link to="/contact" className="text-gray-600 dark:text-gray-300 hover:text-red-500 transition-colors duration-200 text-sm font-light">
                  Contact
                </Link>
              </li>
            </ul>
          </div>

          {/* Customer Service */}
          <div className="space-y-6">
            <h3 className="text-lg font-light text-gray-900 dark:text-white tracking-wide uppercase relative before:content-[''] before:absolute before:left-0 before:-bottom-1 before:w-8 before:h-0.5 before:bg-red-500 before:rounded-full">Support</h3>
            <ul className="space-y-3">
              <li>
                <Link to="/support" className="text-gray-600 dark:text-gray-300 hover:text-red-500 transition-colors duration-200 text-sm font-light">
                  Support Center
                </Link>
              </li>
              <li>
                <Link to="/track-order" className="text-gray-600 dark:text-gray-300 hover:text-red-500 transition-colors duration-200 text-sm font-light">
                  Track Order
                </Link>
              </li>
              <li>
                <Link to="/returns" className="text-gray-600 dark:text-gray-300 hover:text-red-500 transition-colors duration-200 text-sm font-light">
                  Returns & Exchanges
                </Link>
              </li>
              <li>
                <Link to="/shipping" className="text-gray-600 dark:text-gray-300 hover:text-red-500 transition-colors duration-200 text-sm font-light">
                  Shipping Information
                </Link>
              </li>
              <li>
                <Link to="/faq" className="text-gray-600 dark:text-gray-300 hover:text-red-500 transition-colors duration-200 text-sm font-light">
                  Frequently Asked Questions
                </Link>
              </li>
            </ul>
          </div>

          {/* Contact Information */}
          <div className="space-y-6">
            <h3 className="text-lg font-light text-gray-900 dark:text-white tracking-wide uppercase relative before:content-[''] before:absolute before:left-0 before:-bottom-1 before:w-8 before:h-0.5 before:bg-red-500 before:rounded-full">Contact</h3>
            <div className="space-y-4">
              <div className="flex items-center space-x-3">
                <HiPhone className="w-5 h-5 text-red-500 flex-shrink-0" />
                <a
                  href="tel:+966112345678"
                  className="text-sm text-gray-600 dark:text-gray-300 hover:text-red-500 transition-colors duration-200 font-light"
                >
                  +966 11 234 5678
                </a>
              </div>
              <div className="flex items-center space-x-3">
                <HiMail className="w-5 h-5 text-red-500 flex-shrink-0" />
                <a
                  href="mailto:info@safawinet.com"
                  className="text-sm text-gray-600 dark:text-gray-300 hover:text-red-500 transition-colors duration-200 font-light"
                >
                  info@safawinet.com
                </a>
              </div>
              <div className="flex items-center space-x-3">
                <HiClock className="w-5 h-5 text-red-500 flex-shrink-0" />
                <div className="text-sm text-gray-600 dark:text-gray-300 font-light">
                  Mon-Sat: 9:00 AM - 6:00 PM
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Footer */}
      <div className="relative z-10 border-t border-gray-100 dark:border-gray-700 bg-white/90 dark:bg-gray-900/90">
        <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 py-6 lg:py-8">
          <div className="flex flex-col md:flex-row justify-between items-center space-y-4 md:space-y-0">
            <div className="text-sm text-gray-500 dark:text-gray-400 font-light text-center md:text-left">
              © {new Date().getFullYear()} SafawiNet. All rights reserved.
            </div>
            <div className="flex flex-wrap justify-center md:justify-end space-x-4 lg:space-x-8 text-sm">
              <Link to="/privacy" className="text-gray-500 dark:text-gray-400 hover:text-red-500 transition-colors duration-200 font-light">
                Privacy Policy
              </Link>
              <Link to="/terms" className="text-gray-500 dark:text-gray-400 hover:text-red-500 transition-colors duration-200 font-light">
                Terms of Service
              </Link>
              <Link to="/sitemap" className="text-gray-500 dark:text-gray-400 hover:text-red-500 transition-colors duration-200 font-light">
                Sitemap
              </Link>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
