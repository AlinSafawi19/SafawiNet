'use client';

import React from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { LoadingPage } from '../components/LoadingPage';
import { useLanguage } from '../contexts/LanguageContext';
import Link from 'next/link';
import { ParallaxImage } from '../components/ParallaxImage';
import {
  HiShieldCheck,
  HiStar,
  HiMapPin,
  HiShoppingBag,
  HiCreditCard,
  HiDevicePhoneMobile,
} from 'react-icons/hi2';

export default function MyAccountPage() {
  const { user, isLoading } = useAuth();
  const { t, locale } = useLanguage();
  const router = useRouter();

  // Prefetch login security page immediately when component mounts
  useEffect(() => {
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
    <div
      className={`min-h-screen flex flex-col lg:flex-row bg-zinc-900 ${
        locale === 'ar' ? 'rtl' : 'ltr'
      }`}
    >
      {/* Left side - Dashboard Tiles */}
      <div className="flex-1 lg:basis-1/2 flex items-center justify-center px-3 sm:px-4 md:px-6 lg:px-8 xl:px-10 py-3 sm:py-4 md:py-6 lg:py-8 xl:py-10">
        {/* Dashboard Tiles */}
        <div className="dashboard-grid flex-1">
          <Link
            href="/account/login-security"
            className="dashboard-tile tile-security group block"
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
            }}
          >
            <div className="tile-content">
              <div className="tile-icon">
                {HiShieldCheck({ className: 'w-6 h-6' })}
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
          </Link>

          <div
            className="dashboard-tile tile-sessions group"
            onClick={() => {
              router.push('/account/sessions');
            }}
          >
            <div className="tile-content">
              <div className="tile-icon">
                {HiDevicePhoneMobile({ className: 'w-6 h-6' })}
              </div>
              <div className="tile-text">
                <h3 className="tile-title">{t('account.sessions')}</h3>
                <p className="tile-description">{t('account.sessionsDesc')}</p>
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
                {HiStar({ className: 'w-6 h-6' })}
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
                {HiMapPin({ className: 'w-6 h-6' })}
              </div>
              <div className="tile-text">
                <h3 className="tile-title">{t('account.addresses')}</h3>
                <p className="tile-description">{t('account.addressesDesc')}</p>
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
                {HiShoppingBag({ className: 'w-6 h-6' })}
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
                {HiCreditCard({ className: 'w-6 h-6' })}
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

      {/* Right side - Image with Parallax */}
      <ParallaxImage
        src="https://static.wixstatic.com/media/503ea4_ed9a38760ae04aab86b47e82525fdcac~mv2.jpg/v1/fill/w_918,h_585,al_c,q_85,usm_0.66_1.00_0.01,enc_auto/503ea4_ed9a38760ae04aab86b47e82525fdcac~mv2.jpg"
        alt={t('auth.hero.imageAlt')}
        title={t('account.title')}
        subtitle={t('account.subtitle')}
      />
    </div>
  );
}
