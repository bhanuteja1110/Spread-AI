import { Metadata } from 'next';
import Link from 'next/link';
import { AuthLayout } from '@/features/auth/components/auth-layout';
import { SignUpForm } from '@/features/auth/components/signup-form';
import { OAuthButtons } from '@/features/auth/components/oauth-buttons';

export const metadata: Metadata = {
  title: 'Create an Account | Spread AI',
  description: 'Create your Spread AI account',
};

export default function SignUpPage() {
  return (
    <AuthLayout>
      <div className="flex flex-col space-y-6">
        <div className="flex flex-col space-y-2 text-center">
          <h1 className="text-3xl font-bold tracking-tight text-white">Create an account</h1>
          <p className="text-sm text-gray-300">
            Enter your details below to create your account
          </p>
        </div>
        
        <SignUpForm />

        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <span className="w-full border-t border-white/10" />
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="px-2 text-gray-400" style={{ background: '#12141c' }}>Or continue with</span>
          </div>
        </div>

        <OAuthButtons />

        <p className="text-center text-sm text-gray-400">
          Already have an account?{' '}
          <Link href="/login" className="text-purple-400 hover:text-purple-300 transition-colors font-medium">
            Sign in
          </Link>
        </p>
      </div>
    </AuthLayout>
  );
}
