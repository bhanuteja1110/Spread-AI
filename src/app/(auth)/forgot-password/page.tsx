import { Metadata } from 'next';
import Link from 'next/link';
import { AuthLayout } from '@/features/auth/components/auth-layout';
import { ForgotPasswordForm } from '@/features/auth/components/forgot-password-form';

export const metadata: Metadata = {
  title: 'Reset Password | Spread AI',
  description: 'Reset your Spread AI password',
};

export default function ForgotPasswordPage() {
  return (
    <AuthLayout>
      <div className="flex flex-col space-y-6">
        <div className="flex flex-col space-y-2 text-center">
          <h1 className="text-3xl font-bold tracking-tight text-white">Reset password</h1>
          <p className="text-sm text-gray-300">
            Enter your email address and we&apos;ll send you a link to reset your password.
          </p>
        </div>
        
        <ForgotPasswordForm />

        <p className="text-center text-sm text-gray-400">
          Remember your password?{' '}
          <Link href="/login" className="text-purple-400 hover:text-purple-300 transition-colors font-medium">
            Sign in
          </Link>
        </p>
      </div>
    </AuthLayout>
  );
}
