'use client';

import React, { useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import Link from 'next/link';

export default function MyAccountPage() {
  const { user, isLoading } = useAuth();
  const router = useRouter();

  // Track router object changes
  const prevRouter = useRef(router);
  if (prevRouter.current !== router) {
    prevRouter.current = router;
  }

  // Log context values with detailed change tracking
  const prevValues = useRef<{
    user: any;
    isLoading: boolean;
  } | null>(null);

  const currentValues = {
    user: user ? { id: user.id, email: user.email, roles: user.roles } : null,
    isLoading,
  };

  if (prevValues.current) {
    const changes: string[] = [];
    if (
      JSON.stringify(prevValues.current.user) !==
      JSON.stringify(currentValues.user)
    ) {
      changes.push('user changed');
    }
    if (prevValues.current.isLoading !== currentValues.isLoading) {
      changes.push('isLoading changed');
    }
  }

  prevValues.current = currentValues;

  useEffect(() => {
    // Redirect unauthenticated users to login
    if (!isLoading && !user) {
      router.push('/auth');
    }
  }, [user, isLoading, router]);

  // Don't render anything if user is not authenticated (will redirect)
  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen">
      {/* Main Content Area */}
      <div className="p-3 sm:p-4 md:p-6 lg:p-8 xl:p-12">
        <div className="account max-w-4xl mx-auto">
          {/* Header Section */}
          <div className="w-full flex items-center justify-center px-3 sm:px-4 md:px-6 lg:px-8 xl:px-10 pt-8 pb-4">
            <div className="w-full max-w-6xl text-center">
              <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold text-gray-900 mb-4">
                {'My Account'}
              </h1>
              <p className="text-lg sm:text-xl text-gray-600 max-w-2xl mx-auto">
                {'Manage your account settings and preferences'}
              </p>
            </div>
          </div>

          {/* Account Sections Grid */}
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {[
              {
                id: 'login-security',
                title: 'Login & Security',
                description: 'Manage your login and security settings',
                href: '/account/login-security',
              },
              {
                id: 'sessions',
                title: 'Sessions',
                description: 'Manage your active device sessions',
                href: '/account/sessions',
              },
              {
                id: 'loyalty',
                title: 'Loyalty',
                description:
                  'View points, rewards, and loyalty program benefits',
                href: '/account/loyalty',
              },
              {
                id: 'addresses',
                title: 'Addresses',
                description: 'Manage shipping and billing addresses',
                href: '/account/addresses',
              },
              {
                id: 'orders',
                title: 'Orders',
                description: 'View order history and track shipments',
                href: '/account/orders',
              },
              {
                id: 'payment-methods',
                title: 'Payment Methods',
                description:
                  'Manage credit cards, bank accounts, and payment preferences',
                href: '/account/payment-methods',
              },
            ].map((section) => (
              <div
                key={section.id}
                className="bg-white rounded-lg border border-gray-200 shadow-sm hover:shadow-md transition-shadow duration-200 p-6 group"
              >
                <div className="flex flex-col h-full">
                  {/* Icon and Content */}
                  <div className="flex items-start mb-4 space-x-4">
                    <div className="flex-shrink-0">
                      <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                        {section.id === 'login-security' && (
                          <svg
                            className="w-5 h-5 text-purple-600"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
                            />
                          </svg>
                        )}
                        {section.id === 'sessions' && (
                          <svg
                            className="w-5 h-5 text-purple-600"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z"
                            />
                          </svg>
                        )}
                        {section.id === 'loyalty' && (
                          <svg
                            className="w-5 h-5 text-purple-600"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z"
                            />
                          </svg>
                        )}
                        {section.id === 'addresses' && (
                          <svg
                            className="w-5 h-5 text-purple-600"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
                            />
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
                            />
                          </svg>
                        )}
                        {section.id === 'orders' && (
                          <svg
                            className="w-5 h-5 text-purple-600"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z"
                            />
                          </svg>
                        )}
                        {section.id === 'payment-methods' && (
                          <svg
                            className="w-5 h-5 text-purple-600"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z"
                            />
                          </svg>
                        )}
                      </div>
                    </div>
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold text-gray-900 mb-2 text-left">
                        {section.title}
                      </h3>
                      <p className="text-sm text-gray-600 text-left">
                        {section.description}
                      </p>
                    </div>
                  </div>

                  {/* Action Button */}
                  <div className="mt-auto">
                    <Link
                      href={section.href}
                      className="inline-flex items-center justify-center w-full px-4 py-2 text-sm font-medium text-white bg-black border border-transparent rounded-md hover:shadow-lg hover:shadow-purple-500/25 transition-all duration-300 focus:outline-none"
                    >
                      <span className="text-left">{'Click Here'}</span>
                      <svg
                        className="w-4 h-4 ml-2"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M15 19l-7-7 7-7"
                        />
                      </svg>
                    </Link>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
