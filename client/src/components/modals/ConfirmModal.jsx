export default function ConfirmModal({ title, message, confirmLabel = 'Confirmar', cancelLabel = 'Cancelar', variant = 'danger', onConfirm, onCancel }) {
  const accentColor = variant === 'danger' ? 'var(--danger)' : 'var(--accent)';

  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 2000,
        background: 'rgba(0,0,0,.55)', backdropFilter: 'blur(4px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: 24,
        animation: 'fadeIn .12s ease',
      }}
      onClick={onCancel}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          background: 'var(--surface)',
          border: '1px solid var(--border)',
          borderRadius: 16,
          padding: '28px 28px 24px',
          maxWidth: 380,
          width: '100%',
          boxShadow: '0 20px 60px rgba(0,0,0,.4)',
          animation: 'slideUp .15s ease',
        }}
      >
        {/* Icon */}
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 16 }}>
          <div style={{
            width: 52, height: 52, borderRadius: '50%',
            background: accentColor + '18',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '1.4rem',
          }}>
            {variant === 'danger' ? '🗑' : '⚠️'}
          </div>
        </div>

        {/* Text */}
        <div style={{ textAlign: 'center', marginBottom: 24 }}>
          {title && (
            <div style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text)', marginBottom: 8 }}>
              {title}
            </div>
          )}
          <div style={{ fontSize: '.88rem', color: 'var(--text-muted)', lineHeight: 1.5 }}>
            {message}
          </div>
        </div>

        {/* Buttons */}
        <div style={{ display: 'flex', gap: 10 }}>
          <button
            onClick={onCancel}
            style={{
              flex: 1, padding: '10px 0', borderRadius: 10,
              background: 'var(--surface2)', border: '1px solid var(--border)',
              color: 'var(--text-muted)', fontWeight: 600, fontSize: '.88rem',
              cursor: 'pointer', transition: 'all .15s',
            }}
            onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--text-muted)'}
            onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border)'}
          >
            {cancelLabel}
          </button>
          <button
            autoFocus
            onClick={onConfirm}
            style={{
              flex: 1, padding: '10px 0', borderRadius: 10,
              background: accentColor, border: 'none',
              color: '#fff', fontWeight: 700, fontSize: '.88rem',
              cursor: 'pointer', transition: 'opacity .15s',
            }}
            onMouseEnter={e => e.currentTarget.style.opacity = '.85'}
            onMouseLeave={e => e.currentTarget.style.opacity = '1'}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
