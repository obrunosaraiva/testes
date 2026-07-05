import { create } from 'zustand'

export type Lang = 'pt-BR' | 'pt-PT' | 'en' | 'es' | 'de'

export const LANGS: { code: Lang; label: string; flag: string }[] = [
  { code: 'pt-BR', label: 'Português (BR)', flag: '🇧🇷' },
  { code: 'pt-PT', label: 'Português (PT)', flag: '🇵🇹' },
  { code: 'en', label: 'English', flag: '🇬🇧' },
  { code: 'es', label: 'Español', flag: '🇪🇸' },
  { code: 'de', label: 'Deutsch', flag: '🇩🇪' },
]

type Dict = Record<string, string>

const pt_BR: Dict = {
  'app.subtitle': 'campo de constelação sistêmica',
  'session.start': '▶ Iniciar sessão online',
  'session.connectedGuest': 'Conectado à sala do terapeuta',
  'session.connecting': 'Conectando…',
  'session.offline': 'Sem conexão',
  'session.waiting': 'Aguardando o cliente…',
  'session.clientIn': 'Cliente na sala',
  'session.connectedCount': '{n} conectados',
  'session.copyLink': '🔗 Copiar link do cliente',
  'session.copied': '✓ Copiado',
  'session.guestCanMove': 'Cliente pode mover',
  'session.reconnecting': 'Reconectando…',

  'room.title': 'Sua sala',
  'room.light': 'Iluminação',
  'light.warm': 'Quente',
  'light.neutral': 'Neutra',
  'light.penumbra': 'Penumbra',
  'room.field': 'Campo',
  'field.wood': 'Madeira',
  'field.water': 'Água',
  'room.incense': 'Incenso',
  'room.music': 'Som ambiente',

  'doll.add': 'Adicionar boneco',
  'doll.labelPlaceholder': 'Rótulo (ex.: Mãe, Vovô, O excluído)',
  'doll.represents': 'Representa',
  'gender.male': 'Masculino',
  'gender.female': 'Feminino',
  'gender.unisex': 'Unissex',
  'doll.age': 'Idade',
  'age.child': 'Criança',
  'age.adult': 'Adulto',
  'age.elder': 'Idoso',
  'doll.color': 'Cor',
  'doll.place': '+ Colocar no campo',
  'doll.one': 'Boneco',
  'doll.label': 'Rótulo',
  'doll.gaze': 'Direção do olhar',
  'doll.lying': 'Deitado',
  'doll.remove': 'Remover do campo',

  'right.empty': 'Clique num boneco para editá-lo. Arraste para posicionar. A ponta clara mostra a direção do olhar.',
  'right.therapistLeading': 'O terapeuta está conduzindo. Acompanhe o campo.',
  'right.observeOnly': 'Você pode observar. O terapeuta libera o movimento quando fizer sentido.',

  'anchor.add': '+ Âncora / papel',
  'anchor.placeholder': 'Nome da âncora (ex.: Dinheiro, Pátria)',
  'link.mode': 'Ligar vínculos',
  'link.hint': 'Clique em dois bonecos para criar/remover um vínculo.',

  'bar.phrase': '🃏 Frase sistêmica',
  'bar.snapshot': '📸 Imagem de solução',
  'bar.saved': '✓ salva na sessão',
  'bar.downloaded': 'baixada (sessão não vinculada)',
  'bar.clear': 'Limpar campo',
  'bar.record': '⏺ Gravar',
  'bar.recording': '⏹ Gravando… {t}',

  'call.audioLabel': 'Áudio da sessão',
  'call.joinAudio': '🎙️ Entrar com áudio',
  'call.joinVideo': '🎥 Com vídeo',
  'call.client': 'Cliente',
  'call.therapist': 'Terapeuta',
  'call.you': 'Você',
  'call.connecting': 'conectando…',
  'call.mediaError': 'Não foi possível acessar microfone/câmera. Verifique as permissões.',

  'consent.title': 'Consentimento para gravação',
  'consent.body':
    'Esta sessão será gravada (campo e vozes) para fins de acompanhamento terapêutico. A gravação é confidencial. É necessário o consentimento do cliente para prosseguir.',
  'consent.agree': 'O cliente consente com a gravação',
  'consent.start': 'Iniciar gravação',
  'consent.cancel': 'Cancelar',
}

