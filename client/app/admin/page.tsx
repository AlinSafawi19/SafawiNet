'use client';

import { useAuth } from '../contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

export default function AdminDashboard() {
  const { user, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    // Redirect non-admin users or unverified users to home page
    if (
      !isLoading &&
      (!user || !user.isVerified || !user.roles?.includes('ADMIN'))
    ) {
      router.push('/');
    }
  }, [user, isLoading, router]);

  return <div></div>;
}
