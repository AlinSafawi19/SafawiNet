import { AuthForm } from '../components/Auth/AuthForm';
import { Suspense } from 'react';
import { LoadingPage } from '../components/LoadingPage';

export default function AuthPage() {
  return (
    <Suspense fallback={<LoadingPage />}>
      <AuthForm />
    </Suspense>
  );
}