const pt_PT: Dict = {
  ...pt_BR,
  'session.guestCanMove': 'Cliente pode mover',
  'age.child': 'Criança',
  'age.elder': 'Idoso',
  'room.music': 'Som ambiente',
  'doll.labelPlaceholder': 'Etiqueta (ex.: Mãe, Avô, O excluído)',
  'doll.lying': 'Deitado',
  'consent.body':
    'Esta sessão será gravada (campo e vozes) para fins de acompanhamento terapêutico. A gravação é confidencial. É necessário o consentimento do cliente para prosseguir.',
  'call.mediaError': 'Não foi possível aceder ao microfone/câmara. Verifique as permissões.',
}

const en: Dict = {
  'app.subtitle': 'systemic constellation field',
  'session.start': '▶ Start online session',
  'session.connectedGuest': "Connected to the therapist's room",
  'session.connecting': 'Connecting…',
  'session.offline': 'Offline',
  'session.waiting': 'Waiting for the client…',
  'session.clientIn': 'Client in the room',
  'session.connectedCount': '{n} connected',
  'session.copyLink': '🔗 Copy client link',
  'session.copied': '✓ Copied',
  'session.guestCanMove': 'Client can move',
  'session.reconnecting': 'Reconnecting…',

  'room.title': 'Your room',
  'room.light': 'Lighting',
  'light.warm': 'Warm',
  'light.neutral': 'Neutral',
  'light.penumbra': 'Dim',
  'room.field': 'Field',
  'field.wood': 'Wood',
  'field.water': 'Water',
  'room.incense': 'Incense',
  'room.music': 'Ambient sound',

  'doll.add': 'Add figure',
  'doll.labelPlaceholder': 'Label (e.g. Mother, Grandpa, The excluded)',
  'doll.represents': 'Represents',
  'gender.male': 'Male',
  'gender.female': 'Female',
  'gender.unisex': 'Unisex',
  'doll.age': 'Age',
  'age.child': 'Child',
  'age.adult': 'Adult',
  'age.elder': 'Elder',
  'doll.color': 'Color',
  'doll.place': '+ Place on field',
  'doll.one': 'Figure',
  'doll.label': 'Label',
  'doll.gaze': 'Gaze direction',
  'doll.lying': 'Lying down',
  'doll.remove': 'Remove from field',

  'right.empty': 'Click a figure to edit it. Drag to position. The light tip shows the gaze direction.',
  'right.therapistLeading': 'The therapist is leading. Follow the field.',
  'right.observeOnly': 'You can watch. The therapist enables movement when it makes sense.',

  'anchor.add': '+ Anchor / paper',
  'anchor.placeholder': 'Anchor name (e.g. Money, Homeland)',
  'link.mode': 'Link bonds',
  'link.hint': 'Click two figures to create/remove a bond.',

  'bar.phrase': '🃏 Systemic phrase',
  'bar.snapshot': '📸 Solution image',
  'bar.saved': '✓ saved to session',
  'bar.downloaded': 'downloaded (no linked session)',
  'bar.clear': 'Clear field',
  'bar.record': '⏺ Record',
  'bar.recording': '⏹ Recording… {t}',

  'call.audioLabel': 'Session audio',
  'call.joinAudio': '🎙️ Join with audio',
  'call.joinVideo': '🎥 With video',
  'call.client': 'Client',
  'call.therapist': 'Therapist',
  'call.you': 'You',
  'call.connecting': 'connecting…',
  'call.mediaError': 'Could not access microphone/camera. Check permissions.',

  'consent.title': 'Recording consent',
  'consent.body':
    'This session will be recorded (field and voices) for therapeutic follow-up. The recording is confidential. The client’s consent is required to proceed.',
  'consent.agree': 'The client consents to the recording',
  'consent.start': 'Start recording',
  'consent.cancel': 'Cancel',
}

