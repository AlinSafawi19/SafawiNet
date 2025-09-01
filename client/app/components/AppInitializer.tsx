'use client';

import React from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { useLanguage } from '../contexts/LanguageContext';

interface AppInitializerProps {
    children: React.ReactNode;
}

export const AppInitializer: React.FC<AppInitializerProps> = ({ children }) => {
    const { isLoading: isAuthLoading } = useAuth();
    const { isLoading: isThemeLoading } = useTheme();
    const { isLoading: isLanguageLoading } = useLanguage();

    // Wait until all contexts are initialized before rendering children
    const isInitializing = isAuthLoading || isThemeLoading || isLanguageLoading;

    if (isInitializing) {
        return <LoadingMarquee />;
    }

    return <>{children}</>;
};

const LoadingMarquee: React.FC = () => {
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-site">
            <div className="relative w-full h-full flex items-center justify-center overflow-hidden">
                {/* Vertical Marquee Container */}
                <div className="relative flex flex-col h-full w-full items-center justify-center">
                    {/* First Vertical Marquee */}
                    <div className="flex flex-col animate-marquee-vertical whitespace-nowrap items-center">
                        <h1 className="my-4 flex space-x-8">
                            <span className="text-4xl sm:text-6xl lg:text-[120px] leading-tight sm:leading-none font-bold text-purple-500">INITIALIZING</span>
                            <span className="text-4xl sm:text-6xl lg:text-[120px] leading-tight sm:leading-none font-bold text-black">SAFAWI NETT</span>
                            <span className="text-4xl sm:text-6xl lg:text-[120px] leading-tight sm:leading-none font-bold text-black">SAFAWI NETT</span>
                        </h1>
                        <h1 className="my-4 flex space-x-8">
                            <span className="text-4xl sm:text-6xl lg:text-[120px] leading-tight sm:leading-none font-bold text-black">SAFAWI NETT</span>
                            <span className="text-4xl sm:text-6xl lg:text-[120px] leading-tight sm:leading-none font-bold text-purple-500">INITIALIZING</span>
                            <span className="text-4xl sm:text-6xl lg:text-[120px] leading-tight sm:leading-none font-bold text-black">SAFAWI NETT</span>
                        </h1>
                        <h1 className="my-4 flex space-x-8">
                            <span className="text-4xl sm:text-6xl lg:text-[120px] leading-tight sm:leading-none font-bold text-black">SAFAWI NETT</span>
                            <span className="text-4xl sm:text-6xl lg:text-[120px] leading-tight sm:leading-none font-bold text-black">SAFAWI NETT</span>
                            <span className="text-4xl sm:text-6xl lg:text-[120px] leading-tight sm:leading-none font-bold text-purple-500">INITIALIZING</span>
                        </h1>
                        <h1 className="my-4 flex space-x-8">
                            <span className="text-4xl sm:text-6xl lg:text-[120px] leading-tight sm:leading-none font-bold text-purple-500">INITIALIZING</span>
                            <span className="text-4xl sm:text-6xl lg:text-[120px] leading-tight sm:leading-none font-bold text-black">SAFAWI NETT</span>
                            <span className="text-4xl sm:text-6xl lg:text-[120px] leading-tight sm:leading-none font-bold text-black">SAFAWI NETT</span>
                        </h1>
                        <h1 className="my-4 flex space-x-8">
                            <span className="text-4xl sm:text-6xl lg:text-[120px] leading-tight sm:leading-none font-bold text-black">SAFAWI NETT</span>
                            <span className="text-4xl sm:text-6xl lg:text-[120px] leading-tight sm:leading-none font-bold text-purple-500">INITIALIZING</span>
                            <span className="text-4xl sm:text-6xl lg:text-[120px] leading-tight sm:leading-none font-bold text-black">SAFAWI NETT</span>
                        </h1>
                        <h1 className="my-4 flex space-x-8">
                            <span className="text-4xl sm:text-6xl lg:text-[120px] leading-tight sm:leading-none font-bold text-black">SAFAWI NETT</span>
                            <span className="text-4xl sm:text-6xl lg:text-[120px] leading-tight sm:leading-none font-bold text-black">SAFAWI NETT</span>
                            <span className="text-4xl sm:text-6xl lg:text-[120px] leading-tight sm:leading-none font-bold text-purple-500">INITIALIZING</span>
                        </h1>
                    </div>

                    {/* Second Vertical Marquee (duplicate for seamless loop) */}
                    <div className="absolute top-0 flex flex-col animate-marquee-vertical2 whitespace-nowrap items-center">
                        <h1 className="my-4 flex space-x-8">
                            <span className="text-4xl sm:text-6xl lg:text-[120px] leading-tight sm:leading-none font-bold text-purple-500">INITIALIZING</span>
                            <span className="text-4xl sm:text-6xl lg:text-[120px] leading-tight sm:leading-none font-bold text-black">SAFAWI NETT</span>
                            <span className="text-4xl sm:text-6xl lg:text-[120px] leading-tight sm:leading-none font-bold text-black">SAFAWI NETT</span>
                        </h1>
                        <h1 className="my-4 flex space-x-8">
                            <span className="text-4xl sm:text-6xl lg:text-[120px] leading-tight sm:leading-none font-bold text-black">SAFAWI NETT</span>
                            <span className="text-4xl sm:text-6xl lg:text-[120px] leading-tight sm:leading-none font-bold text-purple-500">INITIALIZING</span>
                            <span className="text-4xl sm:text-6xl lg:text-[120px] leading-tight sm:leading-none font-bold text-black">SAFAWI NETT</span>
                        </h1>
                        <h1 className="my-4 flex space-x-8">
                            <span className="text-4xl sm:text-6xl lg:text-[120px] leading-tight sm:leading-none font-bold text-black">SAFAWI NETT</span>
                            <span className="text-4xl sm:text-6xl lg:text-[120px] leading-tight sm:leading-none font-bold text-black">SAFAWI NETT</span>
                            <span className="text-4xl sm:text-6xl lg:text-[120px] leading-tight sm:leading-none font-bold text-purple-500">INITIALIZING</span>
                        </h1>
                        <h1 className="my-4 flex space-x-8">
                            <span className="text-4xl sm:text-6xl lg:text-[120px] leading-tight sm:leading-none font-bold text-purple-500">INITIALIZING</span>
                            <span className="text-4xl sm:text-6xl lg:text-[120px] leading-tight sm:leading-none font-bold text-black">SAFAWI NETT</span>
                            <span className="text-4xl sm:text-6xl lg:text-[120px] leading-tight sm:leading-none font-bold text-black">SAFAWI NETT</span>
                        </h1>
                        <h1 className="my-4 flex space-x-8">
                            <span className="text-4xl sm:text-6xl lg:text-[120px] leading-tight sm:leading-none font-bold text-black">SAFAWI NETT</span>
                            <span className="text-4xl sm:text-6xl lg:text-[120px] leading-tight sm:leading-none font-bold text-purple-500">INITIALIZING</span>
                            <span className="text-4xl sm:text-6xl lg:text-[120px] leading-tight sm:leading-none font-bold text-black">SAFAWI NETT</span>
                        </h1>
                        <h1 className="my-4 flex space-x-8">
                            <span className="text-4xl sm:text-6xl lg:text-[120px] leading-tight sm:leading-none font-bold text-black">SAFAWI NETT</span>
                            <span className="text-4xl sm:text-6xl lg:text-[120px] leading-tight sm:leading-none font-bold text-black">SAFAWI NETT</span>
                            <span className="text-4xl sm:text-6xl lg:text-[120px] leading-tight sm:leading-none font-bold text-purple-500">INITIALIZING</span>
                        </h1>
                    </div>
                </div>
            </div>
        </div>
    );
};
