import React from 'react';
import { Link } from 'react-router-dom';

const ForbiddenPage: React.FC = () => {
  return (
    <div className="min-h-screen bg-white dark:bg-gray-900 flex items-center justify-center px-4 sm:px-6 lg:px-8 transition-colors duration-200">
      <div className="max-w-lg w-full text-center">
        {/* 403 Number */}
        <div className="mb-12">
          <h1 className="text-8xl font-extralight text-gray-200 dark:text-gray-700 select-none tracking-wider">403</h1>
        </div>

        {/* Error Message */}
        <div className="mb-12">
          <h2 className="text-2xl font-light text-gray-900 dark:text-white mb-6 tracking-wide">
            Access Forbidden
          </h2>
          <p className="text-base text-gray-600 dark:text-gray-300 leading-relaxed font-light">
            You don't have permission to access this page.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="space-y-4 mb-12">
          <Link
            to="/"
            className="group relative inline-flex items-center justify-center w-full px-8 py-4 bg-transparent border border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white font-light tracking-wide hover:border-red-500 transition-all duration-300 overflow-hidden"
          >
            <span className="relative z-10 group-hover:text-white transition-colors duration-300">
              Return Home
            </span>
            <div className="absolute inset-0 bg-red-500 transform scale-x-0 group-hover:scale-x-100 transition-transform duration-300 origin-left"></div>
          </Link>
          
          <Link
            to="/my-account"
            className="w-full px-8 py-4 text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 font-light tracking-wide hover:border-gray-300 dark:hover:border-gray-500 transition-all duration-300"
          >
            My Account
          </Link>
        </div>

        {/* Subtle Divider */}
        <div className="w-24 h-px bg-gray-200 dark:bg-gray-600 mx-auto mb-8"></div>

        {/* Helpful Information */}
        <div className="text-sm text-gray-500 dark:text-gray-400">
          <p className="mb-4 font-light">If you believe you should have access:</p>
          <div className="text-sm text-gray-600 dark:text-gray-400 space-y-2 font-light">
            <p>• Verify your account credentials</p>
            <p>• Check your account permissions</p>
            <p>• Contact support for assistance</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ForbiddenPage;
