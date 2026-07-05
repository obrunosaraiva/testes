import { useLangStore, LANGS } from '../i18n'

/** Seletor de idioma (pt-BR, pt-PT, EN, ES, DE). */
export function LanguageSelector() {
  const lang = useLangStore((s) => s.lang)
  const setLang = useLangStore((s) => s.setLang)
  const current = LANGS.find((l) => l.code === lang)

  return (
    <label className="lang-select" title="Idioma / Language">
      <span className="lang-flag">{current?.flag}</span>
      <select value={lang} onChange={(e) => setLang(e.target.value as typeof lang)}>
        {LANGS.map((l) => (
          <option key={l.code} value={l.code}>
            {l.flag} {l.label}
          </option>
        ))}
      </select>
    </label>
  )
}
