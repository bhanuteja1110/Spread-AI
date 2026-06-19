'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { signInWithEmail } from '../actions';
import { toast } from 'sonner';
import { useState } from 'react';
import { Loader2, Mail } from 'lucide-react';
import { perfStart, perfEnd } from '@/lib/perf';
import { TypingDots } from '@/components/loading/typing-dots';

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

    perfStart('auth.login');
    try {
      const res = await signInWithEmail(formData);
      perfEnd('auth.login');
      if (res?.error) {
        if (res.error.toLowerCase().includes('confirm your email')) {
          setNeedsConfirmation(true);
        } else {
          toast.error(res.error);
        }
      }
      // On success, the server action redirects — nothing else to do here.
    } catch {
      perfEnd('auth.login');
      toast.error('Failed to sign in. Please try again.');
    } finally {
      setIsPending(false);
    }
  }

  if (needsConfirmation) {
    return (
      <div className="flex flex-col items-center gap-4 py-4 text-center">
        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary/15">
          <Mail className="h-7 w-7 text-primary" />
        </div>
        <h2 className="text-lg font-semibold text-foreground">Check your email</h2>
        <p className="text-sm text-muted-foreground leading-relaxed">
          Your email address hasn&apos;t been confirmed yet. Please click the verification link we sent to{' '}
          <span className="text-primary font-medium">{form.getValues('email')}</span>.
        </p>
        <Button
          type="button"
          variant="outline"
          className="mt-2 border-border text-foreground hover:bg-accent"
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
              <FormLabel className="text-sm font-medium text-foreground">Email</FormLabel>
              <FormControl>
                <Input
                  placeholder="name@example.com"
                  type="email"
                  autoComplete="email"
                  className="h-11"
                  {...field}
                />
              </FormControl>
              <FormMessage className="text-destructive" />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="password"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-sm font-medium text-foreground">Password</FormLabel>
              <FormControl>
                <Input
                  type="password"
                  placeholder="••••••••"
                  autoComplete="current-password"
                  className="h-11"
                  {...field}
                />
              </FormControl>
              <FormMessage className="text-destructive" />
            </FormItem>
          )}
        />
        <Button
          type="submit"
          disabled={isPending}
          className="w-full h-11 mt-2 bg-primary text-primary-foreground hover:bg-primary/90 font-semibold rounded-lg shadow-sm transition-colors"
        >
          {isPending ? (
            <>
              <TypingDots size="sm" />
              <span className="ml-2">Signing in…</span>
            </>
          ) : (
            'Sign In'
          )}
        </Button>
      </form>
    </Form>
  );
}
