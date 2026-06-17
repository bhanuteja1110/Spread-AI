'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { resetPassword } from '../actions';
import { toast } from 'sonner';
import { useState } from 'react';
import { Loader2 } from 'lucide-react';

const forgotPasswordSchema = z.object({
  email: z.string().email('Invalid email address'),
});

export function ForgotPasswordForm() {
  const [isPending, setIsPending] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const form = useForm<z.infer<typeof forgotPasswordSchema>>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: { email: '' },
  });

  async function onSubmit(values: z.infer<typeof forgotPasswordSchema>) {
    setIsPending(true);
    const formData = new FormData();
    formData.append('email', values.email);

    try {
      const res = await resetPassword(formData);
      if (res?.error) {
        toast.error(res.error);
      } else {
        setIsSuccess(true);
        toast.success(res?.success || 'Email sent');
      }
    } catch (error) {
      toast.error('Failed to send reset email.');
    } finally {
      setIsPending(false);
    }
  }

  if (isSuccess) {
    return (
      <div className="text-center space-y-4">
        <p className="text-gray-200">
          We&apos;ve sent a password reset link to your email address.
        </p>
      </div>
    );
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="email"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-gray-200">Email Address</FormLabel>
              <FormControl>
                <Input placeholder="name@example.com" className="glass-input text-white" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button type="submit" className="w-full mt-6" disabled={isPending}>
          {isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
          Send Reset Link
        </Button>
      </form>
    </Form>
  );
}
