'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { signUpWithEmail } from '../actions';
import { toast } from 'sonner';
import { useState } from 'react';
import { Loader2, Mail, CheckCircle2 } from 'lucide-react';
import Link from 'next/link';

const signupSchema = z.object({
  fullName: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

export function SignUpForm() {
  const [isPending, setIsPending] = useState(false);
  const [confirmationState, setConfirmationState] = useState<{
    show: boolean;
    email: string;
    message: string;
  }>({ show: false, email: '', message: '' });

  const form = useForm<z.infer<typeof signupSchema>>({
    resolver: zodResolver(signupSchema),
    defaultValues: { fullName: '', email: '', password: '' },
  });

  async function onSubmit(values: z.infer<typeof signupSchema>) {
    setIsPending(true);

    const formData = new FormData();
    formData.append('fullName', values.fullName);
    formData.append('email', values.email);
    formData.append('password', values.password);

    try {
      const res = await signUpWithEmail(formData);

      if (res?.error) {
        toast.error(res.error);
        return;
      }

      if (res?.requiresConfirmation) {
        // Email confirmation required — show inline state
        setConfirmationState({
          show: true,
          email: values.email,
          message: res.message ?? 'Check your email to confirm your account.',
        });
        return;
      }

      // If we get here, email confirmation is disabled and user is logged in
      toast.success('Account created successfully!');
    } catch {
      toast.error('Failed to create account. Please try again.');
    } finally {
      setIsPending(false);
    }
  }

  // Email confirmation required state
  if (confirmationState.show) {
    return (
      <div className="flex flex-col items-center gap-4 py-4 text-center">
        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-green-500/20">
          <CheckCircle2 className="h-7 w-7 text-green-400" />
        </div>
        <h2 className="text-lg font-semibold text-white">Almost there!</h2>
        <p className="text-sm text-gray-300 leading-relaxed">
          We sent a confirmation link to{' '}
          <span className="text-purple-400 font-medium">{confirmationState.email}</span>.
          <br />
          Click the link in your email to activate your account.
        </p>
        <div className="mt-2 flex items-center gap-2 text-xs text-gray-400">
          <Mail className="h-3.5 w-3.5" />
          <span>Check your spam folder if you don&apos;t see it</span>
        </div>
        <Link
          href="/login"
          className="mt-4 text-sm text-purple-400 hover:text-purple-300 transition-colors underline underline-offset-4"
        >
          Back to sign in
        </Link>
      </div>
    );
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
        <FormField
          control={form.control}
          name="fullName"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-sm font-medium text-gray-200">Full Name</FormLabel>
              <FormControl>
                <Input
                  placeholder="John Doe"
                  autoComplete="name"
                  className="glass-input h-11 rounded-lg text-white"
                  {...field}
                />
              </FormControl>
              <FormMessage className="text-red-400" />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="email"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-sm font-medium text-gray-200">Email</FormLabel>
              <FormControl>
                <Input
                  placeholder="name@example.com"
                  type="email"
                  autoComplete="email"
                  className="glass-input h-11 rounded-lg text-white"
                  {...field}
                />
              </FormControl>
              <FormMessage className="text-red-400" />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="password"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-sm font-medium text-gray-200">Password</FormLabel>
              <FormControl>
                <Input
                  type="password"
                  placeholder="Min. 6 characters"
                  autoComplete="new-password"
                  className="glass-input h-11 rounded-lg text-white"
                  {...field}
                />
              </FormControl>
              <FormMessage className="text-red-400" />
            </FormItem>
          )}
        />
        <Button
          type="submit"
          className="w-full h-11 mt-2 bg-purple-600 hover:bg-purple-700 text-white font-semibold rounded-lg shadow-lg shadow-purple-500/20 transition-all"
          disabled={isPending}
        >
          {isPending ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Creating account…
            </>
          ) : (
            'Create Account'
          )}
        </Button>
      </form>
    </Form>
  );
}
