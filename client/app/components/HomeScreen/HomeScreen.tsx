'use client';

import Image from 'next/image';
import { useLanguage } from '../../contexts/LanguageContext';
import { useAuth } from '../../contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { useEffect, useState, useRef } from 'react';
import { LoadingPage } from '../LoadingPage';

export function HomeScreen() {
  const { t, locale } = useLanguage();
  const { user, isLoading } = useAuth();
  const router = useRouter();
  const [isRedirecting, setIsRedirecting] = useState(false);

  // Performance logging
  const homeStartTime = useRef(Date.now());
  const homeLog = (message: string, data?: any) => {
    const elapsed = Date.now() - homeStartTime.current;
    console.log(`🏠 [HomeScreen] ${message}`, data ? { ...data, elapsed: `${elapsed}ms` } : `(${elapsed}ms)`);
  };

  useEffect(() => {
    homeLog('HomeScreen useEffect started', { isLoading, hasUser: !!user, isAdmin: user?.roles?.includes('ADMIN') });
    // Redirect admin users to admin dashboard
    if (!isLoading && user && user.roles && user.roles.includes('ADMIN')) {
      homeLog('Redirecting admin user to admin dashboard');
      setIsRedirecting(true);
      router.push('/admin');
    } else {
      homeLog('No redirect needed');
    }
  }, [user, isLoading, router]);

  // Show loading page while redirecting
  if (isRedirecting) {
    homeLog('Showing loading page for redirect');
    return <LoadingPage />;
  }

  // Only log when significant values change
  useEffect(() => {
    homeLog('HomeScreen state changed', { locale, hasUser: !!user, isLoading });
  }, [locale, user, isLoading]);
  
  return (
    <div className="home-screen mx-auto relative">
      <div className="relative">
        <div className="flex sm:flex-row flex-col bg-zinc-900">
          <div
            className={`basis-1/2 text-center sm:text-left relative ${
              locale === 'ar' ? 'sm:text-right' : ''
            }`}
          >
            <div className="px-6 sm:px-10 lg:px-14 py-6 bg-site">
              <h1
                className={`text-4xl sm:text-6xl lg:text-[120px] leading-tight sm:leading-none animate-fade-in font-bold text-black${
                  locale === 'ar' ? 'text-right' : ''
                }`}
              >
                <span className="block">{t('home.hero.title.line1')}</span>
                <span className="block">{t('home.hero.title.line2')}</span>
                <span className="block">{t('home.hero.title.line3')}</span>
              </h1>
              <h3
                className={`text-sm sm:text-base lg:text-2xl py-4 sm:py-6 text-black ${
                  locale === 'ar' ? 'text-right' : ''
                }`}
              >
                {locale === 'ar' ? (
                  <>
                    <span className="text-purple-500">SAFAWI NET</span>{' '}
                    {t('home.hero.subtitle')}
                  </>
                ) : (
                  <>
                    {t('home.hero.subtitle')}{' '}
                    <span className="text-purple-500">SAFAWI NET</span>
                  </>
                )}
              </h3>
              <div
                className={`flex justify-center sm:justify-start mt-2 ${
                  locale === 'ar' ? 'sm:justify-end' : ''
                }`}
              >
                <button type="button" className="bg-black text-white font-semibold py-3 px-6 sm:px-8 rounded-lg hover:shadow-lg hover:shadow-purple-500/25 transition-all duration-300 text-sm sm:text-base">
                  {t('home.hero.cta')}
                </button>
              </div>
            </div>
            <div className="bg-zinc-900 h-[75px] w-full"></div>
          </div>
          <div className="basis-1/2">
            <Image
              src="https://static.wixstatic.com/media/503ea4_ed9a38760ae04aab86b47e82525fdcac~mv2.jpg/v1/fill/w_918,h_585,al_c,q_85,usm_0.66_1.00_0.01,enc_auto/503ea4_ed9a38760ae04aab86b47e82525fdcac~mv2.jpg"
              alt="SAFAWI NET Hero Image"
              className="w-full px-10 sm:px-0"
              width={1000}
              height={800}
              priority={true}
              loading="eager"
              placeholder="blur"
              blurDataURL="data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAYEBQYFBAYGBQYHBwYIChAKCgkJChQODwwQFxQYGBcUFhYaHSUfGhsjHBYWICwgIyYnKSopGR8tMC0oMCUoKSj/2wBDAQcHBwoIChMKChMoGhYaKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCj/wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAv/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAX/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIRAxEAPwCdABmX/9k="
            />
          </div>
        </div>
        <Image
          className={`absolute bottom-0 top-[20%] hidden sm:block inset-x-2/4 -translate-y-[20%] -translate-x-2/4`}
          src="https://static.wixstatic.com/media/c22c23_14f3a617cd684341b51dd1a3962c856e~mv2.png/v1/fill/w_202,h_245,al_c,q_85,usm_0.66_1.00_0.01,enc_auto/c22c23_14f3a617cd684341b51dd1a3962c856e~mv2.png"
          alt="SAFAWI NET Logo"
          width={202}
          height={245}
          priority={false}
          loading="lazy"
          placeholder="blur"
          blurDataURL="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg=="
        />
      </div>

      {/* about me */}
      <div className="bg-zinc-900 text-site pt-16 sm:p-20">
        <div className="max-w-4xl mx-auto text-center">
          <div
            className={`text-lg sm:text-xl text-white/90 font-default tracking-wide leading-relaxed px-6 sm:px-8 ${
              locale === 'ar' ? 'text-right' : ''
            }`}
          ></div>
        </div>
      </div>
    </div>
  );
}
