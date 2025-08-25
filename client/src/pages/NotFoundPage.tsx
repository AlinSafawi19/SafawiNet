import React from 'react';
import { Link } from 'react-router-dom';

const NotFoundPage: React.FC = () => {
  return (
    <div className="min-h-screen bg-white flex items-center justify-center px-4 sm:px-6 lg:px-8">
      <div className="max-w-lg w-full text-center">
        {/* 404 Number */}
        <div className="mb-12">
          <h1 className="text-8xl font-extralight text-gray-200 select-none tracking-wider">404</h1>
        </div>

        {/* Error Message */}
        <div className="mb-12">
          <h2 className="text-2xl font-light text-gray-900 mb-6 tracking-wide">
            Page Not Found
          </h2>
          <p className="text-base text-gray-600 leading-relaxed font-light">
            The page you're looking for doesn't exist or has been moved.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="space-y-4 mb-12">
          <Link
            to="/"
            className="group relative inline-flex items-center justify-center w-full px-8 py-4 bg-transparent border border-gray-300 text-gray-900 font-light tracking-wide hover:border-red-500 transition-all duration-300 overflow-hidden"
          >
            <span className="relative z-10 group-hover:text-white transition-colors duration-300">
              Return Home
            </span>
            <div className="absolute inset-0 bg-red-500 transform scale-x-0 group-hover:scale-x-100 transition-transform duration-300 origin-left"></div>
          </Link>
          
          <button
            onClick={() => window.history.back()}
            className="w-full px-8 py-4 text-gray-700 bg-white border border-gray-200 font-light tracking-wide hover:border-gray-300 transition-all duration-300"
          >
            Go Back
          </button>
        </div>

        {/* Subtle Divider */}
        <div className="w-24 h-px bg-gray-200 mx-auto mb-8"></div>

        {/* Helpful Links */}
        <div className="text-sm text-gray-500">
          <p className="mb-4 font-light">Need assistance?</p>
          <div className="flex justify-center space-x-6">
            <Link
              to="/my-account"
              className="text-red-500 hover:text-red-600 transition-colors duration-200 font-light tracking-wide"
            >
              My Account
            </Link>
            <span className="text-gray-300">•</span>
            <Link
              to="/"
              className="text-red-500 hover:text-red-600 transition-colors duration-200 font-light tracking-wide"
            >
              Home
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default NotFoundPage;
