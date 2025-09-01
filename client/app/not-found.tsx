'use client';

import { useLanguage } from './contexts/LanguageContext';

export default function NotFound() {
    const { t } = useLanguage();

    return (
        <div className="min-h-screen flex items-center justify-center bg-site dark:bg-dark-bg">
            <div className="flex items-center">
                <h2 className="text-lg md:text-xl font-bold text-black dark:text-white">
                    {t('errors.404.title')}
                </h2>
                {/* divider */}
                <div className="w-px h-8 bg-gray-400 mx-4"></div>
                <h2 className="text-lg md:text-xl font-bold text-black dark:text-white">
                    {t('errors.404.message')}
                </h2>
            </div>
        </div>
    );
}
