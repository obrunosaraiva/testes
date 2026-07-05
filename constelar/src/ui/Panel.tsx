import { useState } from 'react'
import { useStore, genderColor } from '../store'
import type { Gender, Age } from '../store'
import { useT } from '../i18n'

const GENDERS: { value: Gender; key: string }[] = [
  { value: 'masculino', key: 'gender.male' },
  { value: 'feminino', key: 'gender.female' },
  { value: 'unissex', key: 'gender.unisex' },
]

const AGES: { value: Age; key: string }[] = [
  { value: 'crianca', key: 'age.child' },
  { value: 'adulto', key: 'age.adult' },
  { value: 'idoso', key: 'age.elder' },
]

const SWATCHES = ['#5b8def', '#e879a6', '#8b8f9a', '#e0b64d', '#6ec08a', '#c96f5a', '#9a6dd7', '#4a4a4a']

/** Painel esquerdo: montar a sala + adicionar bonecos ao campo. */
export function LeftPanel() {
  const ambiance = useStore((s) => s.ambiance)
  const setAmbiance = useStore((s) => s.setAmbiance)
  const addDoll = useStore((s) => s.addDoll)
  const t = useT()

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
      <h2>{t('room.title')}</h2>

      <div className="group">
        <label className="field-label">{t('room.light')}</label>
        <div className="seg">
          {(['warm', 'neutral', 'penumbra'] as const).map((m) => (
            <button
              key={m}
              className={ambiance.light === m ? 'seg-btn active' : 'seg-btn'}
              onClick={() => setAmbiance({ light: m })}
            >
              {t(`light.${m}`)}
            </button>
          ))}
        </div>
      </div>

      <div className="group">
        <label className="field-label">{t('room.field')}</label>
        <div className="seg">
          <button
            className={ambiance.field === 'wood' ? 'seg-btn active' : 'seg-btn'}
            onClick={() => setAmbiance({ field: 'wood' })}
          >
            {t('field.wood')}
          </button>
          <button
            className={ambiance.field === 'water' ? 'seg-btn active' : 'seg-btn'}
            onClick={() => setAmbiance({ field: 'water' })}
          >
            {t('field.water')}
          </button>
        </div>
      </div>

      <div className="group toggles">
        <label className="toggle">
          <input type="checkbox" checked={ambiance.incense} onChange={(e) => setAmbiance({ incense: e.target.checked })} />
          {t('room.incense')}
        </label>
        <label className="toggle">
          <input type="checkbox" checked={ambiance.music} onChange={(e) => setAmbiance({ music: e.target.checked })} />
          {t('room.music')}
        </label>
      </div>

      <hr />

      <h2>{t('doll.add')}</h2>
      <div className="group">
        <input
          className="text-input"
          placeholder={t('doll.labelPlaceholder')}
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
        />
      </div>

      <div className="group">
        <label className="field-label">{t('doll.represents')}</label>
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
              {t(g.key)}
            </button>
          ))}
        </div>
      </div>

      <div className="group">
        <label className="field-label">{t('doll.age')}</label>
        <div className="seg">
          {AGES.map((a) => (
            <button
              key={a.value}
              className={age === a.value ? 'seg-btn active' : 'seg-btn'}
              onClick={() => setAge(a.value)}
            >
              {t(a.key)}
            </button>
          ))}
        </div>
      </div>

      <div className="group">
        <label className="field-label">{t('doll.color')}</label>
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
        {t('doll.place')}
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
  const role = useStore((s) => s.role)
  const canEdit = useStore((s) => s.role !== 'guest' || s.ambiance.allowGuestMove)
  const isGuest = role === 'guest'
  const t = useT()

  const doll = dolls.find((d) => d.id === selectedId)
  if (!doll) {
    return (
      <aside className="panel panel-right empty">
        <p className="hint">{isGuest && !canEdit ? t('right.therapistLeading') : t('right.empty')}</p>
      </aside>
    )
  }

  if (!canEdit) {
    return (
      <aside className="panel panel-right">
        <h2>{doll.label || t('doll.one')}</h2>
        <p className="hint">{t('right.observeOnly')}</p>
      </aside>
    )
  }

  return (
    <aside className="panel panel-right">
      <h2>{doll.label || t('doll.one')}</h2>

      <div className="group">
        <label className="field-label">{t('doll.label')}</label>
        <input className="text-input" value={doll.label} onChange={(e) => updateDoll(doll.id, { label: e.target.value })} />
      </div>

      <div className="group">
        <label className="field-label">
          {t('doll.gaze')} <span className="deg">{Math.round((doll.rotation * 180) / Math.PI)}°</span>
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
          <input type="checkbox" checked={doll.laying} onChange={(e) => updateDoll(doll.id, { laying: e.target.checked })} />
          {t('doll.lying')}
        </label>
      </div>

      <div className="group">
        <label className="field-label">{t('doll.color')}</label>
        <div className="swatches">
          {SWATCHES.map((c) => (
            <button
              key={c}
              className={doll.color === c ? 'swatch active' : 'swatch'}
              style={{ background: c }}
              onClick={() => updateDoll(doll.id, { color: c })}
            />
          ))}
        </div>
      </div>

      {!isGuest && (
        <button className="btn-danger" onClick={() => removeDoll(doll.id)}>
          {t('doll.remove')}
        </button>
      )}
    </aside>
  )
}
