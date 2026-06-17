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
import { Loader2, Mail } from 'lucide-react';

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
      }
    } catch (error) {
      toast.error('Failed to send reset email.');
    } finally {
      setIsPending(false);
    }
  }

  if (isSuccess) {
    return (
      <div className="flex flex-col items-center gap-4 py-4 text-center">
        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-purple-500/20">
          <Mail className="h-7 w-7 text-purple-400" />
        </div>
        <h2 className="text-lg font-semibold text-white">Check your email</h2>
        <p className="text-sm text-gray-300 leading-relaxed">
          We&apos;ve sent a password reset link to <span className="text-purple-400 font-medium">{form.getValues('email')}</span>.
        </p>
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
              <FormLabel className="text-sm font-medium text-gray-200">Email Address</FormLabel>
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
        <Button 
          type="submit" 
          className="w-full h-11 mt-2 bg-purple-600 hover:bg-purple-700 text-white font-semibold rounded-lg shadow-lg shadow-purple-500/20 transition-all" 
          disabled={isPending}
        >
          {isPending ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Sending Link…
            </>
          ) : (
            'Send Reset Link'
          )}
        </Button>
      </form>
    </Form>
  );
}
