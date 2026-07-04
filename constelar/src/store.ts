import { create } from 'zustand'

export type Gender = 'masculino' | 'feminino' | 'unissex'
export type Age = 'crianca' | 'adulto' | 'idoso'
export type LightMode = 'warm' | 'neutral' | 'penumbra'
export type FieldMode = 'wood' | 'water'

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
}

interface State {
  dolls: Doll[]
  selectedId: string | null
  ambiance: Ambiance
  currentPhrase: string | null

  addDoll: (partial: Partial<Doll>) => void
  updateDoll: (id: string, patch: Partial<Doll>) => void
  removeDoll: (id: string) => void
  select: (id: string | null) => void
  clearField: () => void
  setAmbiance: (patch: Partial<Ambiance>) => void
  setPhrase: (p: string | null) => void
}

const GENDER_COLOR: Record<Gender, string> = {
  masculino: '#5b8def',
  feminino: '#e879a6',
  unissex: '#8b8f9a',
}

let counter = 0
const nextId = () => `doll-${++counter}`

// posiciona bonecos novos em espiral suave para não empilhar
function spawnPosition(index: number): { x: number; z: number } {
  const angle = index * 2.399963 // ângulo áureo
  const radius = 0.5 + index * 0.18
  return { x: Math.cos(angle) * radius, z: Math.sin(angle) * radius }
}

export const useStore = create<State>((set, get) => ({
  dolls: [],
  selectedId: null,
  ambiance: { light: 'warm', field: 'wood', incense: true, music: false },
  currentPhrase: null,

  addDoll: (partial) =>
    set((s) => {
      const gender = partial.gender ?? 'unissex'
      const pos = spawnPosition(s.dolls.length)
      const doll: Doll = {
        id: nextId(),
        label: partial.label ?? '',
        gender,
        age: partial.age ?? 'adulto',
        color: partial.color ?? GENDER_COLOR[gender],
        x: partial.x ?? pos.x,
        z: partial.z ?? pos.z,
        rotation: partial.rotation ?? 0,
        laying: partial.laying ?? false,
      }
      return { dolls: [...s.dolls, doll], selectedId: doll.id }
    }),

  updateDoll: (id, patch) =>
    set((s) => ({
      dolls: s.dolls.map((d) => (d.id === id ? { ...d, ...patch } : d)),
    })),

  removeDoll: (id) =>
    set((s) => ({
      dolls: s.dolls.filter((d) => d.id !== id),
      selectedId: s.selectedId === id ? null : s.selectedId,
    })),

  select: (id) => set({ selectedId: id }),

  clearField: () => set({ dolls: [], selectedId: null }),

  setAmbiance: (patch) => set((s) => ({ ambiance: { ...s.ambiance, ...patch } })),

  setPhrase: (p) => set({ currentPhrase: p }),
}))

export const genderColor = (g: Gender) => GENDER_COLOR[g]
