import { useState, useEffect } from 'react';
import { sb } from '../lib/supabase';

export function useAuth() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    sb.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      setLoading(false);
    });

    const { data: { subscription } } = sb.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    // Quando o usuário volta para a aba após ficar em background, revalida a sessão.
    // Isso evita que o JWT expire em silêncio e os dados sumam sem redirecionar ao login.
    function handleVisibility() {
      if (document.visibilityState === 'visible') {
        sb.auth.getSession().then(({ data: { session } }) => {
          setUser(session?.user ?? null);
        });
      }
    }
    document.addEventListener('visibilitychange', handleVisibility);

    return () => {
      subscription.unsubscribe();
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, []);

  async function signIn(email, password) {
    const { error } = await sb.auth.signInWithPassword({ email, password });
    if (error) throw error;
  }

  async function signOut() {
    await sb.auth.signOut();
  }

  return { user, loading, signIn, signOut };
}
