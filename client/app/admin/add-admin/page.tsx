'use client';

import { useAuth } from '../../contexts/AuthContext';
import { useRouter } from 'next/navigation';
import AdminCreationForm from '../../components/Admin/AdminCreationForm';
import { LoadingPage } from '@app/components/LoadingPage';
import { useEffect } from 'react';

export default function AddAdminPage() {
  const { isSuperAdmin, isLoading } = useAuth();
  const router = useRouter();

  // Redirect if not superadmin
  useEffect(() => {
    if (!isLoading && !isSuperAdmin()) {
      router.push('/admin');
    }
  }, [isLoading, isSuperAdmin, router]);

  // Show loading while checking auth
  if (isLoading) {
    return <LoadingPage />;
  }

  // Don't render anything if not superadmin (redirect will happen in useEffect)
  if (!isSuperAdmin()) {
    return null;
  }

  const handleAdminCreated = () => {
    // Optionally redirect to admin list or show success message
    router.push('/admin');
  };

  return (
    <div className="min-h-screen">
      <div className="max-w-4xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
        {/* Admin Creation Form */}
        <div className="px-6 py-8">
          <AdminCreationForm onSuccess={handleAdminCreated} />
        </div>
      </div>
    </div>
  );
}
