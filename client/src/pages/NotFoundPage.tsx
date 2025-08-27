import React from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

const NotFoundPage: React.FC = () => {
  const { t } = useTranslation();
  
  return (
    <div className="min-h-screen bg-white dark:bg-gray-900 flex items-center justify-center px-4 sm:px-6 lg:px-8 transition-colors duration-200">
      <div className="max-w-lg w-full text-center">
        {/* 404 Number */}
        <div className="mb-12">
          <h1 className="text-8xl font-extralight text-gray-200 dark:text-gray-700 select-none tracking-wider">404</h1>
        </div>

        {/* Error Message */}
        <div className="mb-12">
          <h2 className="text-2xl font-light text-gray-900 dark:text-white mb-6 tracking-wide">
            {t('errors.notFound.title')}
          </h2>
          <p className="text-base text-gray-600 dark:text-gray-300 leading-relaxed font-light">
            {t('errors.notFound.description')}
          </p>
        </div>

        {/* Action Buttons */}
        <div className="space-y-4 mb-12">
          <Link
            to="/"
            className="group relative inline-flex items-center justify-center w-full px-8 py-4 bg-transparent border border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white font-light tracking-wide hover:border-red-500 transition-all duration-300 overflow-hidden"
          >
            <span className="relative z-10 group-hover:text-white transition-colors duration-300">
              {t('errors.notFound.returnHome')}
            </span>
            <div className="absolute inset-0 bg-red-500 transform scale-x-0 group-hover:scale-x-100 transition-transform duration-300 origin-left"></div>
          </Link>
          
          <button
            onClick={() => window.history.back()}
            className="w-full px-8 py-4 text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 font-light tracking-wide hover:border-gray-300 dark:hover:border-gray-500 transition-all duration-300"
          >
            {t('errors.notFound.goBack')}
          </button>
        </div>

        {/* Subtle Divider */}
        <div className="w-24 h-px bg-gray-200 dark:bg-gray-600 mx-auto mb-8"></div>

        {/* Helpful Links */}
        <div className="text-sm text-gray-500 dark:text-gray-400">
          <p className="mb-4 font-light">{t('errors.notFound.needAssistance')}</p>
          <div className="flex justify-center space-x-6">
                           <Link
                 to="/my-account"
                 className="text-red-500 hover:text-red-600 transition-colors duration-200 font-light tracking-wide"
               >
                 {t('navigation.myAccount')}
               </Link>
               <span className="text-gray-300 dark:text-gray-500">•</span>
               <Link
                 to="/"
                 className="text-red-500 hover:text-red-600 transition-colors duration-200 font-light tracking-wide"
               >
                 {t('navigation.home')}
               </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default NotFoundPage;
