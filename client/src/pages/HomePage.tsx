import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import mmmImage from '../assets/mmm.png';
import ssImage from '../assets/sss.png';
import pppImage from '../assets/ppp.png';

// Slide data structure
interface Slide {
    id: number;
    leftContent: {
        tag: string;
        headline: string;
        ctaText: string;
    };
    rightContent: {
        image: string;
        alt: string;
    };
}

const HomePage: React.FC = () => {
    const { t } = useTranslation();
    const [currentSlide, setCurrentSlide] = useState(0);
    const [slideDirection, setSlideDirection] = useState<'left' | 'right'>('right');

    const slides: Slide[] = [
        {
            id: 1,
            leftContent: {
                tag: t('home.premiumTechnology'),
                headline: t('home.innovativeElectronics'),
                ctaText: t('home.exploreCollection')
            },
            rightContent: {
                image: mmmImage,
                alt: t('home.premiumTechnology')
            }
        },
        {
            id: 2,
            leftContent: {
                tag: t('home.smartSolutions'),
                headline: t('home.intelligentDevices'),
                ctaText: t('home.discoverMore')
            },
            rightContent: {
                image: ssImage,
                alt: t('home.smartSolutions')
            }
        },
        {
            id: 3,
            leftContent: {
                tag: t('home.futureForward'),
                headline: t('home.cuttingEdgeTechnology'),
                ctaText: t('home.shopNow')
            },
            rightContent: {
                image: pppImage,
                alt: t('home.futureForward')
            }
        }
    ];

    // Auto-advance slides every 6 seconds
    useEffect(() => {
        const interval = setInterval(() => {
            setSlideDirection('right');
            setCurrentSlide((prev) => (prev + 1) % slides.length);
        }, 6000);

        return () => clearInterval(interval);
    }, [slides.length]);

    const goToSlide = (slideIndex: number) => {
        const direction = slideIndex > currentSlide ? 'right' : 'left';
        setSlideDirection(direction);
        setCurrentSlide(slideIndex);
    };

    const currentSlideData = slides[currentSlide];

    return (
        <div className="bg-white dark:bg-gray-900 w-full overflow-x-hidden transition-colors duration-200">
            {/* Hero Section */}
            <div className="relative flex items-center justify-center overflow-hidden bg-gradient-to-br from-gray-50 to-white dark:from-gray-800 dark:to-gray-900 w-full transition-colors duration-200">
                {/* Subtle background pattern using hero.jpg */}
                <div className="absolute inset-0 opacity-10 dark:opacity-5">
                    <div
                        className="absolute inset-0 hero-background-pattern"
                    ></div>
                </div>

                <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-16 items-center relative z-10">
                        {/* Left Content */}
                        <div
                            key={`left-${currentSlide}`}
                            className={`space-y-6 lg:space-y-8 py-2 transition-all duration-700 ease-out ${slideDirection === 'right' ? 'animate-fade-in-left' : 'animate-fade-in-right'
                                }`}
                        >
                            {/* Tag */}
                            <div className="inline-block">
                                <span className="text-red-500 text-sm font-light tracking-widest uppercase border-b border-red-200 dark:border-red-800 pb-2">
                                    {currentSlideData.leftContent.tag}
                                </span>
                            </div>

                            {/* Headline */}
                            <h1 className="text-3xl sm:text-4xl lg:text-6xl font-extralight text-gray-900 dark:text-white leading-tight tracking-wide">
                                {currentSlideData.leftContent.headline}
                            </h1>

                            {/* CTA Button */}
                            <div className="pt-4">
                                <button
                                    type="button"
                                    className="group relative inline-flex items-center px-6 sm:px-8 py-3 sm:py-4 bg-transparent border border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white font-light tracking-wide hover:border-red-500 transition-all duration-300 overflow-hidden"
                                >
                                    <span className="relative z-10 group-hover:text-white transition-colors duration-300">
                                        {currentSlideData.leftContent.ctaText}
                                    </span>
                                    <div className="absolute inset-0 bg-red-500 transform scale-x-0 group-hover:scale-x-100 transition-transform duration-300 origin-left"></div>
                                </button>
                            </div>

                            {/* Pagination Dots */}
                            <div className="flex space-x-4 pt-6 lg:pt-8">
                                {slides.map((_, index) => (
                                    <button
                                        key={index}
                                        onClick={() => goToSlide(index)}
                                        className={`transition-all duration-500 ${index === currentSlide
                                            ? 'w-12 h-1 bg-red-500'
                                            : 'w-3 h-3 bg-gray-300 dark:bg-gray-600 hover:bg-gray-400 dark:hover:bg-gray-500'
                                            }`}
                                        aria-label={`Go to slide ${index + 1}`}
                                    />
                                ))}
                            </div>
                        </div>

                        {/* Right Content - Image */}
                        <div
                            key={`right-${currentSlide}`}
                            className={`flex items-center justify-center transition-all duration-700 ease-out ${slideDirection === 'right' ? 'animate-fade-in-right' : 'animate-fade-in-left'
                                }`}
                        >
                            <div className="relative w-full max-w-md lg:max-w-lg">
                                <div className="absolute inset-0 bg-gradient-to-br from-red-50 dark:from-red-900/20 to-transparent rounded-full blur-3xl opacity-60"></div>
                                <img
                                    src={currentSlideData.rightContent.image}
                                    alt={currentSlideData.rightContent.alt}
                                    className="relative z-10 w-full h-auto object-contain filter drop-shadow-2xl"
                                />
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default HomePage;
