import { useState } from 'react'
import { useStore, genderColor } from '../store'
import type { Gender, Age } from '../store'

const GENDERS: { value: Gender; label: string }[] = [
  { value: 'masculino', label: 'Masculino' },
  { value: 'feminino', label: 'Feminino' },
  { value: 'unissex', label: 'Unissex' },
]

const AGES: { value: Age; label: string }[] = [
  { value: 'crianca', label: 'Criança' },
  { value: 'adulto', label: 'Adulto' },
  { value: 'idoso', label: 'Idoso' },
]

const SWATCHES = ['#5b8def', '#e879a6', '#8b8f9a', '#e0b64d', '#6ec08a', '#c96f5a', '#9a6dd7', '#4a4a4a']

/** Painel esquerdo: montar a sala + adicionar bonecos ao campo. */
export function LeftPanel() {
  const ambiance = useStore((s) => s.ambiance)
  const setAmbiance = useStore((s) => s.setAmbiance)
  const addDoll = useStore((s) => s.addDoll)

  const [label, setLabel] = useState('')
  const [gender, setGender] = useState<Gender>('feminino')
  const [age, setAge] = useState<Age>('adulto')
  const [color, setColor] = useState<string>(genderColor('feminino'))

  const handleAdd = () => {
    addDoll({ label: label.trim(), gender, age, color })
    setLabel('')
  }

  return (
    <aside className="panel panel-left">
      <h2>Sua sala</h2>

      <div className="group">
        <label className="field-label">Iluminação</label>
        <div className="seg">
          {(['warm', 'neutral', 'penumbra'] as const).map((m) => (
            <button
              key={m}
              className={ambiance.light === m ? 'seg-btn active' : 'seg-btn'}
              onClick={() => setAmbiance({ light: m })}
            >
              {m === 'warm' ? 'Quente' : m === 'neutral' ? 'Neutra' : 'Penumbra'}
            </button>
          ))}
        </div>
      </div>

      <div className="group">
        <label className="field-label">Campo</label>
        <div className="seg">
          <button
            className={ambiance.field === 'wood' ? 'seg-btn active' : 'seg-btn'}
            onClick={() => setAmbiance({ field: 'wood' })}
          >
            Madeira
          </button>
          <button
            className={ambiance.field === 'water' ? 'seg-btn active' : 'seg-btn'}
            onClick={() => setAmbiance({ field: 'water' })}
          >
            Água
          </button>
        </div>
      </div>

      <div className="group toggles">
        <label className="toggle">
          <input
            type="checkbox"
            checked={ambiance.incense}
            onChange={(e) => setAmbiance({ incense: e.target.checked })}
          />
          Incenso
        </label>
        <label className="toggle">
          <input
            type="checkbox"
            checked={ambiance.music}
            onChange={(e) => setAmbiance({ music: e.target.checked })}
          />
          Som ambiente
        </label>
      </div>

      <hr />

      <h2>Adicionar boneco</h2>
      <div className="group">
        <input
          className="text-input"
          placeholder="Rótulo (ex.: Mãe, Vovô, O excluído)"
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
        />
      </div>

      <div className="group">
        <label className="field-label">Representa</label>
        <div className="seg">
          {GENDERS.map((g) => (
            <button
              key={g.value}
              className={gender === g.value ? 'seg-btn active' : 'seg-btn'}
              onClick={() => {
                setGender(g.value)
                setColor(genderColor(g.value))
              }}
            >
              {g.label}
            </button>
          ))}
        </div>
      </div>

      <div className="group">
        <label className="field-label">Idade</label>
        <div className="seg">
          {AGES.map((a) => (
            <button
              key={a.value}
              className={age === a.value ? 'seg-btn active' : 'seg-btn'}
              onClick={() => setAge(a.value)}
            >
              {a.label}
            </button>
          ))}
        </div>
      </div>

      <div className="group">
        <label className="field-label">Cor</label>
        <div className="swatches">
          {SWATCHES.map((c) => (
            <button
              key={c}
              className={color === c ? 'swatch active' : 'swatch'}
              style={{ background: c }}
              onClick={() => setColor(c)}
              aria-label={c}
            />
          ))}
        </div>
      </div>

      <button className="btn-primary" onClick={handleAdd}>
        + Colocar no campo
      </button>
    </aside>
  )
}

/** Painel direito: editar o boneco selecionado (posição feita arrastando no campo). */
export function RightPanel() {
  const dolls = useStore((s) => s.dolls)
  const selectedId = useStore((s) => s.selectedId)
  const updateDoll = useStore((s) => s.updateDoll)
  const removeDoll = useStore((s) => s.removeDoll)

  const doll = dolls.find((d) => d.id === selectedId)
  if (!doll) {
    return (
      <aside className="panel panel-right empty">
        <p className="hint">
          Clique num boneco para editá-lo.
          <br />
          Arraste para posicionar. A ponta clara mostra a direção do olhar.
        </p>
      </aside>
    )
  }

  return (
    <aside className="panel panel-right">
      <h2>{doll.label || 'Boneco'}</h2>

      <div className="group">
        <label className="field-label">Rótulo</label>
        <input
          className="text-input"
          value={doll.label}
          onChange={(e) => updateDoll(doll.id, { label: e.target.value })}
        />
      </div>

      <div className="group">
        <label className="field-label">
          Direção do olhar <span className="deg">{Math.round((doll.rotation * 180) / Math.PI)}°</span>
        </label>
        <input
          type="range"
          min={-180}
          max={180}
          value={Math.round((doll.rotation * 180) / Math.PI)}
          onChange={(e) => updateDoll(doll.id, { rotation: (Number(e.target.value) * Math.PI) / 180 })}
        />
      </div>

      <div className="group toggles">
        <label className="toggle">
          <input
            type="checkbox"
            checked={doll.laying}
            onChange={(e) => updateDoll(doll.id, { laying: e.target.checked })}
          />
          Deitado
        </label>
      </div>

      <div className="group">
        <label className="field-label">Cor</label>
        <div className="swatches">
          {['#5b8def', '#e879a6', '#8b8f9a', '#e0b64d', '#6ec08a', '#c96f5a', '#9a6dd7', '#4a4a4a'].map((c) => (
            <button
              key={c}
              className={doll.color === c ? 'swatch active' : 'swatch'}
              style={{ background: c }}
              onClick={() => updateDoll(doll.id, { color: c })}
            />
          ))}
        </div>
      </div>

      <button className="btn-danger" onClick={() => removeDoll(doll.id)}>
        Remover do campo
      </button>
    </aside>
  )
}
