import { redirect } from 'next/navigation';

/**
 * Root page — immediately redirects to /login.
 * The middleware handles auth-aware redirects from there:
 *   - Authenticated users → /dashboard
 *   - Unauthenticated users → /login
 */
export default function RootPage() {
  redirect('/login');
}
