import './globals.css';
import { Alkalami } from 'next/font/google';
import FooterWrapper from '@app/components/Layout/FooterWrapper';
import Header from '@app/components/Layout/Header';
import { AuthProvider } from './contexts/AuthContext';
import { ThemeProvider } from './contexts/ThemeContext';
import { LanguageProvider } from './contexts/LanguageContext';
import DynamicLangAttribute from './components/DynamicLangAttribute';
import { AppInitializer } from './components/AppInitializer';

// Initialize the Alkalami font
const alkalami = Alkalami({
  weight: '400',
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-alkalami',
});

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
    <html lang="en" className={alkalami.variable}>
      <head>
        <title>SAFAWI NETT</title>
        <meta
          name="description"
          content="Your trusted source for computers & network accessories"
        />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/favicon.ico" />
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
        <AuthProvider>
          <ThemeProvider>
            <LanguageProvider>
              <AppInitializer>
                <DynamicLangAttribute />
                <Header />
                <main className="bg-site dark:bg-dark-bg">{children}</main>

                <FooterWrapper />
              </AppInitializer>
            </LanguageProvider>
          </ThemeProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
