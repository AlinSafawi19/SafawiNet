'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useLanguage } from '../../contexts/LanguageContext';
import {
  HiHome,
  HiUsers,
  HiCube,
  HiShoppingCart,
  HiChartBar,
  HiChatBubbleLeftRight,
} from 'react-icons/hi2';

interface AdminSidebarProps {}

const AdminSidebar: React.FC<AdminSidebarProps> = () => {
  const { t, locale } = useLanguage();
  const pathname = usePathname();

  const navigationItems: Array<{
    name: string;
    href: string;
    icon: any;
    label: string;
    isStandalone?: boolean;
    category?: string;
  }> = [
    {
      name: 'Dashboard',
      href: '/admin',
      icon: HiHome,
      label: 'admin.sidebar.dashboard',
      isStandalone: true,
    },
    {
      name: 'Customers',
      href: '/admin/customers',
      icon: HiUsers,
      label: 'admin.sidebar.customers',
      category: 'management',
    },
    {
      name: 'Products',
      href: '/admin/products',
      icon: HiCube,
      label: 'admin.sidebar.products',
      category: 'management',
    },
    {
      name: 'Orders',
      href: '/admin/orders',
      icon: HiShoppingCart,
      label: 'admin.sidebar.orders',
      category: 'management',
    },
    {
      name: 'Analytics',
      href: '/admin/analytics',
      icon: HiChartBar,
      label: 'admin.sidebar.analytics',
      category: 'insights',
    },
    {
      name: 'Customer Support',
      href: '/admin/support',
      icon: HiChatBubbleLeftRight,
      label: 'admin.sidebar.support',
      category: 'support',
    },
  ];

  const isActive = (href: string) => {
    if (href === '/admin') {
      return pathname === '/admin';
    }
    return pathname.startsWith(href);
  };

  const standaloneItems = navigationItems.filter(item => item.isStandalone);
  const groupedItems = navigationItems
    .filter(item => !item.isStandalone && item.category)
    .reduce((acc, item) => {
      if (!acc[item.category!]) {
        acc[item.category!] = [];
      }
      acc[item.category!].push(item);
      return acc;
    }, {} as Record<string, typeof navigationItems>);

  const categoryLabels = {
    management: 'Management',
    insights: 'Insights',
    support: 'Support',
  };

  return (
    <>
      {/* Sidebar - Hidden on mobile, visible on desktop */}
      <div
        className={`
        fixed top-14 min-h-[calc(100vh-3rem)] bg-white dark:bg-dark-surface text-black dark:text-white transition-transform duration-300 ease-in-out
        hidden lg:block
        w-72 border-r border-gray-200 dark:border-zinc-700
        ${locale === 'ar' ? 'right-0' : 'left-0'}
      `}
      >
        {/* Navigation */}
        <nav className="py-4">
          {/* Standalone Items (Dashboard) */}
          {standaloneItems.length > 0 && (
            <div className="mb-6">
              <div className="space-y-1">
                {standaloneItems.map((item) => {
                  const Icon = item.icon;
                  const active = isActive(item.href);

                  return (
                    <Link
                      key={item.name}
                      href={item.href}
                      className={`
                        flex items-center space-x-3 px-6 py-3 mx-2 rounded-lg transition-all duration-200 font-medium group
                        ${
                          active
                            ? 'bg-black dark:bg-white text-white dark:text-black'
                            : 'text-gray-600 dark:text-zinc-300 hover:bg-gray-100 dark:hover:bg-zinc-800 hover:text-gray-900 dark:hover:text-zinc-100'
                        }
                        ${locale === 'ar' ? 'flex-row-reverse space-x-reverse' : ''}
                      `}
                      onClick={() => {
                        // Navigation link clicked
                      }}
                    >
                      <div className={`
                        flex items-center justify-center w-6 h-6 transition-colors duration-200
                        ${active
                          ? 'text-white dark:text-black'
                          : 'text-gray-500 dark:text-zinc-400 group-hover:text-gray-700 dark:group-hover:text-zinc-200'
                        }
                      `}>
                        {Icon({
                          className: 'w-5 h-5',
                        })}
                      </div>
                      <span className="font-medium text-sm">
                        {t(item.label) || item.name}
                      </span>
                    </Link>
                  );
                })}
              </div>
              
              {/* Separator after standalone items */}
              <div className="mx-6 mt-4 mb-2">
                <div className="h-px bg-gray-200 dark:bg-zinc-700"></div>
              </div>
            </div>
          )}

          {/* Grouped Items */}
          {Object.entries(groupedItems).map(([category, items], categoryIndex) => (
            <div key={category} className="mb-6">
              {/* Category Label */}
              <div className="px-6 mb-3">
                <h3 className="text-xs font-semibold text-gray-500 dark:text-zinc-400 uppercase tracking-wider">
                  {categoryLabels[category as keyof typeof categoryLabels]}
                </h3>
              </div>
              
              {/* Navigation Items */}
              <div className="space-y-1">
                {items.map((item, itemIndex) => {
                  const Icon = item.icon;
                  const active = isActive(item.href);

                  return (
                    <Link
                      key={item.name}
                      href={item.href}
                      className={`
                        flex items-center space-x-3 px-6 py-3 mx-2 rounded-lg transition-all duration-200 font-medium group
                        ${
                          active
                            ? 'bg-black dark:bg-white text-white dark:text-black'
                            : 'text-gray-600 dark:text-zinc-300 hover:bg-gray-100 dark:hover:bg-zinc-800 hover:text-gray-900 dark:hover:text-zinc-100'
                        }
                        ${locale === 'ar' ? 'flex-row-reverse space-x-reverse' : ''}
                      `}
                      onClick={() => {
                        // Navigation link clicked
                      }}
                    >
                      <div className={`
                        flex items-center justify-center w-6 h-6 transition-colors duration-200
                        ${active
                          ? 'text-white dark:text-black'
                          : 'text-gray-500 dark:text-zinc-400 group-hover:text-gray-700 dark:group-hover:text-zinc-200'
                        }
                      `}>
                        {Icon({
                          className: 'w-5 h-5',
                        })}
                      </div>
                      <span className="font-medium text-sm">
                        {t(item.label) || item.name}
                      </span>
                    </Link>
                  );
                })}
              </div>
              
              {/* Separator */}
              {categoryIndex < Object.keys(groupedItems).length - 1 && (
                <div className="mx-6 mt-4 mb-2">
                  <div className="h-px bg-gray-200 dark:bg-zinc-700"></div>
                </div>
              )}
            </div>
          ))}
        </nav>
      </div>
    </>
  );
};

export default AdminSidebar;
