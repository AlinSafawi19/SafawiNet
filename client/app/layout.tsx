import './globals.css';
import FooterWrapper from '@app/components/Layout/FooterWrapper';
import Header from '@app/components/Layout/Header';
import { OptimizedContextProvider } from './components/OptimizedContextProvider';
import DynamicLangAttribute from './components/DynamicLangAttribute';
import { AppInitializer } from './components/AppInitializer';
import { ErrorBoundary } from './components/ErrorBoundary';
import { GlobalErrorHandler } from './components/GlobalErrorHandler';
import { PerformanceMonitor } from './components/PerformanceMonitor';

/**
 * Using force dynamic so changes in business assets (e.g. services) are immediately reflected.
 * If you prefer having it reflected only after redeploy (not recommended) please remove it
 * **/
export const revalidate = 0;

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <title>SAFAWI NET</title>
        <meta
          name="description"
          content="Your trusted source for computers & network accessories"
        />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/favicon.ico" />
        
        {/* Preload critical fonts for better performance */}
        <link
          rel="preload"
          href="https://static.parastorage.com/services/third-party/fonts/user-site-fonts/fonts/0078f486-8e52-42c0-ad81-3c8d3d43f48e.woff2"
          as="font"
          type="font/woff2"
          crossOrigin="anonymous"
        />
        <link
          rel="preload"
          href="https://fonts.gstatic.com/s/poppins/v5/aDjpMND83pDErGXlVEr-Sfk_vArhqVIZ0nv9q090hN8.woff2"
          as="font"
          type="font/woff2"
          crossOrigin="anonymous"
        />
        <style
          dangerouslySetInnerHTML={{
            __html: `
            /* AGGRESSIVE AUTOFILL OVERRIDE - Inline styles for maximum compatibility */
            input:-webkit-autofill,
            input:-webkit-autofill:hover,
            input:-webkit-autofill:focus,
            input:-webkit-autofill:active {
              -webkit-box-shadow: 0 0 0 1000px rgba(255, 255, 255, 0.1) inset !important;
              -webkit-text-fill-color: #ffffff !important;
              background-color: rgba(255, 255, 255, 0.1) !important;
              color: #ffffff !important;
              border-color: rgba(255, 255, 255, 0.2) !important;
              border-radius: 8px !important;
            }
            
            input[type="password"]:-webkit-autofill,
            input[type="text"]:-webkit-autofill {
              -webkit-box-shadow: 0 0 0 1000px rgba(255, 255, 255, 0.1) inset !important;
              -webkit-text-fill-color: #ffffff !important;
              background-color: rgba(255, 255, 255, 0.1) !important;
              color: #ffffff !important;
            }
            
            /* Force autofill background override */
            input:-webkit-autofill {
              transition: background-color 5000s ease-in-out 0s !important;
            }
          `,
          }}
        />
      </head>
      <body className="text-black bg-site dark:text-white dark:bg-dark-bg transition-colors duration-200">
        <ErrorBoundary>
          <GlobalErrorHandler>
            <OptimizedContextProvider>
              <AppInitializer>
                <DynamicLangAttribute />
                <Header />
                <main className="bg-site dark:bg-dark-bg">
                  {children}
                </main>
                <FooterWrapper />
              </AppInitializer>
            </OptimizedContextProvider>
          </GlobalErrorHandler>
        </ErrorBoundary>
      </body>
    </html>
  );
}
