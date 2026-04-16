import { useState, useEffect } from 'react';
import { sb } from '../lib/supabase';

export function useAuth() {
  const [user, setUser]   = useState(null);
  const [token, setToken] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    sb.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      setToken(session?.access_token ?? null);
      setLoading(false);
    });

    // onAuthStateChange cobre: login, logout, TOKEN_REFRESHED, SIGNED_OUT.
    // O Supabase client já faz auto-refresh do JWT nativamente — não precisa
    // de getSession() manual no visibilitychange (causava conflito de lock).
    const { data: { subscription } } = sb.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      setToken(session?.access_token ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  async function signIn(email, password) {
    const { error } = await sb.auth.signInWithPassword({ email, password });
    if (error) throw error;
  }

  async function signOut() {
    await sb.auth.signOut();
  }

  return { user, token, loading, signIn, signOut };
}
