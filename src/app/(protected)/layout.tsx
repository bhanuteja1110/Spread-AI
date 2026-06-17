import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { ROUTES } from '@/lib/constants';

export default async function ProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = createClient();
  // Validates session via Edge middleware earlier, but securely fetches user data here
  const { data: { user }, error } = await supabase.auth.getUser();

  if (error || !user) {
    redirect(ROUTES.login);
  }

  return (
    <div className="flex h-screen overflow-hidden bg-background text-foreground">
      {children}
    </div>
  );
}