const es: Dict = {
  'app.subtitle': 'campo de constelación sistémica',
  'session.start': '▶ Iniciar sesión en línea',
  'session.connectedGuest': 'Conectado a la sala del terapeuta',
  'session.connecting': 'Conectando…',
  'session.offline': 'Sin conexión',
  'session.waiting': 'Esperando al cliente…',
  'session.clientIn': 'Cliente en la sala',
  'session.connectedCount': '{n} conectados',
  'session.copyLink': '🔗 Copiar enlace del cliente',
  'session.copied': '✓ Copiado',
  'session.guestCanMove': 'El cliente puede mover',
  'session.reconnecting': 'Reconectando…',

  'room.title': 'Tu sala',
  'room.light': 'Iluminación',
  'light.warm': 'Cálida',
  'light.neutral': 'Neutra',
  'light.penumbra': 'Penumbra',
  'room.field': 'Campo',
  'field.wood': 'Madera',
  'field.water': 'Agua',
  'room.incense': 'Incienso',
  'room.music': 'Sonido ambiente',

  'doll.add': 'Añadir figura',
  'doll.labelPlaceholder': 'Etiqueta (p. ej. Madre, Abuelo, El excluido)',
  'doll.represents': 'Representa',
  'gender.male': 'Masculino',
  'gender.female': 'Femenino',
  'gender.unisex': 'Unisex',
  'doll.age': 'Edad',
  'age.child': 'Niño',
  'age.adult': 'Adulto',
  'age.elder': 'Mayor',
  'doll.color': 'Color',
  'doll.place': '+ Colocar en el campo',
  'doll.one': 'Figura',
  'doll.label': 'Etiqueta',
  'doll.gaze': 'Dirección de la mirada',
  'doll.lying': 'Acostado',
  'doll.remove': 'Quitar del campo',

  'right.empty': 'Haz clic en una figura para editarla. Arrastra para posicionar. La punta clara muestra la dirección de la mirada.',
  'right.therapistLeading': 'El terapeuta está guiando. Sigue el campo.',
  'right.observeOnly': 'Puedes observar. El terapeuta habilita el movimiento cuando corresponde.',

  'anchor.add': '+ Ancla / papel',
  'anchor.placeholder': 'Nombre del ancla (p. ej. Dinero, Patria)',
  'link.mode': 'Enlazar vínculos',
  'link.hint': 'Haz clic en dos figuras para crear/quitar un vínculo.',

  'bar.phrase': '🃏 Frase sistémica',
  'bar.snapshot': '📸 Imagen de solución',
  'bar.saved': '✓ guardada en la sesión',
  'bar.downloaded': 'descargada (sesión no vinculada)',
  'bar.clear': 'Limpiar campo',
  'bar.record': '⏺ Grabar',
  'bar.recording': '⏹ Grabando… {t}',

  'call.audioLabel': 'Audio de la sesión',
  'call.joinAudio': '🎙️ Entrar con audio',
  'call.joinVideo': '🎥 Con vídeo',
  'call.client': 'Cliente',
  'call.therapist': 'Terapeuta',
  'call.you': 'Tú',
  'call.connecting': 'conectando…',
  'call.mediaError': 'No se pudo acceder al micrófono/cámara. Revisa los permisos.',

  'consent.title': 'Consentimiento de grabación',
  'consent.body':
    'Esta sesión será grabada (campo y voces) para seguimiento terapéutico. La grabación es confidencial. Se requiere el consentimiento del cliente para continuar.',
  'consent.agree': 'El cliente consiente la grabación',
  'consent.start': 'Iniciar grabación',
  'consent.cancel': 'Cancelar',
}

