'use client';

import { useAuth } from '../contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { LoadingPage } from '../components/LoadingPage';

export default function AdminDashboard() {
  const { user, isLoading } = useAuth();
  const router = useRouter();
  const [isRedirecting, setIsRedirecting] = useState(false);

  useEffect(() => {
    // Redirect non-admin users or unverified users to home page
    if (
      !isLoading &&
      (!user || !user.isVerified || !user.roles.includes('ADMIN'))
    ) {
      setIsRedirecting(true);
      router.push('/');
    }
  }, [user, isLoading, router]);

  // Show loading page while redirecting
  if (isRedirecting) {
    return <LoadingPage />;
  }

  return <div></div>;
}
