'use client';

import React, { useMemo } from 'react';
import Link from 'next/link';
import { useLanguage } from '../contexts/LanguageContext';
import { usePathname } from 'next/navigation';

interface BreadcrumbItem {
  label: string;
  href?: string;
  isActive?: boolean;
}

interface BreadcrumbProps {
  items: BreadcrumbItem[];
  className?: string;
}

export const Breadcrumb: React.FC<BreadcrumbProps> = ({
  items,
  className = '',
}) => {
  const { locale, t } = useLanguage();
  const pathname = usePathname();
  
  // Memoize expensive calculations
  const { isRTL, isAccountPage } = useMemo(() => ({
    isRTL: locale === 'ar',
    isAccountPage: pathname.startsWith('/account')
  }), [locale, pathname]);

  return (
    <nav
      className={`flex items-center space-x-2 text-sm ${
        isRTL ? 'space-x-reverse' : ''
      } ${className}`}
      aria-label={t('accessibility.breadcrumb')}
    >
      <ol
        className={`flex items-center space-x-2 ${
          isRTL ? 'space-x-reverse' : ''
        }`}
      >
        {items.map((item, index) => (
          <li key={index} className="flex items-center">
            {index > 0 && (
              <svg
                className={`w-4 h-4 mx-2 ${isRTL ? 'rotate-180' : ''} ${
                  isAccountPage ? 'text-gray-400 dark:text-gray-400' : 'text-gray-400 dark:text-gray-400'
                }`}
                fill="currentColor"
                viewBox="0 0 20 20"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  fillRule="evenodd"
                  d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z"
                  clipRule="evenodd"
                />
              </svg>
            )}
            {item.href && !item.isActive ? (
              <Link
                href={item.href}
                className={`transition-colors duration-200 ${
                  isAccountPage
                    ? 'text-gray-400 dark:text-gray-400 hover:text-black dark:hover:text-white'
                    : 'text-gray-600 dark:text-gray-400 hover:text-black dark:hover:text-white'
                }`}
              >
                {item.label}
              </Link>
            ) : (
              <span
                className={`${
                  item.isActive
                    ? isAccountPage
                      ? 'text-black dark:text-white font-medium'
                      : 'text-black dark:text-white font-medium'
                    : isAccountPage
                    ? 'text-gray-400 dark:text-gray-400'
                    : 'text-gray-600 dark:text-gray-400'
                }`}
              >
                {item.label}
              </span>
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
};

// Helper function to generate breadcrumb items based on pathname
export const generateBreadcrumbItems = (
  pathname: string,
  t: (key: string) => string,
  locale?: string
): BreadcrumbItem[] => {
  const segments = pathname.split('/').filter(Boolean);
  const items: BreadcrumbItem[] = [];

  // Build breadcrumb items based on path segments
  let currentPath = '';

  segments.forEach((segment, index) => {
    currentPath += `/${segment}`;
    const isLast = index === segments.length - 1;

    // Map segments to translation keys
    let label = '';
    let href = isLast ? undefined : currentPath;

    switch (segment) {
      case 'account':
        label = t('breadcrumb.account');
        break;
      case 'profile-settings':
        label = t('breadcrumb.profileSettings');
        break;
      case 'login-security':
        label = t('breadcrumb.loginSecurity');
        break;
      default:
        // Capitalize first letter and replace hyphens with spaces
        label =
          segment.charAt(0).toUpperCase() + segment.slice(1).replace(/-/g, ' ');
    }

    items.push({
      label,
      href,
      isActive: isLast,
    });
  });

  // Reverse the items for Arabic (RTL) to show the correct reading order
  if (locale === 'ar') {
    return items.reverse();
  }

  return items;
};

// Memoized version for better performance
export const useBreadcrumbItems = (
  pathname: string,
  t: (key: string) => string,
  locale?: string
) => {
  return useMemo(() => 
    generateBreadcrumbItems(pathname, t, locale), 
    [pathname, t, locale]
  );
};
