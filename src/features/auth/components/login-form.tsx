'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { signInWithEmail } from '../actions';
import { toast } from 'sonner';
import { useState } from 'react';
import { Loader2, Mail } from 'lucide-react';

const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

export function LoginForm() {
  const [isPending, setIsPending] = useState(false);
  const [needsConfirmation, setNeedsConfirmation] = useState(false);

  const form = useForm<z.infer<typeof loginSchema>>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '' },
  });

  async function onSubmit(values: z.infer<typeof loginSchema>) {
    setIsPending(true);
    setNeedsConfirmation(false);

    const formData = new FormData();
    formData.append('email', values.email);
    formData.append('password', values.password);

    try {
      const res = await signInWithEmail(formData);
      if (res?.error) {
        if (res.error.toLowerCase().includes('confirm your email')) {
          setNeedsConfirmation(true);
        } else {
          toast.error(res.error);
        }
      }
    } catch {
      toast.error('Failed to sign in. Please try again.');
    } finally {
      setIsPending(false);
    }
  }

  if (needsConfirmation) {
    return (
      <div className="flex flex-col items-center gap-4 py-4 text-center">
        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-purple-500/20">
          <Mail className="h-7 w-7 text-purple-400" />
        </div>
        <h2 className="text-lg font-semibold text-white">Check your email</h2>
        <p className="text-sm text-gray-300 leading-relaxed">
          Your email address hasn&apos;t been confirmed yet. Please click the verification link we sent to{' '}
          <span className="text-purple-400 font-medium">{form.getValues('email')}</span>.
        </p>
        <Button
          variant="outline"
          className="mt-2 border-white/20 text-white hover:bg-white/10"
          onClick={() => setNeedsConfirmation(false)}
        >
          Back to sign in
        </Button>
      </div>
    );
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
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
                  placeholder="••••••••"
                  autoComplete="current-password"
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
              Signing in…
            </>
          ) : (
            'Sign In'
          )}
        </Button>
      </form>
    </Form>
  );
}