const de: Dict = {
  'app.subtitle': 'systemisches Aufstellungsfeld',
  'session.start': '▶ Online-Sitzung starten',
  'session.connectedGuest': 'Mit dem Raum der Therapeutin verbunden',
  'session.connecting': 'Verbinde…',
  'session.offline': 'Offline',
  'session.waiting': 'Warte auf den Klienten…',
  'session.clientIn': 'Klient im Raum',
  'session.connectedCount': '{n} verbunden',
  'session.copyLink': '🔗 Klienten-Link kopieren',
  'session.copied': '✓ Kopiert',
  'session.guestCanMove': 'Klient darf bewegen',
  'session.reconnecting': 'Neu verbinden…',

  'room.title': 'Dein Raum',
  'room.light': 'Beleuchtung',
  'light.warm': 'Warm',
  'light.neutral': 'Neutral',
  'light.penumbra': 'Gedämpft',
  'room.field': 'Feld',
  'field.wood': 'Holz',
  'field.water': 'Wasser',
  'room.incense': 'Räucherwerk',
  'room.music': 'Umgebungston',

  'doll.add': 'Figur hinzufügen',
  'doll.labelPlaceholder': 'Bezeichnung (z. B. Mutter, Opa, Der Ausgeschlossene)',
  'doll.represents': 'Repräsentiert',
  'gender.male': 'Männlich',
  'gender.female': 'Weiblich',
  'gender.unisex': 'Unisex',
  'doll.age': 'Alter',
  'age.child': 'Kind',
  'age.adult': 'Erwachsen',
  'age.elder': 'Ältere/r',
  'doll.color': 'Farbe',
  'doll.place': '+ Ins Feld stellen',
  'doll.one': 'Figur',
  'doll.label': 'Bezeichnung',
  'doll.gaze': 'Blickrichtung',
  'doll.lying': 'Liegend',
  'doll.remove': 'Aus dem Feld entfernen',

  'right.empty': 'Klicke eine Figur zum Bearbeiten. Ziehen zum Positionieren. Die helle Spitze zeigt die Blickrichtung.',
  'right.therapistLeading': 'Die Therapeutin führt. Folge dem Feld.',
  'right.observeOnly': 'Du kannst zusehen. Die Therapeutin gibt die Bewegung frei, wenn es passt.',

  'anchor.add': '+ Anker / Zettel',
  'anchor.placeholder': 'Ankername (z. B. Geld, Heimat)',
  'link.mode': 'Bindungen verbinden',
  'link.hint': 'Klicke zwei Figuren, um eine Bindung zu erstellen/entfernen.',

  'bar.phrase': '🃏 Systemischer Satz',
  'bar.snapshot': '📸 Lösungsbild',
  'bar.saved': '✓ in der Sitzung gespeichert',
  'bar.downloaded': 'heruntergeladen (keine verknüpfte Sitzung)',
  'bar.clear': 'Feld leeren',
  'bar.record': '⏺ Aufnehmen',
  'bar.recording': '⏹ Aufnahme… {t}',

  'call.audioLabel': 'Sitzungs-Audio',
  'call.joinAudio': '🎙️ Mit Audio beitreten',
  'call.joinVideo': '🎥 Mit Video',
  'call.client': 'Klient',
  'call.therapist': 'Therapeut/in',
  'call.you': 'Du',
  'call.connecting': 'verbinde…',
  'call.mediaError': 'Zugriff auf Mikrofon/Kamera nicht möglich. Berechtigungen prüfen.',

  'consent.title': 'Einwilligung zur Aufnahme',
  'consent.body':
    'Diese Sitzung wird aufgezeichnet (Feld und Stimmen) zur therapeutischen Begleitung. Die Aufnahme ist vertraulich. Die Einwilligung des Klienten ist erforderlich.',
  'consent.agree': 'Der Klient willigt in die Aufnahme ein',
  'consent.start': 'Aufnahme starten',
  'consent.cancel': 'Abbrechen',
}

const messages: Record<Lang, Dict> = { 'pt-BR': pt_BR, 'pt-PT': pt_PT, en, es, de }

