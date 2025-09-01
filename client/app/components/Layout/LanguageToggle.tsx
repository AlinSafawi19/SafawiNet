'use client';

import React from 'react';
import { useLanguage } from '../../contexts/LanguageContext';

const LanguageToggle = () => {
    const { locale, setLocale, t } = useLanguage();

    const toggleLanguage = () => {
        const newLocale = locale === 'en' ? 'ar' : 'en';
        setLocale(newLocale);
    };

    return (
        <button
            onClick={toggleLanguage}
            className="flex items-center space-x-2 hover:text-purple-500 transition-colors"
            aria-label={t('header.actions.toggleLanguage')}
        >
            <span className="text-sm font-medium">
                {locale === 'en' ? 'AR' : 'EN'}
            </span>
        </button>
    );
};

export default LanguageToggle;
