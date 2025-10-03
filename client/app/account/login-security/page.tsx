/* eslint-disable react/forbid-dom-props */
'use client';

import React, { useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useRouter, usePathname } from 'next/navigation';
import {
  Breadcrumb,
  generateBreadcrumbItems,
} from '../../components/Breadcrumb';
import Link from 'next/link';

export default function LoginSecurityPage() {
  const { user, isLoading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    // Redirect unauthenticated users to login
    if (!isLoading && !user) {
      router.push('/auth');
    }
  }, [user, isLoading, router]);

  // Don't render anything if user is not authenticated (will redirect)
  if (!isLoading && !user) {
    return null;
  }

  const securityQuestions = [
    {
      id: 'password',
      question: 'Want to change your password?',
      action: 'Click here to change your password',
      href: '/account/login-security/password',
    },
    {
      id: '2fa',
      question: 'Want to manage 2FA settings?',
      action: 'Click here to manage 2FA',
      href: '/account/login-security/2fa',
    },
    {
      id: 'name',
      question: 'Want to change your name?',
      action: 'Click here to change your name',
      href: '/account/login-security/name',
    },
  ];

  return (
    <div className="min-h-screen">
      {/* Main Content Area */}
      <div className="p-3 sm:p-4 md:p-6 lg:p-8 xl:p-12">
        <div className="account max-w-4xl mx-auto">
          {/* Breadcrumb */}
          <div className="mb-6 text-left">
            <Breadcrumb items={generateBreadcrumbItems(pathname)} />
          </div>

          {/* Page Header */}
          <div className="mb-8 text-left">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              Login & Security
            </h1>
            <p className="text-lg text-gray-600">
              Manage passwords, 2FA, and security settings
            </p>
          </div>

          {/* Security Options Grid */}
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {securityQuestions.map((question) => (
              <div
                key={question.id}
                className="bg-white rounded-lg border border-gray-200 shadow-sm hover:shadow-md transition-shadow duration-200 p-6 group"
              >
                <div className="flex flex-col h-full">
                  {/* Icon and Question */}
                  <div className="flex items-start mb-4 space-x-4">
                    <div className="flex-shrink-0">
                      {question.id === 'password' && (
                        <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
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
                              d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z"
                            />
                          </svg>
                        </div>
                      )}
                      {question.id === '2fa' && (
                        <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
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
                        </div>
                      )}
                      {question.id === 'name' && (
                        <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
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
                              d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                            />
                          </svg>
                        </div>
                      )}
                    </div>
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold text-gray-900 mb-2 text-left">
                        {question.question}
                      </h3>
                    </div>
                  </div>

                  {/* Action Button */}
                  <div className="mt-auto">
                    <Link
                      href={question.href}
                      className="inline-flex items-center justify-center w-full px-4 py-2 text-sm font-medium text-white bg-black border border-transparent rounded-md hover:shadow-lg hover:shadow-purple-500/25 transition-all duration-300 focus:outline-none"
                    >
                      <span className="text-left">{question.action}</span>
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
                          d="M9 5l7 7-7 7"
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