// frases sistêmicas (frases de solução) por idioma
export const PHRASES: Record<Lang, string[]> = {
  'pt-BR': [
    'Eu honro você.',
    'Você é minha mãe, eu sou o(a) filho(a).',
    'Você é meu pai, eu sou o(a) filho(a).',
    'Eu te vejo.',
    'Você tem um lugar no meu coração.',
    'Eu deixo você em paz.',
    'Por favor, olhe por mim com bons olhos.',
    'Eu recebo a vida de vocês, e faço algo bom com ela.',
    'O que foi pesado, agora pode descansar.',
    'Eu respeito o seu destino.',
    'Agora eu assumo o meu lugar.',
  ],
  'pt-PT': [
    'Eu honro-te.',
    'Tu és a minha mãe, eu sou o(a) filho(a).',
    'Tu és o meu pai, eu sou o(a) filho(a).',
    'Eu vejo-te.',
    'Tens um lugar no meu coração.',
    'Eu deixo-te em paz.',
    'Por favor, olha por mim com bons olhos.',
    'Recebo a vida de vocês e faço algo de bom com ela.',
    'O que foi pesado, agora pode descansar.',
    'Eu respeito o teu destino.',
    'Agora assumo o meu lugar.',
  ],
  en: [
    'I honor you.',
    'You are my mother, I am the child.',
    'You are my father, I am the child.',
    'I see you.',
    'You have a place in my heart.',
    'I leave you in peace.',
    'Please look upon me kindly.',
    'I receive your life, and I make something good of it.',
    'What was heavy may now rest.',
    'I respect your destiny.',
    'Now I take my place.',
  ],
  es: [
    'Te honro.',
    'Tú eres mi madre, yo soy el/la hijo/a.',
    'Tú eres mi padre, yo soy el/la hijo/a.',
    'Te veo.',
    'Tienes un lugar en mi corazón.',
    'Te dejo en paz.',
    'Por favor, mírame con buenos ojos.',
    'Recibo vuestra vida y hago algo bueno con ella.',
    'Lo que fue pesado, ahora puede descansar.',
    'Respeto tu destino.',
    'Ahora ocupo mi lugar.',
  ],
  de: [
    'Ich ehre dich.',
    'Du bist meine Mutter, ich bin das Kind.',
    'Du bist mein Vater, ich bin das Kind.',
    'Ich sehe dich.',
    'Du hast einen Platz in meinem Herzen.',
    'Ich lasse dich in Frieden.',
    'Bitte sieh mich freundlich an.',
    'Ich nehme euer Leben an und mache etwas Gutes daraus.',
    'Was schwer war, darf nun ruhen.',
    'Ich achte dein Schicksal.',
    'Jetzt nehme ich meinen Platz ein.',
  ],
}

function detectLang(): Lang {
  const saved = localStorage.getItem('constelar_lang') as Lang | null
  if (saved && messages[saved]) return saved
  const nav = navigator.language.toLowerCase()
  if (nav.startsWith('pt')) return nav.includes('pt') && nav.includes('-pt') ? 'pt-PT' : 'pt-BR'
  if (nav.startsWith('es')) return 'es'
  if (nav.startsWith('de')) return 'de'
  if (nav.startsWith('en')) return 'en'
  return 'pt-BR'
}

interface LangState {
  lang: Lang
  setLang: (l: Lang) => void
}

export const useLangStore = create<LangState>((set) => ({
  lang: detectLang(),
  setLang: (lang) => {
    localStorage.setItem('constelar_lang', lang)
    set({ lang })
  },
}))

export type TFunc = (key: string, vars?: Record<string, string | number>) => string

function translate(lang: Lang, key: string, vars?: Record<string, string | number>): string {
  let s = messages[lang][key] ?? messages['en'][key] ?? messages['pt-BR'][key] ?? key
  if (vars) for (const k in vars) s = s.replace(`{${k}}`, String(vars[k]))
  return s
}

/** Hook reativo: retorna t() vinculado ao idioma atual. */
export function useT(): TFunc {
  const lang = useLangStore((s) => s.lang)
  return (key, vars) => translate(lang, key, vars)
}

export const phrasesFor = (lang: Lang) => PHRASES[lang]
