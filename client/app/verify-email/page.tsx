'use client';

import { useEffect, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { HiCheckCircle, HiXCircle, HiExclamationTriangle } from 'react-icons/hi2';
import { useLanguage } from '../contexts/LanguageContext';
import Link from 'next/link';

interface VerificationState {
    status: 'verifying' | 'success' | 'error' | 'invalid';
    message: string;
    messageKey?: string;
}

export default function VerifyEmailPage() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const { t } = useLanguage();
    const [verificationState, setVerificationState] = useState<VerificationState>({
        status: 'verifying',
        message: t('verifyEmail.verifyingMessage')
    });

    // Helper function to map server messages to translation keys
    const mapServerMessageToTranslationKey = (serverMessage: string): string | null => {
        const messageMapping: { [key: string]: string } = {
            'Email verified successfully': 'auth.messages.emailVerified',
            'Invalid or expired verification token': 'auth.messages.invalidVerificationToken',
        };
        
        return messageMapping[serverMessage] || null;
    };

    useEffect(() => {
        const verifyEmail = async () => {
            const token = searchParams.get('token');

            if (!token) {
                setVerificationState({
                    status: 'invalid',
                    message: t('verifyEmail.invalidLinkMessage')
                });
                return;
            }

            try {
                const response = await fetch('http://localhost:3000/v1/auth/verify-email', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    credentials: 'include',
                    body: JSON.stringify({ token }),
                });

                if (response.ok) {
                    const successData = await response.json();
                    // Map server success message to translation key
                    const messageKey = mapServerMessageToTranslationKey(successData.message);
                    setVerificationState({
                        status: 'success',
                        message: messageKey ? t(messageKey) : successData.message,
                        messageKey: messageKey || undefined
                    });

                    // Redirect to login page after 3 seconds
                    setTimeout(() => {
                        router.push('/auth');
                    }, 3000);
                } else {
                    const errorData = await response.json();
                    // Map server error message to translation key
                    const messageKey = mapServerMessageToTranslationKey(errorData.message);
                    setVerificationState({
                        status: 'error',
                        message: messageKey ? t(messageKey) : errorData.message,
                        messageKey: messageKey || undefined
                    });
                }
            } catch (error) {
                setVerificationState({
                    status: 'error',
                    message: t('verifyEmail.errorMessage')
                });
            }
        };

        verifyEmail();
    }, [searchParams, router, t]);

    const getStatusIcon = () => {
        switch (verificationState.status) {
            case 'verifying':
                return <>{HiExclamationTriangle({ className: "w-16 h-16 text-yellow-500 animate-pulse" })}</>;
            case 'success':
                return <>{HiCheckCircle({ className: "w-16 h-16 text-green-500" })}</>;
            case 'error':
            case 'invalid':
                return <>{HiXCircle({ className: "w-16 h-16 text-red-500" })}</>;
            default:
                return null;
        }
    };

    return (
        <div className="flex items-center justify-center px-4 pt-10">
            <div className="max-w-md w-full text-center">
                <div className="flex justify-center mb-6">
                    {getStatusIcon()}
                </div>

                <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">
                    {verificationState.status === 'verifying' && t('verifyEmail.verifying')}
                    {verificationState.status === 'success' && t('verifyEmail.success')}
                    {verificationState.status === 'error' && t('verifyEmail.failed')}
                    {verificationState.status === 'invalid' && t('verifyEmail.invalidLink')}
                </h1>

                <p className="text-gray-600 dark:text-gray-300 mb-8">
                    {verificationState.message}
                </p>

                {verificationState.status === 'success' && (
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                        {t('verifyEmail.redirecting')}
                    </p>
                )}

                {verificationState.status === 'error' && (
                    <button
                        onClick={() => window.location.reload()}
                        className="bg-black dark:bg-white text-white dark:text-black font-semibold py-3 px-6 sm:px-8 rounded-lg hover:shadow-lg hover:shadow-purple-500/25 transition-all duration-300 text-sm sm:text-base"
                    >
                        {t('verifyEmail.tryAgain')}
                    </button>
                )}

                {verificationState.status === 'invalid' && (
                    <Link
                        href="/auth"
                        className="inline-block bg-black dark:bg-white text-white dark:text-black font-semibold py-3 px-6 sm:px-8 rounded-lg hover:shadow-lg hover:shadow-purple-500/25 transition-all duration-300 text-sm sm:text-base"
                    >
                        {t('verifyEmail.goToLogin')}
                    </Link>
                )}

                {verificationState.status === 'verifying' && (
                    <div className="animate-spin rounded-full h-8 w-8 border-2 border-purple-600 border-t-transparent mx-auto"></div>
                )}
            </div>
        </div>
    );
}
