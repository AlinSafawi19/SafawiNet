'use client';

import React from 'react';
import Link from 'next/link';
import { useLanguage } from '../../contexts/LanguageContext';

const Footer = () => {
  const { t, locale } = useLanguage();

  // Create footer sections with conditional ordering for RTL support
  const footerSections = [
    {
      key: 'quickLinks',
      title: t('footer.sections.quickLinks'),
      links: [
        { href: '/', text: t('footer.links.home') },
        { href: '/products', text: t('footer.links.allProducts') },
        { href: '/categories', text: t('footer.links.categories') },
        { href: '/deals', text: t('footer.links.dealsOffers') },
        { href: '/compatibility', text: t('footer.links.compatibilityCheck') },
      ]
    },
    {
      key: 'customerSupport',
      title: t('footer.sections.customerSupport'),
      links: [
        { href: '/help', text: t('footer.links.helpCenter') },
        { href: '/contact', text: t('footer.links.contactUs') },
        { href: '/shipping', text: t('footer.links.shippingInfo') },
        { href: '/returns', text: t('footer.links.returnsExchanges') },
        { href: '/warranty', text: t('footer.links.warrantyInfo') },
      ]
    },
    {
      key: 'myAccount',
      title: t('footer.sections.myAccount'),
      links: [
        { href: '/account', text: t('footer.links.myAccount') },
        { href: '/orders', text: t('footer.links.orderHistory') },
        { href: '/wishlist', text: t('footer.links.wishlist') },
        { href: '/reviews', text: t('footer.links.myReviews') },
        { href: '/downloads', text: t('footer.links.downloads') },
      ]
    },
    {
      key: 'company',
      title: t('footer.sections.company'),
      links: [
        { href: '/about', text: t('footer.links.aboutUs') },
        { href: '/privacy', text: t('footer.links.privacyPolicy') },
        { href: '/terms', text: t('footer.links.termsOfService') },
        { href: '/sitemap', text: t('footer.links.sitemap') },
      ]
    }
  ];

  // Reverse the order for Arabic (RTL)
  const orderedSections = locale === 'ar' ? [...footerSections].reverse() : footerSections;

  return (
    <footer className="w-full min-h-56 bg-turquoise-100 dark:bg-dark-surface leading-7 transition-colors duration-200">
      {/* Header Section */}
      <div className="bg-black text-white text-center py-4 sm:py-6 px-4">
        <h1 className="font-bold">
          {t('footer.getInTouch')}
        </h1>
        <p className="mt-4 sm:mt-6 md:mt-10 text-xs sm:text-sm md:text-base px-2">
          INFO@MYSITE.COM | {t('footer.phone')} 123-456-7890
        </p>
      </div>

      {/* Logo Section */}
      <div className="bg-turquoise-100 dark:bg-dark-surface text-black dark:text-white text-center py-6 sm:py-8 px-4">
        <div className="mx-auto max-w-4xl">
          <h2 className="text-lg sm:text-xl md:text-2xl lg:text-3xl font-bold tracking-wider">
            $AFAWI NETT
          </h2>
          <p className="text-xs sm:text-sm md:text-base mt-2 text-gray-700 dark:text-gray-300 px-4 max-w-2xl mx-auto">
            {t('footer.tagline')}
          </p>
        </div>
      </div>

      {/* Social Media Links */}
      <div className="bg-turquoise-100 dark:bg-dark-surface text-center pb-4 sm:pb-6 px-4">
        <div className="flex justify-center space-x-4 sm:space-x-6">
          <a href="#" className="text-black dark:text-white hover:text-gray-600 dark:hover:text-gray-400 transition-colors p-2">
            <span className="sr-only">Facebook</span>
            <svg className="h-5 w-5 sm:h-6 sm:w-6" fill="currentColor" viewBox="0 0 24 24">
              <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
            </svg>
          </a>
          <a href="#" className="text-black dark:text-white hover:text-gray-600 dark:hover:text-gray-400 transition-colors p-2">
            <span className="sr-only">Instagram</span>
            <svg className="h-5 w-5 sm:h-6 sm:w-6" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />
            </svg>
          </a>
          <a href="#" className="text-black dark:text-white hover:text-gray-600 dark:hover:text-gray-400 transition-colors p-2">
            <span className="sr-only">WhatsApp</span>
            <svg className="h-5 w-5 sm:h-6 sm:w-6" fill="currentColor" viewBox="0 0 24 24">
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893A11.821 11.821 0 0020.885 3.488" />
            </svg>
          </a>
        </div>
      </div>

      {/* Enhanced Footer Content */}
      <div className="mx-auto px-4 sm:px-6 md:px-8 lg:px-14 py-6 sm:py-8">
        <div className={`grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 sm:gap-8 max-w-7xl mx-auto ${locale === 'ar' ? 'text-right' : ''}`}>
          {orderedSections.map((section) => (
            <div key={section.key} className={`text-center sm:text-left ${locale === 'ar' ? 'sm:text-right' : ''}`}>
              <h3 className="font-bold text-base sm:text-lg mb-3 sm:mb-4 text-black dark:text-white">
                {section.title}
              </h3>
              <ul className="space-y-1.5 sm:space-y-2 text-xs sm:text-sm">
                {section.links.map((link, index) => (
                  <li key={index}>
                    <Link 
                      href={link.href} 
                      className="text-black dark:text-gray-300 hover:underline transition-colors"
                    >
                      {link.text}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>

      {/* Copyright Section */}
      <div className="mx-auto text-center pt-4 sm:pt-6 lg:pt-11 pb-4 sm:pb-6 lg:pb-20 px-4 sm:px-6 lg:px-14">
        <p className="font-default text-xs sm:text-sm">
          {locale === 'ar' ? (
            <>
              © 2025 SAFAWI NETT {t('footer.copyright.allRightsReserved')}. {t('footer.copyright.by')}
            </>
          ) : (
            <>
              © 2025 {t('footer.copyright.by')} SAFAWI NETT. {t('footer.copyright.allRightsReserved')}
            </>
          )}
        </p>
      </div>
    </footer>
  );
};

export default Footer;
