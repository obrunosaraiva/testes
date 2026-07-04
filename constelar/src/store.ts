import { create } from 'zustand'

export type Gender = 'masculino' | 'feminino' | 'unissex'
export type Age = 'crianca' | 'adulto' | 'idoso'
export type LightMode = 'warm' | 'neutral' | 'penumbra'
export type FieldMode = 'wood' | 'water'
export type Role = 'solo' | 'host' | 'guest'
export type Conn = 'offline' | 'connecting' | 'online'

export interface Doll {
  id: string
  label: string
  gender: Gender
  age: Age
  color: string
  x: number
  z: number
  /** rotação em radianos — a direção do olhar é fundamental na constelação */
  rotation: number
  /** deitado representa fragilidade, entrega, morte */
  laying: boolean
}

export interface Ambiance {
  light: LightMode
  field: FieldMode
  incense: boolean
  music: boolean
  /** o terapeuta (host) decide se o cliente pode mover bonecos */
  allowGuestMove: boolean
}

/** Mensagens trocadas entre terapeuta e cliente pela rede. */
export type NetMsg =
  | { t: 'state'; dolls: Doll[]; ambiance: Ambiance }
  | { t: 'doll:add'; doll: Doll }
  | { t: 'doll:update'; id: string; patch: Partial<Doll> }
  | { t: 'doll:remove'; id: string }
  | { t: 'ambiance'; patch: Partial<Ambiance> }
  | { t: 'phrase'; phrase: string | null }
  | { t: 'clear' }
  | { t: 'presence'; count: number }

interface State {
  dolls: Doll[]
  selectedId: string | null
  ambiance: Ambiance

  currentPhrase: string | null

  // sessão / rede
  role: Role
  conn: Conn
  roomId: string | null
  participants: number

  // ações locais (aplicam + emitem para a rede)
  addDoll: (partial: Partial<Doll>) => void
  updateDoll: (id: string, patch: Partial<Doll>) => void
  removeDoll: (id: string) => void
  select: (id: string | null) => void
  clearField: () => void
  setAmbiance: (patch: Partial<Ambiance>) => void
  setPhrase: (p: string | null) => void

  // sessão
  setSession: (patch: Partial<Pick<State, 'role' | 'conn' | 'roomId' | 'participants'>>) => void
  /** aplica uma mensagem vinda da rede SEM reemitir (evita loop) */
  remoteApply: (msg: NetMsg) => void
  /** true se este usuário pode manipular o campo */
  canEdit: () => boolean
}

const GENDER_COLOR: Record<Gender, string> = {
  masculino: '#5b8def',
  feminino: '#e879a6',
  unissex: '#8b8f9a',
}

const uid = (): string =>
  typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `d-${Math.random().toString(36).slice(2)}`

// posiciona bonecos novos em espiral suave para não empilhar
function spawnPosition(index: number): { x: number; z: number } {
  const angle = index * 2.399963 // ângulo áureo
  const radius = 0.5 + index * 0.18
  return { x: Math.cos(angle) * radius, z: Math.sin(angle) * radius }
}

// --- camada de emissão para a rede (registrada por net.ts) ---
let emitFn: ((msg: NetMsg) => void) | null = null
export function registerEmit(fn: ((msg: NetMsg) => void) | null) {
  emitFn = fn
}
const emit = (msg: NetMsg) => emitFn?.(msg)

export const DEFAULT_AMBIANCE: Ambiance = {
  light: 'warm',
  field: 'wood',
  incense: true,
  music: false,
  allowGuestMove: true,
}

export const useStore = create<State>((set, get) => ({
  dolls: [],
  selectedId: null,
  ambiance: { ...DEFAULT_AMBIANCE },
  currentPhrase: null,

  role: 'solo',
  conn: 'offline',
  roomId: null,
  participants: 1,

  addDoll: (partial) => {
    const gender = partial.gender ?? 'unissex'
    const pos = spawnPosition(get().dolls.length)
    const doll: Doll = {
      id: uid(),
      label: partial.label ?? '',
      gender,
      age: partial.age ?? 'adulto',
      color: partial.color ?? GENDER_COLOR[gender],
      x: partial.x ?? pos.x,
      z: partial.z ?? pos.z,
      rotation: partial.rotation ?? 0,
      laying: partial.laying ?? false,
    }
    set((s) => ({ dolls: [...s.dolls, doll], selectedId: doll.id }))
    emit({ t: 'doll:add', doll })
  },

  updateDoll: (id, patch) => {
    set((s) => ({ dolls: s.dolls.map((d) => (d.id === id ? { ...d, ...patch } : d)) }))
    emit({ t: 'doll:update', id, patch })
  },

  removeDoll: (id) => {
    set((s) => ({
      dolls: s.dolls.filter((d) => d.id !== id),
      selectedId: s.selectedId === id ? null : s.selectedId,
    }))
    emit({ t: 'doll:remove', id })
  },

  select: (id) => set({ selectedId: id }), // seleção é local (não sincroniza)

  clearField: () => {
    set({ dolls: [], selectedId: null })
    emit({ t: 'clear' })
  },

  setAmbiance: (patch) => {
    set((s) => ({ ambiance: { ...s.ambiance, ...patch } }))
    emit({ t: 'ambiance', patch })
  },

  setPhrase: (p) => {
    set({ currentPhrase: p })
    emit({ t: 'phrase', phrase: p })
  },

  setSession: (patch) => set(patch),

  remoteApply: (msg) =>
    set((s) => {
      switch (msg.t) {
        case 'state':
          return { dolls: msg.dolls, ambiance: msg.ambiance }
        case 'doll:add':
          if (s.dolls.some((d) => d.id === msg.doll.id)) return {}
          return { dolls: [...s.dolls, msg.doll] }
        case 'doll:update':
          return { dolls: s.dolls.map((d) => (d.id === msg.id ? { ...d, ...msg.patch } : d)) }
        case 'doll:remove':
          return {
            dolls: s.dolls.filter((d) => d.id !== msg.id),
            selectedId: s.selectedId === msg.id ? null : s.selectedId,
          }
        case 'ambiance':
          return { ambiance: { ...s.ambiance, ...msg.patch } }
        case 'phrase':
          return { currentPhrase: msg.phrase }
        case 'clear':
          return { dolls: [], selectedId: null }
        case 'presence':
          return { participants: msg.count }
        default:
          return {}
      }
    }),

  canEdit: () => {
    const s = get()
    return s.role !== 'guest' || s.ambiance.allowGuestMove
  },
}))

export const genderColor = (g: Gender) => GENDER_COLOR[g]
