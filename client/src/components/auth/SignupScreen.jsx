import { useState } from 'react';
import { useAuth } from '../../hooks/useAuth';

export default function SignupScreen({ onGoToLogin }) {
  const { signIn } = useAuth();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSignup(e) {
    e.preventDefault();
    setError('');
    if (password !== confirm) { setError('As senhas não coincidem.'); return; }
    if (password.length < 6) { setError('A senha precisa ter pelo menos 6 caracteres.'); return; }
    setLoading(true);
    try {
      const res = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim(), email: email.trim(), phone: phone.trim(), password }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || 'Erro ao criar conta.'); setLoading(false); return; }
      // Auto sign in after successful signup
      await signIn(email.trim(), password);
    } catch (err) {
      setError('Erro ao criar conta. Tente novamente.');
      setLoading(false);
    }
  }

  const cardStyle = {
    background: 'var(--surface)', border: '1px solid var(--border)',
    borderRadius: 16, padding: 40, width: 380, maxWidth: '90vw', textAlign: 'center',
  };

  const inputStyle = { textAlign: 'center' };

  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', background: 'var(--bg)' }}>
      <div style={cardStyle}>
        <h1 style={{
          fontSize: '1.5rem', fontWeight: 700, marginBottom: 8,
          background: 'linear-gradient(135deg,var(--accent),var(--info))',
          WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
        }}>
          Kanban Pro
        </h1>
        <p style={{ color: 'var(--text-muted)', fontSize: '.85rem', marginBottom: 24 }}>
          Crie sua conta para acessar o workspace
        </p>

        <form onSubmit={handleSignup} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <input
            type="text"
            placeholder="Nome completo"
            value={name}
            onChange={e => setName(e.target.value)}
            required
            autoFocus
            style={inputStyle}
          />
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            required
            style={inputStyle}
          />
          <input
            type="tel"
            placeholder="Telefone / WhatsApp"
            value={phone}
            onChange={e => setPhone(e.target.value)}
            style={inputStyle}
          />
          <input
            type="password"
            placeholder="Senha (mínimo 6 caracteres)"
            value={password}
            onChange={e => setPassword(e.target.value)}
            required
            style={inputStyle}
          />
          <input
            type="password"
            placeholder="Confirmar senha"
            value={confirm}
            onChange={e => setConfirm(e.target.value)}
            required
            style={inputStyle}
          />

          {error && <div style={{ color: 'var(--danger)', fontSize: '.82rem' }}>{error}</div>}

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
            {loading ? 'Criando conta...' : 'Criar conta'}
          </button>
        </form>

        <div style={{ marginTop: 20, fontSize: '.83rem', color: 'var(--text-muted)' }}>
          Já tem conta?{' '}
          <button
            onClick={onGoToLogin}
            style={{ background: 'none', border: 'none', color: 'var(--accent)', cursor: 'pointer', fontFamily: 'inherit', fontSize: 'inherit', textDecoration: 'underline' }}
          >
            Entrar
          </button>
        </div>
      </div>
    </div>
  );
}
