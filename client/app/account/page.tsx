'use client';

import React from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useRouter, usePathname } from 'next/navigation';
import { useEffect } from 'react';
import { LoadingPage } from '../components/LoadingPage';
import { useLanguage } from '../contexts/LanguageContext';
import { Breadcrumb, useBreadcrumbItems } from '../components/Breadcrumb';
import Link from 'next/link';
import {
  HiShieldCheck,
  HiUser,
  HiStar,
  HiMapPin,
  HiShoppingBag,
  HiCreditCard,
} from 'react-icons/hi2';

export default function MyAccountPage() {
  const { user, isLoading } = useAuth();
  const { t, locale } = useLanguage();
  const router = useRouter();
  const pathname = usePathname();

  // Generate breadcrumb items - must be called before any conditional returns
  const breadcrumbItems = useBreadcrumbItems(pathname, t, locale);

  // Prefetch profile settings and login security pages immediately when component mounts
  useEffect(() => {
    router.prefetch('/account/profile-settings');
    router.prefetch('/account/login-security');
  }, [router]);

  useEffect(() => {
    // Redirect unauthenticated users to login
    if (!isLoading && !user) {
      router.push('/auth');
    }
  }, [user, isLoading, router]);

  // Show loading page only briefly while checking authentication
  if (isLoading) {
    return <LoadingPage />;
  }

  // Don't render anything if user is not authenticated (will redirect)
  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen account-bg">
      {/* Main Content Area */}
      <div className="p-4 sm:p-6 lg:p-8 xl:p-12">
        <div className="account max-w-4xl mx-auto">
          {/* Breadcrumb */}
          <div
            className={`mb-6 ${
              locale === 'ar' ? 'text-right flex justify-end' : 'text-left'
            }`}
          >
            <Breadcrumb items={breadcrumbItems} />
          </div>

          <h1
            className={`text-xl sm:text-2xl md:text-3xl lg:text-4xl font-bold text-white mb-3 ${
              locale === 'ar' ? 'text-right' : 'text-left'
            }`}
          >
            {t('account.title')}
          </h1>
          <p
            className={`text-sm sm:text-base text-gray-300 mb-6 ${
              locale === 'ar' ? 'text-right' : 'text-left'
            }`}
          >
            {t('account.subtitle')}
          </p>

          {/* Dashboard Tiles */}
          <div className="dashboard-grid">
            <Link
              href="/account/profile-settings"
              className="dashboard-tile tile-profile group block"
              onMouseEnter={() => {
                // Prefetch on hover for faster navigation
                router.prefetch('/account/profile-settings');
              }}
              onClick={(e) => {
                const startTime = performance.now();
                console.log('🚀 Account: Profile settings clicked at', startTime);
                
                // Add immediate visual feedback
                const element = e.currentTarget as HTMLElement;
                element.style.transform = 'scale(0.98)';
                setTimeout(() => {
                  element.style.transform = '';
                }, 150);
              }}
            >
              <div className="tile-content">
                <div className="tile-icon">
                  {HiUser({ className: 'w-8 h-8' })}
                </div>
                <div className="tile-text">
                  <h3 className="tile-title">{t('account.profileSettings')}</h3>
                  <p className="tile-description">
                    {t('account.profileSettingsDesc')}
                  </p>
                </div>
              </div>
              <div className="tile-overlay"></div>
            </Link>

            <div
              className="dashboard-tile tile-security group"
              onMouseEnter={() => {
                // Prefetch on hover for faster navigation
                router.prefetch('/account/login-security');
              }}
              onClick={(e) => {
                const startTime = performance.now();
                console.log('🚀 Account: Login security clicked at', startTime);
                
                // Add immediate visual feedback
                const element = e.currentTarget as HTMLElement;
                element.style.transform = 'scale(0.98)';
                setTimeout(() => {
                  element.style.transform = '';
                }, 150);
                
                router.push('/account/login-security');
              }}
            >
              <div className="tile-content">
                <div className="tile-icon">
                  {HiShieldCheck({ className: 'w-8 h-8' })}
                </div>
                <div className="tile-text">
                  <h3 className="tile-title">
                    {t('account.loginSecurity.title')}
                  </h3>
                  <p className="tile-description">
                    {t('account.loginSecurityDesc')}
                  </p>
                </div>
              </div>
              <div className="tile-overlay"></div>
            </div>

            <div
              className="dashboard-tile tile-loyalty group"
              onClick={() => {
                router.push('/account/loyalty');
              }}
            >
              <div className="tile-content">
                <div className="tile-icon">
                  {HiStar({ className: 'w-8 h-8' })}
                </div>
                <div className="tile-text">
                  <h3 className="tile-title">{t('header.loyalty.title')}</h3>
                  <p className="tile-description">{t('account.loyaltyDesc')}</p>
                </div>
              </div>
              <div className="tile-overlay"></div>
            </div>

            <div
              className="dashboard-tile tile-addresses group"
              onClick={() => {
                router.push('/account/addresses');
              }}
            >
              <div className="tile-content">
                <div className="tile-icon">
                  {HiMapPin({ className: 'w-8 h-8' })}
                </div>
                <div className="tile-text">
                  <h3 className="tile-title">{t('account.addresses')}</h3>
                  <p className="tile-description">
                    {t('account.addressesDesc')}
                  </p>
                </div>
              </div>
              <div className="tile-overlay"></div>
            </div>

            <div
              className="dashboard-tile tile-orders group"
              onClick={() => {
                router.push('/account/orders');
              }}
            >
              <div className="tile-content">
                <div className="tile-icon">
                  {HiShoppingBag({ className: 'w-8 h-8' })}
                </div>
                <div className="tile-text">
                  <h3 className="tile-title">{t('account.orders')}</h3>
                  <p className="tile-description">{t('account.ordersDesc')}</p>
                </div>
              </div>
              <div className="tile-overlay"></div>
            </div>

            <div
              className="dashboard-tile tile-payment group"
              onClick={() => {
                router.push('/account/payment-methods');
              }}
            >
              <div className="tile-content">
                <div className="tile-icon">
                  {HiCreditCard({ className: 'w-8 h-8' })}
                </div>
                <div className="tile-text">
                  <h3 className="tile-title">{t('account.paymentMethods')}</h3>
                  <p className="tile-description">
                    {t('account.paymentMethodsDesc')}
                  </p>
                </div>
              </div>
              <div className="tile-overlay"></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
