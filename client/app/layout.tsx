import './globals.css';
import FooterWrapper from '@app/components/Layout/FooterWrapper';
import Header from '@app/components/Layout/Header';
import { ContextProvider } from './components/ContextProvider';
import DynamicLangAttribute from './components/DynamicLangAttribute';
import { AppInitializer } from './components/AppInitializer';
import { ErrorBoundary } from './components/ErrorBoundary';
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
        <link rel="preconnect" href="https://static.wixstatic.com" />
        <link rel="dns-prefetch" href="https://static.wixstatic.com" />
      </head>
      <body className="text-black bg-site transition-colors duration-200">
        <ErrorBoundary>
          <ContextProvider>
            <AppInitializer>
              <DynamicLangAttribute />
              <Header />
              <main className="bg-site">{children}</main>
              <FooterWrapper />
            </AppInitializer>
          </ContextProvider>
        </ErrorBoundary>
      </body>
    </html>
  );
}
