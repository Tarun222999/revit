import { useQueryClient } from '@tanstack/react-query';
import type { Session, User } from '@supabase/supabase-js';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type PropsWithChildren,
} from 'react';

import { supabase } from '@/lib/supabase/client';
import { withRequestTimeout } from '@/lib/query/requestTimeout';

type AuthContextValue = {
  session: Session | null;
  user: User | null;
  loading: boolean;
  error: Error | null;
  retrySession: () => Promise<void>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: PropsWithChildren) {
  const queryClient = useQueryClient();
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const mountedRef = useRef(true);
  const loadAttemptRef = useRef(0);

  const loadSession = useCallback(async () => {
    const attempt = loadAttemptRef.current + 1;
    loadAttemptRef.current = attempt;
    setLoading(true);
    setError(null);

    try {
      const { data, error: sessionError } = await withRequestTimeout(
        supabase.auth.getSession(),
        'Session restoration timed out.',
      );

      if (sessionError) {
        throw sessionError;
      }

      if (mountedRef.current && loadAttemptRef.current === attempt) {
        setSession(data.session);
      }
    } catch (sessionError: unknown) {
      console.warn('Unable to load Supabase session.', sessionError);

      if (mountedRef.current && loadAttemptRef.current === attempt) {
        setError(
          sessionError instanceof Error
            ? sessionError
            : new Error('Unable to restore the session.'),
        );
      }
    } finally {
      if (mountedRef.current && loadAttemptRef.current === attempt) {
        setLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    mountedRef.current = true;
    void loadSession();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      loadAttemptRef.current += 1;
      setSession(nextSession);
      setError(null);
      setLoading(false);

      if (!nextSession) {
        queryClient.clear();
      }
    });

    return () => {
      mountedRef.current = false;
      subscription.unsubscribe();
    };
  }, [loadSession, queryClient]);

  const value = useMemo<AuthContextValue>(
    () => ({
      session,
      user: session?.user ?? null,
      loading,
      error,
      retrySession: loadSession,
      signOut: async () => {
        const { error } = await supabase.auth.signOut();

        if (error) {
          throw error;
        }

        queryClient.clear();
      },
    }),
    [error, loadSession, loading, queryClient, session],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error('useAuth must be used inside AuthProvider.');
  }

  return context;
}
