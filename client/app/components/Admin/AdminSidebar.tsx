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
  HiChatBubbleLeftRight
} from 'react-icons/hi2';

interface AdminSidebarProps {}

const AdminSidebar: React.FC<AdminSidebarProps> = () => {
  const { t, locale } = useLanguage();
  const pathname = usePathname();

  const navigationItems = [
    {
      name: 'Dashboard',
      href: '/admin',
      icon: HiHome,
      label: 'admin.sidebar.dashboard'
    },
    {
      name: 'Customers',
      href: '/admin/customers',
      icon: HiUsers,
      label: 'admin.sidebar.customers'
    },
    {
      name: 'Products',
      href: '/admin/products',
      icon: HiCube,
      label: 'admin.sidebar.products'
    },
    {
      name: 'Orders',
      href: '/admin/orders',
      icon: HiShoppingCart,
      label: 'admin.sidebar.orders'
    },
    {
      name: 'Analytics',
      href: '/admin/analytics',
      icon: HiChartBar,
      label: 'admin.sidebar.analytics'
    },
    {
      name: 'Customer Support',
      href: '/admin/support',
      icon: HiChatBubbleLeftRight,
      label: 'admin.sidebar.support'
    }
  ];

  const isActive = (href: string) => {
    if (href === '/admin') {
      return pathname === '/admin';
    }
    return pathname.startsWith(href);
  };

  return (
    <>
      {/* Sidebar - Hidden on mobile, visible on desktop */}
      <div className={`
        fixed top-14 min-h-[calc(100vh-3rem)] bg-white dark:bg-dark-surface text-black dark:text-white transition-transform duration-300 ease-in-out
        hidden lg:block
        w-64 shadow-sm dark:shadow-gray-900/20
        ${locale === 'ar' ? 'right-0' : 'left-0'}
      `}>
        {/* Navigation */}
        <nav>
          {navigationItems.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.href);
            
            return (
              <Link
                key={item.name}
                href={item.href}
                className={`
                  flex items-center space-x-3 px-4 py-3 transition-all duration-200 font-medium
                  ${active 
                    ? 'bg-black dark:bg-white text-white dark:text-black' 
                    : 'text-gray-600 dark:text-zinc-300 hover:bg-gray-200 dark:hover:bg-zinc-700'
                  }
                  ${locale === 'ar' ? 'flex-row-reverse space-x-reverse' : ''}
                `}
                onClick={() => {
                  // Navigation link clicked
                }}
              >
                {Icon({ className: `w-5 h-5 ${active ? 'text-white dark:text-black' : 'text-gray-500 dark:text-zinc-400'}` })}
                <span className="font-medium">{t(item.label) || item.name}</span>
              </Link>
            );
          })}
        </nav>
      </div>
    </>
  );
};

export default AdminSidebar; 
