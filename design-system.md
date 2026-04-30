# Kanban Pro — Design System

---

## 1. Tokens de Cor

### Modo Escuro (padrão — `:root`)

| Token | Valor | Uso |
|-------|-------|-----|
| `--bg` | `#0f1117` | Fundo principal da página |
| `--surface` | `#1a1d27` | Superfície primária (header, coluna, modal) |
| `--surface2` | `#222636` | Superfície secundária (card, input, badge) |
| `--surface3` | `#2a2f45` | Superfície terciária (hover, items selecionados) |
| `--border` | `#2e3348` | Bordas e divisores |
| `--text` | `#e8eaf0` | Texto principal |
| `--text-muted` | `#6b7280` | Texto secundário / placeholder |
| `--accent` | `#6366f1` | Cor de destaque principal (Indigo) |
| `--accent2` | `#818cf8` | Accent hover / variante clara |
| `--success` | `#22c55e` | Verde — sucesso, concluído |
| `--warning` | `#f59e0b` | Amarelo — aviso, em andamento |
| `--danger` | `#ef4444` | Vermelho — erro, urgente |
| `--info` | `#3b82f6` | Azul — informação |

### Modo Claro (`:root.light`)

| Token | Valor |
|-------|-------|
| `--bg` | `#f3f4f8` |
| `--surface` | `#ffffff` |
| `--surface2` | `#f0f1f5` |
| `--surface3` | `#e4e6ed` |
| `--border` | `#d1d5db` |
| `--text` | `#111827` |
| `--text-muted` | `#6b7280` |
| `--accent` | `#6366f1` |
| `--accent2` | `#4f46e5` |
| `--success` | `#16a34a` |
| `--warning` | `#d97706` |
| `--danger` | `#dc2626` |
| `--info` | `#2563eb` |

### Status do Board (Kanban columns)

| Token | Dark | Light | Coluna |
|-------|------|-------|--------|
| `--backlog` | `#6b7280` | `#6b7280` | Backlog |
| `--todo` | `#3b82f6` | `#2563eb` | To Do |
| `--doing` | `#f59e0b` | `#d97706` | Doing |
| `--paused` | `#ef4444` | `#dc2626` | Pausado |
| `--review` | `#a855f7` | `#9333ea` | Review |
| `--done` | `#22c55e` | `#16a34a` | Done |

---

## 2. Tipografia

| Propriedade | Valor |
|-------------|-------|
| Font family | `'Inter', system-ui, -apple-system, sans-serif` |
| Base size | `14px` |
| Base color | `var(--text)` |

### Escala de tamanhos em uso

| Uso | Tamanho |
|-----|---------|
| Header principal (Kanban Pro) | `1.1rem` |
| Título de modal | `1rem` |
| Botão / label | `.85rem` |
| Título de card | `.88rem` |
| Texto de campo / view-btn | `.82rem` |
| Texto secundário / badge | `.78rem` |
| Field label / meta | `.75rem` |
| Tag de projeto / urgência | `.68rem` |
| Mini (data, contador) | `.65rem` |

---

## 3. Espaçamento & Layout

### Grid helpers

| Classe | Colunas |
|--------|---------|
| `.form-grid-2` | `1fr 1fr` |
| `.form-grid-3` | `1fr 1fr 140px` |
| `.form-grid-cl` | `1fr 140px 110px` |
| `.form-grid-4` | `repeat(4, 1fr)` |

### Layout principal

```css
.app-layout {
  display: flex;
  flex-direction: column;
  height: 100vh;
  overflow: hidden;
}
```

### Board

- Padding: `20px 24px`
- Gap entre colunas: `16px`
- Largura de coluna: `280px` (fixo, `flex-shrink: 0`)
- Overflow horizontal com scroll

---

## 4. Border Radius

