'use client';

import React from 'react';
import { useLanguage } from '../../contexts/LanguageContext';

interface LanguageToggleProps {
    variant?: 'mobile' | 'desktop';
}

const LanguageToggle = ({ variant }: LanguageToggleProps) => {
    const { locale, setLocale, t } = useLanguage();

    const toggleLanguage = async () => {
        try {
            const newLocale = locale === 'en' ? 'ar' : 'en';
            await setLocale(newLocale);
        } catch (error) {
            console.error('Failed to toggle language:', error);
        }
    };

    return (
        <button
            onClick={toggleLanguage}
            className={`flex items-center space-x-2 hover:text-purple-500 transition-colors ${
                variant === 'mobile' 
                    ? 'border border-gray-300 rounded-lg px-3 py-2' 
                    : ''
            }`}
            aria-label={t('header.actions.toggleLanguage')}
        >
            <span className="text-sm font-medium">
                {locale === 'en' ? 'AR' : 'EN'}
            </span>
        </button>
    );
};

export default LanguageToggle;
