'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useLanguage } from '../../contexts/LanguageContext';
import { useAuth } from '../../contexts/AuthContext';
import {
  HiHome,
  HiUsers,
  HiCube,
  HiShoppingCart,
  HiChartBar,
  HiUserPlus,
  HiChevronDown,
  HiChevronRight,
} from 'react-icons/hi2';

interface AdminSidebarProps {}

const AdminSidebar: React.FC<AdminSidebarProps> = () => {
  const { t, locale } = useLanguage();
  const { isSuperAdmin } = useAuth();
  const pathname = usePathname();
  const [expandedSections, setExpandedSections] = useState<
    Record<string, boolean>
  >({
    admins: false,
  });

  const toggleSection = (section: string) => {
    setExpandedSections((prev) => ({
      ...prev,
      [section]: !prev[section],
    }));
  };

  const navigationItems: Array<{
    name: string;
    href?: string;
    icon: any;
    label: string;
    isStandalone?: boolean;
    category?: string;
    requiresSuperAdmin?: boolean;
    isExpandable?: boolean;
    expandableKey?: string;
    subItems?: Array<{
      name: string;
      href: string;
      icon: any;
      label: string;
      requiresSuperAdmin?: boolean;
    }>;
  }> = [
    {
      name: 'Dashboard',
      href: '/admin',
      icon: HiHome,
      label: 'admin.sidebar.dashboard',
      isStandalone: true,
    },
    {
      name: 'Admins',
      href: '#',
      icon: HiUsers,
      label: 'admin.sidebar.admins',
      category: 'management',
      requiresSuperAdmin: true,
      isExpandable: true,
      expandableKey: 'admins',
      subItems: [
        {
          name: 'Add Admin',
          href: '/admin/add-admin',
          icon: HiUserPlus,
          label: 'admin.sidebar.addAdmin',
          requiresSuperAdmin: true,
        },
      ],
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
  ];

  const isActive = (href: string | undefined) => {
    if (!href) return false;
    if (href === '/admin') {
      return pathname === '/admin';
    }
    return pathname.startsWith(href);
  };

  // Filter items based on user permissions
  const filteredItems = navigationItems.filter((item) => {
    if (item.requiresSuperAdmin) {
      return isSuperAdmin();
    }
    return true;
  });

  const standaloneItems = filteredItems.filter((item) => item.isStandalone);
  const groupedItems = filteredItems
    .filter((item) => !item.isStandalone && item.category)
    .reduce((acc, item) => {
      if (!acc[item.category!]) {
        acc[item.category!] = [];
      }
      acc[item.category!].push(item);
      return acc;
    }, {} as Record<string, typeof navigationItems>);

  const categoryLabels = {
    management: t('admin.sidebar.categories.management'),
    insights: t('admin.sidebar.categories.insights'),
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
        <nav className="py-4 h-full overflow-y-auto">
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
                      href={item.href || '#'}
                      className={`
                        flex items-center space-x-3 px-6 py-3 mx-2 rounded-lg transition-all duration-200 font-medium group
                        ${
                          active
                            ? 'bg-black dark:bg-white text-white dark:text-black'
                            : 'text-gray-600 dark:text-zinc-300 hover:bg-gray-100 dark:hover:bg-zinc-800 hover:text-gray-900 dark:hover:text-zinc-100'
                        }
                        ${
                          locale === 'ar'
                            ? 'flex-row-reverse space-x-reverse'
                            : ''
                        }
                      `}
                      onClick={() => {
                        // Navigation link clicked
                      }}
                    >
                      <div
                        className={`
                        flex items-center justify-center w-6 h-6 transition-colors duration-200
                        ${
                          active
                            ? 'text-white dark:text-black'
                            : 'text-gray-500 dark:text-zinc-400 group-hover:text-gray-700 dark:group-hover:text-zinc-200'
                        }
                      `}
                      >
                        <Icon className="w-5 h-5" />
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
          {Object.entries(groupedItems).map(
            ([category, items], categoryIndex) => (
              <div key={category} className="mb-6">
                {/* Category Label */}
                <div className="px-6 mb-3">
                  <h3
                    className={`text-xs font-semibold text-gray-500 dark:text-zinc-400 uppercase tracking-wider ${
                      locale === 'ar' ? 'text-right' : 'text-left'
                    }`}
                  >
                    {categoryLabels[category as keyof typeof categoryLabels]}
                  </h3>
                </div>

                {/* Navigation Items */}
                <div className="space-y-1">
                  {items.map((item) => {
                    const Icon = item.icon;
                    const active = isActive(item.href);

                    // Handle expandable items
                    if (item.isExpandable) {
                      const isExpanded = expandedSections[item.expandableKey!];

                      return (
                        <div key={item.name} className="mx-2">
                          {/* Expandable Header */}
                          <button
                            onClick={() => toggleSection(item.expandableKey!)}
                            className={`
                            w-full flex items-center justify-between px-6 py-3 rounded-lg transition-all duration-200 font-medium group
                            text-gray-600 dark:text-zinc-300 hover:bg-gray-100 dark:hover:bg-zinc-800 hover:text-gray-900 dark:hover:text-zinc-100
                            ${locale === 'ar' ? 'flex-row-reverse' : ''}
                          `}
                          >
                            <div
                              className={`flex items-center space-x-3 ${
                                locale === 'ar'
                                  ? 'flex-row-reverse space-x-reverse'
                                  : ''
                              }`}
                            >
                              <div className="flex items-center justify-center w-6 h-6 transition-colors duration-200 text-gray-500 dark:text-zinc-400 group-hover:text-gray-700 dark:group-hover:text-zinc-200">
                                <Icon className="w-5 h-5" />
                              </div>
                              <span className="font-medium text-sm">
                                {t(item.label) || item.name}
                              </span>
                            </div>
                            <div className="flex items-center justify-center w-4 h-4 transition-colors duration-200 text-gray-400 dark:text-zinc-500 group-hover:text-gray-600 dark:group-hover:text-zinc-300">
                              {isExpanded &&
                                React.createElement(HiChevronDown as any, {
                                  className: 'w-4 h-4',
                                })}
                              {!isExpanded &&
                                React.createElement(HiChevronRight as any, {
                                  className: 'w-4 h-4',
                                })}
                            </div>
                          </button>

                          {/* Sub Items */}
                          {isExpanded && item.subItems && (
                            <div className="ml-4 space-y-1">
                              {item.subItems.map((subItem) => {
                                const SubIcon = subItem.icon;
                                const subActive = isActive(subItem.href);

                                return (
                                  <Link
                                    key={subItem.name}
                                    href={subItem.href}
                                    className={`
                                    flex items-center space-x-3 px-6 py-2 rounded-lg transition-all duration-200 font-medium group
                                    ${
                                      subActive
                                        ? 'bg-black dark:bg-white text-white dark:text-black'
                                        : 'text-gray-600 dark:text-zinc-300 hover:bg-gray-100 dark:hover:bg-zinc-800 hover:text-gray-900 dark:hover:text-zinc-100'
                                    }
                                    ${
                                      locale === 'ar'
                                        ? 'flex-row-reverse space-x-reverse'
                                        : ''
                                    }
                                  `}
                                  >
                                    <div
                                      className={`
                                    flex items-center justify-center w-5 h-5 transition-colors duration-200
                                    ${
                                      subActive
                                        ? 'text-white dark:text-black'
                                        : 'text-gray-500 dark:text-zinc-400 group-hover:text-gray-700 dark:group-hover:text-zinc-200'
                                    }
                                  `}
                                    >
                                      <SubIcon className="w-4 h-4" />
                                    </div>
                                    <span className="font-medium text-sm">
                                      {t(subItem.label) || subItem.name}
                                    </span>
                                  </Link>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      );
                    }

                    // Handle regular items
                    return (
                      <Link
                        key={item.name}
                        href={item.href || '#'}
                        className={`
                        flex items-center space-x-3 px-6 py-3 mx-2 rounded-lg transition-all duration-200 font-medium group
                        ${
                          active
                            ? 'bg-black dark:bg-white text-white dark:text-black'
                            : 'text-gray-600 dark:text-zinc-300 hover:bg-gray-100 dark:hover:bg-zinc-800 hover:text-gray-900 dark:hover:text-zinc-100'
                        }
                        ${
                          locale === 'ar'
                            ? 'flex-row-reverse space-x-reverse'
                            : ''
                        }
                      `}
                        onClick={() => {
                          // Navigation link clicked
                        }}
                      >
                        <div
                          className={`
                        flex items-center justify-center w-6 h-6 transition-colors duration-200
                        ${
                          active
                            ? 'text-white dark:text-black'
                            : 'text-gray-500 dark:text-zinc-400 group-hover:text-gray-700 dark:group-hover:text-zinc-200'
                        }
                      `}
                        >
                          <Icon className="w-5 h-5" />
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
            )
          )}
        </nav>
      </div>
    </>
  );
};

export default AdminSidebar;