| Contexto | Valor |
|----------|-------|
| Modal | `16px` (mobile: `20px 20px 0 0`) |
| Coluna | `14px` |
| Card | `10px` |
| Botão / input | `8px` |
| Badge / pill | `10–20px` |
| Dot / avatar | `50%` |
| Progress bar | `2–3px` |

---

## 5. Componentes

### Botões

```css
/* Base */
.btn { padding: 8px 16px; border-radius: 8px; font-size: .85rem; font-weight: 500; }

/* Variantes */
.btn-primary  { background: var(--accent); color: #fff; }
.btn-ghost    { background: var(--surface2); border: 1px solid var(--border); }
.btn-danger   { background: transparent; color: var(--danger); border: 1px solid var(--danger); }
```

| Variante | Background | Cor | Hover |
|----------|-----------|-----|-------|
| `.btn-primary` | `var(--accent)` | `#fff` | `var(--accent2)` |
| `.btn-ghost` | `var(--surface2)` | `var(--text)` | border + text → accent |
| `.btn-danger` | transparent | `var(--danger)` | bg danger, text branco |

### View Button (header nav)

```css
.view-btn {
  padding: 6px 14px; border-radius: 8px;
  background: var(--surface2); border: 1px solid var(--border);
  color: var(--text-muted); font-size: .82rem; font-weight: 500;
}
.view-btn.active { background: var(--accent); border-color: var(--accent); color: #fff; }
```

### Icon Button

```css
.icon-btn {
  background: none; border: 1px solid var(--border); border-radius: 8px;
  color: var(--text-muted); padding: 5px 10px; font-size: .9rem;
}
.icon-btn:hover { border-color: var(--accent); color: var(--text); }
```

### Inputs / Textarea / Select

```css
/* Base */
background: var(--surface2);
border: 1px solid var(--border);
border-radius: 8px;
color: var(--text);
font-size: .9rem;
padding: 8px 12px;
height: 38px; /* input/select */

/* Focus */
border-color: var(--accent);
```

### Field Label

```css
.field-label {
  font-size: .75rem;
  color: var(--text-muted);
  display: block;
  margin-bottom: 4px;
}
```

---

## 6. Modal

```css
.modal-overlay {
  position: fixed; inset: 0;
  background: rgba(0,0,0,.6);
  display: flex; align-items: center; justify-content: center;
  z-index: 1000;
}
.modal {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 16px;
  width: 90vw; max-width: 680px; max-height: 90vh;
}
.modal-head  { padding: 20px 24px 0; }
.modal-body  { padding: 20px 24px 24px; }
.modal-body > * + * { margin-top: 14px; }
```

**Mobile:** bottom sheet — `border-radius: 20px 20px 0 0`, `width: 100vw`, `max-height: 92vh`

---

## 7. Cards

```css
.card {
  background: var(--surface2);
  border: 1px solid var(--border);
  border-radius: 10px;
  padding: 12px;
  transition: border-color .15s, transform .1s;
}
.card:hover { border-color: var(--accent); transform: translateY(-1px); }
```

### Color Bar (topo do card)

| Classe | Cor |
|--------|-----|
| `.card-c-red` | `#ef4444` |
| `.card-c-orange` | `#f97316` |
| `.card-c-yellow` | `#eab308` |
| `.card-c-green` | `#22c55e` |
| `.card-c-blue` | `#3b82f6` |
| `.card-c-purple` | `#a855f7` |
| `.card-c-pink` | `#ec4899` |

### Project Tags (`.card-proj-tag`)

| Classe | Background | Texto |
|--------|-----------|-------|
| `.pc0` | `rgba(99,102,241,.15)` | `#818cf8` |
| `.pc1` | `rgba(34,197,94,.15)` | `#4ade80` |
| `.pc2` | `rgba(245,158,11,.15)` | `#fbbf24` |
| `.pc3` | `rgba(239,68,68,.15)` | `#f87171` |
| `.pc4` | `rgba(59,130,246,.15)` | `#60a5fa` |
| `.pc5` | `rgba(168,85,247,.15)` | `#c084fc` |
| `.pc6` | `rgba(236,72,153,.15)` | `#f472b6` |
| `.pc7` | `rgba(20,184,166,.15)` | `#2dd4bf` |

