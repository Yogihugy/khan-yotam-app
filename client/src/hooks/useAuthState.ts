import { useCallback, useEffect, useState } from 'react';
import type { Session } from '@supabase/supabase-js';
import type { PublicUser } from '../lib/api';
import { getSupabase } from '../lib/supabase';
import { fetchOwnUser } from '../lib/mapData';
import {
  clearCachedUser,
  isAccessExpired,
  readCachedUser,
  writeCachedUser,
} from '../lib/userStore';

export type AuthState = {
  ready: boolean;
  session: Session | null;
  user: PublicUser | null;
  configError: string | null;
  expired: boolean;
  refreshUser: () => Promise<PublicUser | null>;
  signOut: () => Promise<void>;
};

export function useAuthState(): AuthState {
  const [ready, setReady] = useState(false);
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<PublicUser | null>(() => readCachedUser());
  const [configError, setConfigError] = useState<string | null>(null);

  const refreshUser = useCallback(async () => {
    try {
      const next = await fetchOwnUser();
      if (next) {
        writeCachedUser(next);
        setUser(next);
      }
      return next;
    } catch (err) {
      console.error(err);
      return null;
    }
  }, []);

  const signOut = useCallback(async () => {
    clearCachedUser();
    setUser(null);
    await getSupabase().auth.signOut();
  }, []);

  useEffect(() => {
    try {
      const supabase = getSupabase();

      void (async () => {
        const { data } = await supabase.auth.getSession();
        setSession(data.session);
        if (data.session) {
          await refreshUser();
        } else {
          clearCachedUser();
          setUser(null);
        }
        setReady(true);
      })();

      const { data: sub } = supabase.auth.onAuthStateChange((_event, next) => {
        setSession(next);
        if (next) void refreshUser();
        else {
          clearCachedUser();
          setUser(null);
        }
      });

      return () => sub.subscription.unsubscribe();
    } catch (err) {
      setConfigError(err instanceof Error ? err.message : 'Config error');
      setReady(true);
      return undefined;
    }
  }, [refreshUser]);

  return {
    ready,
    session,
    user,
    configError,
    expired: isAccessExpired(user),
    refreshUser,
    signOut,
  };
}
