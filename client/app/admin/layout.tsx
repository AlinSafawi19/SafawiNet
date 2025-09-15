'use client';

import { useAuth } from '../contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import AdminSidebar from '../components/Admin/AdminSidebar';
import { useLanguage } from '../contexts/LanguageContext';
import { LoadingPage } from '../components/LoadingPage';

interface AdminLayoutProps {
  children: React.ReactNode;
}

export default function AdminLayout({ children }: AdminLayoutProps) {
  const { user, isLoading } = useAuth();
  const router = useRouter();
  const { locale } = useLanguage();

  useEffect(() => {
    // Redirect non-admin users or unverified users to home page
    if (
      !isLoading &&
      (!user || !user.isVerified || !user.roles?.includes('ADMIN'))
    ) {
      router.push('/');
    }
  }, [user, isLoading, router]);

  // Show loading page while checking authentication
  if (isLoading) {
    return <LoadingPage />;
  }

  return (
    <div className="min-h-screen flex">
      {/* Sidebar */}
      <AdminSidebar />

      {/* Main Content */}
      <div
        className={`flex-1 flex flex-col ${
          locale === 'ar' ? 'lg:mr-72' : 'lg:ml-72'
        }`}
      >
        {/* Page Content */}
        <main className="flex-1 overflow-auto">{children}</main>
      </div>
    </div>
  );
}
