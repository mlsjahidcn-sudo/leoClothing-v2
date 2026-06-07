'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { useRouter } from 'next/navigation';
import type { Session, User } from '@supabase/supabase-js';
import { getBrowserSupabase } from '@/lib/supabase/client';
import type { Database } from '@/lib/supabase/types';

export interface AdminProfile {
  id: string;
  email: string;
  name: string;
  role: string;
}

export interface AdminUserView {
  id: string;
  email: string;
  name: string;
  role: string;
}

interface AuthContextValue {
  user: AdminUserView | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
  /** The raw Supabase session — use it to sign API requests. */
  session: Session | null;
}

const AuthContext = createContext<AuthContextValue | null>(null);

type ProfileRow = Database['public']['Tables']['admin_profiles']['Row'];

function toView(user: User, profile: ProfileRow): AdminUserView {
  return {
    id: profile.id,
    email: profile.email,
    name: profile.name,
    role: profile.role,
  };
}

export function AdminAuthProvider({ children }: { children: ReactNode }) {
  const supabase = useMemo(() => getBrowserSupabase(), []);
  const router = useRouter();
  const [user, setUser] = useState<AdminUserView | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const loadProfile = useCallback(
    async (authUser: User): Promise<AdminUserView | null> => {
      const { data, error } = await supabase
        .from('admin_profiles')
        .select('id, email, name, role, created_at')
        .eq('id', authUser.id)
        .maybeSingle();
      if (error || !data) return null;
      return toView(authUser, data);
    },
    [supabase],
  );

  // Boot: restore session and load profile.
  useEffect(() => {
    let mounted = true;
    supabase.auth.getSession().then(async ({ data }) => {
      if (!mounted) return;
      setSession(data.session);
      if (data.session?.user) {
        const view = await loadProfile(data.session.user);
        if (mounted) setUser(view);
      }
      if (mounted) setIsLoading(false);
    });
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, newSession) => {
      setSession(newSession);
      if (newSession?.user) {
        const view = await loadProfile(newSession.user);
        setUser(view);
      } else {
        setUser(null);
      }
    });
    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [supabase, loadProfile]);

  const login = useCallback<AuthContextValue['login']>(
    async (email, password) => {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error || !data.user) {
        return { success: false, error: error?.message ?? 'Login failed' };
      }
      const view = await loadProfile(data.user);
      if (!view) {
        // Auth worked, but the user has no admin_profile row.
        await supabase.auth.signOut();
        return {
          success: false,
          error: 'This account is not registered as an admin.',
        };
      }
      setUser(view);
      setSession(data.session);
      return { success: true };
    },
    [supabase, loadProfile],
  );

  const logout = useCallback<AuthContextValue['logout']>(async () => {
    await supabase.auth.signOut();
    setUser(null);
    setSession(null);
    router.push('/admin/login');
  }, [supabase, router]);

  return (
    <AuthContext.Provider value={{ user, isLoading, login, logout, session }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAdminAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAdminAuth must be used within AdminAuthProvider');
  return ctx;
}
