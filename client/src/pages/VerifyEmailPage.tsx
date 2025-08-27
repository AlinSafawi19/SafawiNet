import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { HiCheckCircle, HiXCircle, HiChevronRight } from 'react-icons/hi';
import { apiService } from '../services/api';

const VerifyEmailPage: React.FC = () => {
    const { t } = useTranslation();
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const [verificationState, setVerificationState] = useState<'verifying' | 'success' | 'error'>('verifying');
    const [error, setError] = useState('');
    const [countdown, setCountdown] = useState(5);

    useEffect(() => {
        const token = searchParams.get('token');

        if (!token) {
            setError('No verification token provided');
            setVerificationState('error');
            return;
        }

        const verifyEmail = async () => {
            try {
                await apiService.verifyEmail(token);
                setVerificationState('success');

                // Start countdown to redirect
                const timer = setInterval(() => {
                    setCountdown((prev) => {
                        if (prev <= 1) {
                            clearInterval(timer);
                            navigate('/');
                        }
                        return prev - 1;
                    });
                }, 1000);

                return () => clearInterval(timer);
            } catch (error) {
                setError(error instanceof Error ? error.message : 'Verification failed');
                setVerificationState('error');
            }
        };

        verifyEmail();
    }, [searchParams, navigate]);

    const handleManualRedirect = () => {
        navigate('/');
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-50 to-white dark:from-gray-800 dark:to-gray-900 py-16 px-4 sm:px-6 lg:px-8 transition-colors duration-200">
            <div className="max-w-7xl mx-auto">
                {/* Breadcrumb */}
                <nav className="mb-12">
                    <ol className="flex items-center space-x-3 text-sm text-gray-500 dark:text-gray-400 font-light">
                        <li>
                            <a href="/" className="hover:text-red-500 transition-colors duration-300 relative group">
                                {t('navigation.home')}
                                <span className="absolute bottom-0 left-0 w-0 h-0.5 bg-red-500 transition-all duration-300 ease-out group-hover:w-full"></span>
                            </a>
                        </li>
                        <li className="text-gray-300 dark:text-gray-500"><HiChevronRight className="w-4 h-4" /></li>
                        <li className="text-gray-900 dark:text-white font-light">{t('emailVerification.title')}</li>
                    </ol>
                </nav>

                {/* Main Content */}
                <div className="bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-none shadow-sm overflow-hidden transition-colors duration-200">
                    <div className="p-12 lg:p-16">
                        <div className="max-w-2xl mx-auto text-center">
                            {verificationState === 'verifying' && (
                                <div className="mb-8">
                                    <div className="inline-block mb-4">
                                        <span className="text-red-500 text-sm font-light tracking-widest uppercase border-b border-red-200 dark:border-red-800 pb-2">
                                            {t('emailVerification.verifyingEmail')}
                                        </span>
                                    </div>
                                    <h2 className="text-4xl lg:text-5xl font-extralight text-gray-900 dark:text-white leading-tight tracking-wide mb-4">
                                        {t('emailVerification.pleaseWait')}
                                    </h2>
                                    <p className="text-gray-600 dark:text-gray-300 font-light leading-relaxed">
                                        {t('emailVerification.verifyingDescription')}
                                    </p>
                                    <div className="mt-8">
                                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-500 mx-auto"></div>
                                    </div>
                                </div>
                            )}

                            {verificationState === 'success' && (
                                <div className="mb-8">
                                    <div className="inline-block mb-4">
                                        <span className="text-green-500 text-sm font-light tracking-widest uppercase border-b border-green-200 dark:border-green-800 pb-2">
                                            {t('emailVerification.success')}
                                        </span>
                                    </div>
                                    <div className="mb-6">
                                        <HiCheckCircle className="w-20 h-20 text-green-500 mx-auto" />
                                    </div>
                                    <h2 className="text-4xl lg:text-5xl font-extralight text-gray-900 dark:text-white leading-tight tracking-wide mb-4">
                                        {t('emailVerification.emailVerified')}
                                    </h2>
                                    <p className="text-gray-600 dark:text-gray-300 font-light leading-relaxed mb-8">
                                        {t('emailVerification.verificationSuccessDescription')}
                                    </p>
                                    <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 p-6 mb-8">
                                        <p className="text-green-800 dark:text-green-200 font-light">
                                            {t('emailVerification.redirectingHome', { countdown })}
                                        </p>
                                    </div>
                                    <button
                                        onClick={handleManualRedirect}
                                        className="bg-transparent border border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white py-3 px-8 font-light tracking-wide hover:border-red-500 hover:text-red-500 transition-all duration-300"
                                    >
                                        {t('emailVerification.redirectNow')}
                                    </button>
                                </div>
                            )}

                            {verificationState === 'error' && (
                                <div className="mb-8">
                                    <div className="inline-block mb-4">
                                        <span className="text-red-500 text-sm font-light tracking-widest uppercase border-b border-red-200 dark:border-red-800 pb-2">
                                            {t('emailVerification.verificationFailed')}
                                        </span>
                                    </div>
                                    <div className="mb-6">
                                        <HiXCircle className="w-20 h-20 text-red-500 mx-auto" />
                                    </div>
                                    <h2 className="text-4xl lg:text-5xl font-extralight text-gray-900 dark:text-white leading-tight tracking-wide mb-4">
                                        {t('emailVerification.verificationFailed')}
                                    </h2>
                                    <p className="text-gray-600 dark:text-gray-300 font-light leading-relaxed mb-8">
                                        {error}
                                    </p>
                                    <div className="space-y-4">
                                        <button
                                            onClick={() => navigate('/my-account')}
                                            className="w-full bg-transparent border border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white py-3 px-8 font-light tracking-wide hover:border-red-500 hover:text-red-500 transition-all duration-300"
                                        >
                                            {t('navigation.myAccount')}
                                        </button>
                                        <button
                                            onClick={() => navigate('/')}
                                            className="w-full bg-transparent border border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white py-3 px-8 font-light tracking-wide hover:border-red-500 hover:text-red-500 transition-all duration-300"
                                        >
                                            {t('navigation.home')}
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default VerifyEmailPage;
