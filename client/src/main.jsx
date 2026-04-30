import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'

// ── Medalha de São Bento — proteção espiritual e técnica ──────────────────────
// Exibida no console do DevTools quando alguém inspeciona o app.
;(function benedictMedal() {
  const GOLD   = 'color:#FFD700;font-weight:bold';
  const SILVER = 'color:#C0C0C0;font-style:italic';
  const CROSS  = 'color:#FFD700;font-size:18px;font-weight:bold';
  const WARN   = 'color:#ff4444;font-weight:bold;font-size:12px';
  const DIM    = 'color:#888;font-size:11px';
  const HEADER = [
    'background:linear-gradient(135deg,#1a0000 0%,#5c2800 40%,#1a0000 100%)',
    'color:#FFD700',
    'font-size:13px',
    'font-weight:bold',
    'padding:10px 24px',
    'border-radius:6px',
    'letter-spacing:3px',
    'display:block',
  ].join(';');

  console.log('%c  ✝   MEDALHA DE SÃO BENTO   ✝  ', HEADER);
  console.log('%c', DIM);
  console.log('%c             · · ·  P A X  · · ·', GOLD);
  console.log('%c          · ╭──────────────────╮ ·', GOLD);
  console.log('%c    V·R·S·  │  C  ·  │  ·  S  │  ·S·M·Q', GOLD);
  console.log('%c    N·S·M·  │─ ─ ─ ─ ╪ ─ ─ ─ ─│  ·L·I·V', GOLD);
  console.log('%c      V·    │ C·S·S·M·╬·N·D·S  │   ·B·  ', GOLD);
  console.log('%c            │ ─ ─ ─ ─ M ─ ─ ─ ─│         ', GOLD);
  console.log('%c            │ ─ ─ ─ ─ L ─ ─ ─ ─│         ', GOLD);
  console.log('%c            │  P  ·  │  ·  B  │         ', GOLD);
  console.log('%c          · ╰──────────────────╯ ·', GOLD);
  console.log('%c             · · · VADE RETRO · · ·', CROSS);
  console.log('%c                  S A T A N A', CROSS);
  console.log('%c', DIM);
  console.log('%cCrux Sancti Patris Benedicti  ·  Crux Sacra Sit Mihi Lux', SILVER);
  console.log('%cNon Draco Sit Mihi Dux        ·  Vade Retro Satana!', SILVER);
  console.log('%c', DIM);
  console.log(
    '%c⚠ ATENÇÃO  %cSe você está aqui para invadir ou explorar este sistema: toda tentativa está sendo registrada. Art. 154-A CP.',
    WARN, DIM,
  );
  console.log('%c🛡️  Ximinoze protege este app.', DIM);
  console.log('%c', DIM);
})();
// ─────────────────────────────────────────────────────────────────────────────

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
