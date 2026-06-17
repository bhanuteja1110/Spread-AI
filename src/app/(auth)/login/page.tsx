import { Metadata } from 'next';
import Link from 'next/link';
import { AuthLayout } from '@/features/auth/components/auth-layout';
import { LoginForm } from '@/features/auth/components/login-form';
import { OAuthButtons } from '@/features/auth/components/oauth-buttons';
import { ROUTES } from '@/lib/constants';

export const metadata: Metadata = {
  title: 'Sign In | Spread AI',
  description: 'Sign in to your Spread AI account',
};

export default function LoginPage() {
  return (
    <AuthLayout>
      <div className="flex flex-col space-y-6">
        <div className="flex flex-col space-y-2 text-center">
          <h1 className="text-3xl font-bold tracking-tight text-white">Welcome back</h1>
          <p className="text-sm text-gray-300">
            Enter your email to sign in to your account
          </p>
        </div>
        
        <LoginForm />

        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <span className="w-full border-t border-white/10" />
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-[#0b101e] px-2 text-gray-400 mix-blend-screen">Or continue with</span>
          </div>
        </div>

        <OAuthButtons />

        <div className="flex flex-col space-y-2 text-center text-sm text-gray-400">
          <Link href="/forgot-password" className="hover:text-white transition-colors">
            Forgot your password?
          </Link>
          <p>
            Don&apos;t have an account?{' '}
            <Link href="/signup" className="text-primary hover:text-primary/80 transition-colors font-medium">
              Sign up
            </Link>
          </p>
        </div>
      </div>
    </AuthLayout>
  );
}
