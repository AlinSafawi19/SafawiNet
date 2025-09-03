'use client';

import { useState } from 'react';
import AdminPasswordEntry from '../components/Admin/AdminPasswordEntry';
import AdminCreationForm from '../components/Admin/AdminCreationForm';

export default function AdminPage() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  const handlePasswordSuccess = () => {
    setIsAuthenticated(true);
  };

  return (
    <div className="min-h-screen bg-zinc-900">
      {!isAuthenticated ? (
        <AdminPasswordEntry onSuccess={handlePasswordSuccess} />
      ) : (
        <AdminCreationForm />
      )}
    </div>
  );
}
