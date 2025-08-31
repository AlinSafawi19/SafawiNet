'use client';

import { useEffect, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { HiCheckCircle, HiXCircle, HiExclamationTriangle } from 'react-icons/hi2';

interface VerificationState {
    status: 'verifying' | 'success' | 'error' | 'invalid';
    message: string;
}

export default function VerifyEmailPage() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const [verificationState, setVerificationState] = useState<VerificationState>({
        status: 'verifying',
        message: 'Verifying your email...'
    });

    useEffect(() => {
        const verifyEmail = async () => {
            const token = searchParams.get('token');

            if (!token) {
                setVerificationState({
                    status: 'invalid',
                    message: 'Invalid verification link. Please check your email and try again.'
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
                    setVerificationState({
                        status: 'success',
                        message: successData.message || 'Email verified successfully! You can now log in to your account.'
                    });

                    // Redirect to login page after 3 seconds
                    setTimeout(() => {
                        router.push('/auth');
                    }, 3000);
                } else {
                    const errorData = await response.json();
                    setVerificationState({
                        status: 'error',
                        message: errorData.message || 'Email verification failed. Please try again.'
                    });
                }
            } catch (error) {
                setVerificationState({
                    status: 'error',
                    message: 'An error occurred during verification. Please try again.'
                });
            }
        };

        verifyEmail();
    }, [searchParams, router]);

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

                <h1 className="text-3xl font-bold text-gray-900 mb-4">
                    {verificationState.status === 'verifying' && 'Verifying Email...'}
                    {verificationState.status === 'success' && 'Verification Successful!'}
                    {verificationState.status === 'error' && 'Verification Failed'}
                    {verificationState.status === 'invalid' && 'Invalid Link'}
                </h1>

                <p className="text-gray-600 mb-8">
                    {verificationState.message}
                </p>

                {verificationState.status === 'success' && (
                    <p className="text-sm text-gray-500">
                        Redirecting to login page in 3 seconds...
                    </p>
                )}

                {verificationState.status === 'error' && (
                    <button
                        onClick={() => window.location.reload()}
                        className="bg-black text-white font-semibold py-3 px-6 sm:px-8 rounded-lg hover:shadow-lg hover:shadow-purple-500/25 transition-all duration-300 text-sm sm:text-base"
                    >
                        Try Again
                    </button>
                )}

                {verificationState.status === 'invalid' && (
                    <a
                        href="/auth"
                        className="inline-block bg-black text-white font-semibold py-3 px-6 sm:px-8 rounded-lg hover:shadow-lg hover:shadow-purple-500/25 transition-all duration-300 text-sm sm:text-base"
                    >
                        Go to Login
                    </a>
                )}

                {verificationState.status === 'verifying' && (
                    <div className="animate-spin rounded-full h-8 w-8 border-2 border-purple-600 border-t-transparent mx-auto"></div>
                )}
            </div>
        </div>
    );
}
