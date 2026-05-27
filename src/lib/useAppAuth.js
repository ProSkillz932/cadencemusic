import { useAuth } from '@/lib/AuthContext';

// Combines platform auth + admin session (username: admin, password: cadence)
export function useAppAuth() {
  const { user, isLoadingAuth } = useAuth();
  const isAdmin = typeof window !== 'undefined' && localStorage.getItem('cadenceAdmin') === '1';
  const isLoggedIn = !!user || isAdmin;
  const email = user?.email || (isAdmin ? 'admin@cadence.app' : null);
  return { isLoggedIn, isAdmin, user, isLoadingAuth, email };
}