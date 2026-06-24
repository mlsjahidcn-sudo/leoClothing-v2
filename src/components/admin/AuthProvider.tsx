'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
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
  // Use a ref to short-circuit double work when the boot effect AND
  // the onAuthStateChange listener both pick up the same initial
  // session. (Cheap; a single in-flight ref beats a useState +
  // useEffect dance.)
  const mountedRef = useRef(true);
  const inflightLoadRef = useRef<Promise<AdminUserView | null> | null>(null);

  const loadProfile = useCallback(
    async (authUser: User): Promise<AdminUserView | null> => {
      // De-dupe: if a load is already in flight for the same user,
      // reuse the existing promise. (Boot effect + listener can
      // both pick up the same initial session and race.)
      if (inflightLoadRef.current) return inflightLoadRef.current;
      const p = (async () => {
        const { data, error } = await supabase
          .from('admin_profiles')
          .select('id, email, name, role, created_at')
          .eq('id', authUser.id)
          .maybeSingle();
        return error || !data ? null : toView(authUser, data);
      })();
      inflightLoadRef.current = p;
      try {
        return await p;
      } finally {
        inflightLoadRef.current = null;
      }
    },
    [supabase],
  );

  /**
   * Apply a session to the auth context. Single source of truth for
   * "given this session, what's the user state?" — used by the
   * boot effect, the auth-state-change listener, and login().
   *
   * Always clears isLoading on completion. This is critical: the
   * onAuthStateChange listener was previously NOT updating
   * isLoading, which meant if it fired before the boot's
   * getSession() resolved (and the latter then hung), the
   * AdminShell would stay on "Loading..." until the watchdog.
   */
  const applySession = useCallback(
    async (newSession: Session | null): Promise<AdminUserView | null> => {
      setSession(newSession);
      if (!newSession?.user) {
        setUser(null);
        setIsLoading(false);
        return null;
      }
      try {
        const view = await loadProfile(newSession.user);
        if (!mountedRef.current) return view;
        setUser(view);
        setIsLoading(false);
        return view;
      } catch (e) {
        console.error('[AdminAuthProvider] loadProfile failed:', e);
        if (mountedRef.current) {
          setUser(null);
          setIsLoading(false);
        }
        return null;
      }
    },
    [loadProfile],
  );

  // Boot: restore session and load profile.
  useEffect(() => {
    mountedRef.current = true;
    // Safety net: if getSession() never settles (hung promise, locked
    // storage key, etc.) we'd be stuck on "Loading..." forever. Force
    // isLoading=false after 5s so the AdminShell can at least
    // redirect/redirect-loop instead of hanging indefinitely.
    const watchdog = setTimeout(() => {
      if (mountedRef.current) {
        console.warn('[AdminAuthProvider] boot watchdog: forcing isLoading=false after 5s timeout');
        setIsLoading(false);
      }
    }, 5000);
    supabase.auth
      .getSession()
      .then(async ({ data }) => {
        clearTimeout(watchdog);
        if (!mountedRef.current) return;
        await applySession(data.session);
      })
      .catch((e) => {
        // Without this catch, a hung or rejected getSession() (e.g.
        // corrupted session in localStorage) would leave isLoading=true
        // forever and the admin portal stuck on "Loading...".
        clearTimeout(watchdog);
        console.error('[AdminAuthProvider] getSession() failed during boot:', e);
        if (mountedRef.current) {
          // Fire-and-forget — applySession itself clears isLoading
          // synchronously after the (no-op) loadProfile on null.
          void applySession(null);
        }
      });
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, newSession) => {
      // Fire-and-forget, NOT awaited.
      //
      // The supabase-js listener is invoked from inside its own
      // _initialize() (via _notifyAllSubscribers), which is itself
      // holding a Web Lock. If we await applySession here, the chain
      // is:
      //   _initialize -> _notifyAllSubscribers (awaits this cb)
      //     -> applySession -> loadProfile -> supabase query
      //       -> getSession() -> await initializePromise
      //   ...which is still pending because we're inside it.
      // Classic deadlock. The supabase query then blocks on a Web
      // Lock acquire that has a 10s timeout, the user sees 5s of
      // "Loading..." and gets bounced to /admin/login by our
      // watchdog. The query then completes ~10s in, far too late.
      //
      // Fire-and-forget breaks the cycle: the listener returns
      // immediately, _initialize completes, initializePromise
      // resolves, and applySession runs in the background and
      // sets state when it's done. The boot's getSession().then()
      // path also uses applySession (still awaited) so we still
      // get a deterministic source-of-truth update on first paint.
      void applySession(newSession);
    });
    return () => {
      mountedRef.current = false;
      clearTimeout(watchdog);
      subscription.unsubscribe();
    };
  }, [supabase, applySession]);

  const login = useCallback<AuthContextValue['login']>(
    async (email, password) => {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error || !data.user) {
        return { success: false, error: error?.message ?? 'Login failed' };
      }
      // Route through applySession so the listener doesn't also pick
      // this up and double-load the profile. applySession is the
      // single source of truth for "given this session, update state".
      const view = await applySession(data.session);
      if (!view) {
        // Auth worked, but the user has no admin_profile row.
        await supabase.auth.signOut();
        return {
          success: false,
          error: 'This account is not registered as an admin.',
        };
      }
      return { success: true };
    },
    [supabase, applySession],
  );

  const logout = useCallback<AuthContextValue['logout']>(async () => {
    await supabase.auth.signOut();
    // The onAuthStateChange(SIGNED_OUT) listener will run applySession(null)
    // for us — but we set state here too so the UI updates immediately
    // even if the listener fires after the redirect.
    setUser(null);
    setSession(null);
    router.push('/admin/login');
  }, [supabase, router]);

  // Memoize the context value so consumers don't re-render on every
  // parent render. Without this, every state change above (session,
  // user, isLoading) recomputed the object identity and re-rendered
  // every useAdminAuth() consumer — including AdminShell.
  const value = useMemo<AuthContextValue>(
    () => ({ user, isLoading, login, logout, session }),
    [user, isLoading, login, logout, session],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAdminAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAdminAuth must be used within AdminAuthProvider');
  return ctx;
}
