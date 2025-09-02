'use client';

import { useEffect, useState, useRef } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { HiCheckCircle, HiXCircle, HiExclamationTriangle } from 'react-icons/hi2';
import { useLanguage } from '../contexts/LanguageContext';
import { useAuth } from '../contexts/AuthContext';
import Link from 'next/link';
import { useSocket } from '../hooks/useSocket';

interface VerificationState {
    status: 'verifying' | 'success' | 'error' | 'invalid';
    message: string;
    messageKey?: string;
}

export default function VerifyEmailPage() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const { t } = useLanguage();
    const { loginWithTokens } = useAuth();
    const { connect, joinVerificationRoom, leaveVerificationRoom, on, off, onAuthBroadcast, offAuthBroadcast } = useSocket();
    const [verificationState, setVerificationState] = useState<VerificationState>({
        status: 'verifying',
        message: ''
    });
    const [userId, setUserId] = useState<string | null>(null);
    
    // Use useRef to prevent multiple API calls
    const hasVerifiedRef = useRef(false);

    // Update initial message when language context is ready
    useEffect(() => {
        setVerificationState(prev => ({
            ...prev,
            message: t('verifyEmail.verifyingMessage')
        }));
    }, [t]);

    // Helper function to map server messages to translation keys
    const mapServerMessageToTranslationKey = (serverMessage: string): string | null => {
        const messageMapping: { [key: string]: string } = {
            'Email verified successfully': 'verifyEmail.successMessage',
            'Invalid or expired verification token': 'auth.messages.invalidVerificationToken',
        };
        
        return messageMapping[serverMessage] || null;
    };

    useEffect(() => {
        // Prevent multiple verifications
        if (hasVerifiedRef.current) {
            return;
        }
        
        // Define the emailVerified callback function outside the async function
        let handleEmailVerified: ((data: { success: boolean; user: any; message: string }) => void) | null = null;
        let successData: any = null;

        // Define the auth broadcast handler
        const handleAuthBroadcast = (data: { type: string; user?: any }) => {
            if (data.type === 'login' && data.user) {
                
                // Check if user was on auth page - redirect to home, otherwise stay
                const currentPath = window.location.pathname;
                
                if (currentPath === '/auth' || currentPath.startsWith('/auth/')) {
                    setVerificationState({
                        status: 'success',
                        message: t('verifyEmail.successMessage'),
                    });
                    // Redirect to home page after 2 seconds
                    setTimeout(() => {
                        router.push('/');
                    }, 2000);
                } else {
                    // Update state to show success but don't redirect
                    setVerificationState({
                        status: 'success',
                        message: t('verifyEmail.successMessage'),
                    });
                    
                    // Show a temporary success message and then hide it
                    setTimeout(() => {
                        setVerificationState({
                            status: 'success',
                            message: t('verifyEmail.successMessage'),
                        });
                    }, 3000);
                    
                    // Hide the success message after 5 seconds
                    setTimeout(() => {
                        setVerificationState({
                            status: 'success',
                            message: '',
                        });
                    }, 5000);
                }
            }
        };

        // Set up auth broadcast listener for cross-device sync
        onAuthBroadcast(handleAuthBroadcast);

        const verifyEmail = async () => {
            
            const token = searchParams.get('token');

            if (!token) {
                setVerificationState({
                    status: 'invalid',
                    message: t('verifyEmail.invalidLinkMessage')
                });
                return;
            }

            // Define the emailVerified callback function
            handleEmailVerified = async (data: { success: boolean; user: any; message: string }) => {
                if (data.success && data.user && successData?.tokens) {
                                // Automatically log in the user
                                const loginResult = await loginWithTokens(successData.tokens);
                                if (loginResult.success) {
                                    setVerificationState({
                                        status: 'success',
                                        message: t('verifyEmail.successMessage'),
                                    });
                                    
                                    // Redirect to home page after 2 seconds
                                    setTimeout(() => {
                                        router.push('/');
                                    }, 2000);
                                }
                            }
            };

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
                    successData = await response.json();
                    
                    // Mark as verified to prevent multiple calls
                    hasVerifiedRef.current = true;
                    
                    // If we have tokens, automatically log in the user
                    if (successData.tokens && successData.user) {
                        const currentUserId = successData.user.id;
                        setUserId(currentUserId);
                        
                        // Map server success message to translation key
                        const messageKey = mapServerMessageToTranslationKey(successData.message);
                        setVerificationState({
                            status: 'success',
                            message: messageKey ? t(messageKey) : successData.message,
                            messageKey: messageKey || undefined
                        });

                        // Try to log in the user immediately with the verification tokens
                        
                        const loginResult = await loginWithTokens(successData.tokens);
                        
                        if (loginResult.success) {
                            
                            // Connect to socket and join verification room AFTER successful login
                            connect();
                            joinVerificationRoom(currentUserId);
                            
                            // Listen for verification success event
                            if (handleEmailVerified) {
                                on('emailVerified', handleEmailVerified);
                            }
                            
                            // Check cookies after login
                            
                            // Redirect to home page after successful login
                            setTimeout(() => {
                                router.push('/');
                            }, 2000);
                        } else {
                            // Fallback: wait for WebSocket event or redirect after 5 seconds
                            setTimeout(() => {
                                router.push('/');
                            }, 5000);
                        }
                    } else {
                        // Fallback to old behavior if no tokens
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
                    }
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

        // Cleanup function
        return () => {
            if (userId) {
                leaveVerificationRoom(userId);
                // Note: disconnect is handled by the useSocket hook
            }
            // Clean up the emailVerified event listener
            if (handleEmailVerified) {
                off('emailVerified', handleEmailVerified);
            }
            // Clean up the auth broadcast listener
            offAuthBroadcast(handleAuthBroadcast);
        };
    }, []); // Empty dependency array to run only once

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
