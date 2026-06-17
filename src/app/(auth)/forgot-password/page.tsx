import { Metadata } from 'next';
import Link from 'next/link';
import { AuthLayout } from '@/features/auth/components/auth-layout';
import { ForgotPasswordForm } from '@/features/auth/components/forgot-password-form';

export const metadata: Metadata = {
  title: 'Reset Password | Spread AI',
  description: 'Reset your password for Spread AI',
};

export default function ForgotPasswordPage() {
  return (
    <AuthLayout>
      <div className="flex flex-col space-y-6">
        <div className="flex flex-col space-y-2 text-center">
          <h1 className="text-3xl font-bold tracking-tight text-white">Reset Password</h1>
          <p className="text-sm text-gray-300">
            Enter your email address to receive a verification code.
          </p>
        </div>
        
        <ForgotPasswordForm />

        <p className="text-center text-sm text-gray-400 mt-4">
          Remember your password?{' '}
          <Link href="/login" className="text-primary hover:text-primary/80 transition-colors font-medium">
            Back to login
          </Link>
        </p>
      </div>
    </AuthLayout>
  );
}
