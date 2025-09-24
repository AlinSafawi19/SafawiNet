import './globals.css';
import FooterWrapper from '@app/components/Layout/FooterWrapper';
import Header from '@app/components/Layout/Header';
import { OptimizedContextProvider } from './components/OptimizedContextProvider';
import DynamicLangAttribute from './components/DynamicLangAttribute';
import { AppInitializer } from './components/AppInitializer';
import { ErrorBoundary } from './components/ErrorBoundary';
import { GlobalErrorHandler } from './components/GlobalErrorHandler';
import { GlobalPerformanceMonitor } from './components/GlobalPerformanceMonitor';
import { PerformanceDashboard } from './components/PerformanceDashboard';
import { PerformanceOptimizer } from './components/PerformanceOptimizer';
// Fonts are now handled via globals.css only

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
  // Performance logging
  const layoutStartTime = Date.now();
  console.log(`🏗️ [RootLayout] Layout rendering started (${Date.now() - layoutStartTime}ms)`);

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
      </head>
      <body
        className="text-black bg-site dark:text-white dark:bg-dark-bg transition-colors duration-200"
      >
                <ErrorBoundary>
                  <GlobalErrorHandler>
                    <GlobalPerformanceMonitor>
                      <PerformanceOptimizer />
                      <OptimizedContextProvider>
                        <AppInitializer>
                          <DynamicLangAttribute />
                          <Header />
                          <main className="bg-site dark:bg-dark-bg">{children}</main>
                          <FooterWrapper />
                          <PerformanceDashboard />
                        </AppInitializer>
                      </OptimizedContextProvider>
                    </GlobalPerformanceMonitor>
                  </GlobalErrorHandler>
                </ErrorBoundary>
      </body>
    </html>
  );
}