### Urgency Badges (`.urgency-badge`)

| Classe | Label | Background | Texto |
|--------|-------|-----------|-------|
| `.urgency-low` | Baixa | `rgba(34,197,94,.15)` | `#4ade80` |
| `.urgency-medium` | Média | `rgba(245,158,11,.15)` | `#fbbf24` |
| `.urgency-high` | Alta | `rgba(239,68,68,.15)` | `#f87171` |
| `.urgency-critical` | Crítica | `rgba(239,68,68,.3)` | `#ef4444` |

---

## 8. Task Statuses (taskStatus)

| Valor | Emoji | Label |
|-------|-------|-------|
| `pendente` | ⚪ | Pendente |
| `solicitado` | 🟠 | Solicitado |
| `andamento` | 🔵 | Andamento |
| `revisao` | 🩷 | Revisão |
| `correcao` | 🟡 | Correção necessária |
| `concluido` | 🟢 | Concluído |
| `cancelado` | ⚫ | Cancelado |
| `atrasado` | 🔴 | Atrasado |
| `impedimento_interno` | 🟧 | Impedimento Interno |
| `impedimento_externo` | 🟪 | Impedimento Externo |

---

## 9. Animações

```css
@keyframes fadeIn    { from { opacity: 0 } to { opacity: 1 } }
@keyframes slideUp   { from { transform: translateY(12px); opacity: 0 } to { transform: translateY(0); opacity: 1 } }
@keyframes slideInRight { from { transform: translateX(100%) } to { transform: translateX(0) } }
```

Transições padrão: `all .15s` / `all .2s`

---

## 10. Scrollbar

```css
::-webkit-scrollbar         { width: 6px; height: 6px; }
::-webkit-scrollbar-track   { background: transparent; }
::-webkit-scrollbar-thumb   { background: var(--border); border-radius: 3px; }
::-webkit-scrollbar-thumb:hover { background: var(--text-muted); }
```

---

## 11. Responsive

**Breakpoint único:** `max-width: 768px`

| Contexto | Desktop | Mobile |
|----------|---------|--------|
| `.desktop-only` | `display: flex` | `display: none` |
| `.mobile-only` | `display: none` | `display: flex` |
| Modal | centro, `max-width: 680px` | bottom sheet, full width |
| `.form-grid-2` | `1fr 1fr` | `1fr` |
| `.form-grid-3` | `1fr 1fr 140px` | `1fr 1fr` |
| `.form-grid-4` | `repeat(4,1fr)` | `repeat(2,1fr)` |
| Input font-size | `.9rem` | `16px` (evita zoom iOS) |
| Botão padding | `8px 16px` | `10px 18px` |
| `.modal-actions` | `flex-row` | `flex-column-reverse` |
| `.cc-filter-row` | sempre visível | colapsável por toggle |

---

## 12. Gradiente do Logo

```css
background: linear-gradient(135deg, var(--accent), var(--info));
-webkit-background-clip: text;
-webkit-text-fill-color: transparent;
```

---

## 13. Gantt

| Classe | Descrição |
|--------|-----------|
| `.gantt-label-col` | Coluna fixa de labels — `240px` |
| `.gantt-day-header` | Célula de dia — `40px` |
| `.gantt-bar` | Barra de tarefa — `height: 28px`, `border-radius: 6px` |
| `.gantt-bar-event` | Barra de evento — `background: #f59e0b`, `height: 36px` |
| `.gantt-today-line` | Linha vertical do dia atual — `2px`, `var(--accent)`, `opacity: .6` |

---

*Gerado em 10/04/2026 — Kanban Pro*
