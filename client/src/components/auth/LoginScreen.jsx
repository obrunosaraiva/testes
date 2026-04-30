import { useState } from 'react';
import { useAuth } from '../../hooks/useAuth';

export default function LoginScreen({ onGoToSignup }) {
  const { signIn } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleLogin(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await signIn(email, password);
    } catch (err) {
      setError('Email ou senha incorretos.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      minHeight: '100vh', background: 'var(--bg)',
    }}>
      <div style={{
        background: 'var(--surface)', border: '1px solid var(--border)',
        borderRadius: 16, padding: 40, width: 360, maxWidth: '90vw', textAlign: 'center',
      }}>
        <h1 style={{
          fontSize: '1.5rem', fontWeight: 700, marginBottom: 8,
          background: 'linear-gradient(135deg,var(--accent),var(--info))',
          WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
        }}>
          Kanban Pro
        </h1>
        <p style={{ color: 'var(--text-muted)', fontSize: '.85rem', marginBottom: 24 }}>
          Entre para acessar seu workspace
        </p>

        <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            required
            autoFocus
            style={{ textAlign: 'center' }}
          />
          <input
            type="password"
            placeholder="Senha"
            value={password}
            onChange={e => setPassword(e.target.value)}
            required
            style={{ textAlign: 'center' }}
          />
          {error && (
            <div style={{ color: 'var(--danger)', fontSize: '.82rem' }}>{error}</div>
          )}
          <button
            type="submit"
            disabled={loading}
            style={{
              width: '100%', padding: 12,
              background: loading ? 'var(--surface3)' : 'var(--accent)',
              border: 'none', borderRadius: 10, color: '#fff',
              fontSize: '.95rem', fontWeight: 600, cursor: loading ? 'not-allowed' : 'pointer',
              fontFamily: 'inherit', transition: 'background .2s',
            }}
          >
            {loading ? 'Entrando...' : 'Entrar'}
          </button>
        </form>

        <div style={{ marginTop: 20, fontSize: '.83rem', color: 'var(--text-muted)' }}>
          Não tem conta?{' '}
          <button
            onClick={onGoToSignup}
            style={{ background: 'none', border: 'none', color: 'var(--accent)', cursor: 'pointer', fontFamily: 'inherit', fontSize: 'inherit', textDecoration: 'underline' }}
          >
            Cadastre-se
          </button>
        </div>
      </div>
    </div>
  );
}
