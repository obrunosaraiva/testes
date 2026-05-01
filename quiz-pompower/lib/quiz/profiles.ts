import type { Archetype, ProfileContent } from "@/types";

export const PROFILES: Record<Archetype, ProfileContent> = {
  renascimento: {
    archetype: "renascimento",
    emoji: "🌹",
    name: "Renascimento",
    tagline: "Reconectar é o seu próximo passo.",
    description: [
      "Você está numa fase de reconexão com seu corpo e sua sensualidade. Algo importante adormeceu — não por falha sua, mas porque a vida cobrou seu tempo, sua energia, seu foco. A maternidade, a rotina, as cobranças invisíveis: tudo isso te afastou de você mesma.",
      "Mas tem uma parte sua que sabe que existe mais. Que lembra da mulher que você foi, e intui a mulher que você ainda pode ser. O fato de você estar aqui, respondendo isso, é a prova de que essa parte está acordando.",
      "O caminho do Renascimento não é sobre 'voltar a ser quem você era' — é sobre encontrar uma versão mais inteira, mais consciente, mais sua. Aqui o corpo e a alma trabalham juntos.",
    ],
    characteristics: [
      "Desejo oscilante ou adormecido",
      "Sensação de desconexão do próprio corpo",
      "Pouco contato com o próprio prazer",
      "Cansaço crônico ou maternidade absorvendo energia",
      "Vontade silenciosa de se reencontrar",
    ],
    recommendations: [
      "Reserve 15 minutos por dia, esta semana, só pra você — sem celular, sem demanda. Pode ser banho longo, respiração consciente, alongamento.",
      "Antes de dormir, faça 3 respirações profundas focando no baixo ventre. Sinta a região, sem julgamento.",
      "Anote num caderno: 'Quando foi a última vez que me senti desejada por mim mesma?' A resposta importa menos que o exercício.",
    ],
    expertMessage:
      "Eu vejo você. Sei que parece que o desejo sumiu — mas ele só está esperando você dar permissão. E eu vou te ensinar o caminho.",
    gradientFrom: "#E8B4BC",
    gradientTo: "#B85C8E",
  },
  expansao: {
    archetype: "expansao",
    emoji: "🔥",
    name: "Expansão",
    tagline: "Você já tem a base. Agora é hora de ir fundo.",
    description: [
      "Você já tem uma base íntima sólida. Sente prazer, conhece seu corpo, pratica o que aprendeu. Mas você é daquelas mulheres que sabe que sempre tem mais — e não tem medo de querer.",
      "Tem hora que você se pergunta se é demais querer mais intensidade, mais conexão, mais qualidade nas trocas. Não é. Esse desejo de profundidade é exatamente o que te trouxe até aqui.",
      "O caminho da Expansão é pra mulher que não quer só 'ter prazer' — quer dominar a arte do prazer. Que entende o sexo como linguagem, não só como ato.",
    ],
    characteristics: [
      "Boa autoestima sexual e contato com o próprio corpo",
      "Prática regular de pompoarismo ou exercícios íntimos",
      "Busca por mais intensidade e qualidade",
      "Curiosidade por exploração avançada",
      "Foco na conexão profunda com parceiro(a)",
    ],
    recommendations: [
      "Esta semana, traga uma técnica de respiração no momento íntimo: inspirar contraindo, expirar relaxando. Vai mudar a percepção de prazer.",
      "Faça um inventário: o que você já experimentou e gostou? E o que você ainda não experimentou mas tem curiosidade? A clareza acelera a expansão.",
      "Compartilhe um desejo novo com seu parceiro(a) esta semana. A vulnerabilidade é a próxima fronteira.",
    ],
    expertMessage:
      "Você é a aluna que me faz querer ensinar mais. Tem uma camada nova de domínio do prazer esperando você — e eu vou te abrir essa porta.",
    gradientFrom: "#F4A261",
    gradientTo: "#C75D2E",
  },
  equilibrio: {
    archetype: "equilibrio",
    emoji: "🌿",
    name: "Equilíbrio",
    tagline: "Seu corpo está pedindo cuidado, não só exercício.",
    description: [
      "Seu corpo está te mandando sinais físicos importantes — incontinência, ressecamento, dor, perda de firmeza. E eu preciso te dizer com clareza: isso NÃO é 'normal da idade', nem 'normal pós-parto', nem algo que você precisa aceitar em silêncio.",
      "O que você está vivendo pede uma abordagem integrada: pompoarismo é parte da solução, mas não toda. Tem dimensão hormonal, postural, possivelmente clínica. Ignorar isso é o que faz o sintoma virar limitação a longo prazo.",
      "O caminho do Equilíbrio é pra mulher que entende que cuidar do corpo é ato de amor-próprio, não vaidade. Aqui a gente trata a causa, não só sintoma.",
    ],
    characteristics: [
      "Sintomas físicos predominantes (incontinência, ressecamento, dor)",
      "Possível janela perimenopausa, pós-parto ou hormonal",
      "Sensação de 'frouxidão' ou perda de firmeza",
      "Necessidade de abordagem clínica integrada",
      "Vontade de reverter o que parece estar piorando",
    ],
    recommendations: [
      "Marque uma avaliação com fisioterapeuta pélvica ou ginecologista nas próximas 2 semanas. Leve essa lista de sintomas.",
      "Comece um diário simples: a cada dia, anote 0-10 quanto sintomas te incomodaram. Em 30 dias você terá dado clínico real.",
      "Pratique o exercício base do PompoarPower 5 minutos por dia, todo dia. Consistência > intensidade neste momento.",
    ],
    expertMessage:
      "Eu te ouço. Esses sintomas são reais e merecem cuidado real. Vamos fazer um plano juntas pra você sair desse lugar — e voltar a confiar no seu corpo.",
    gradientFrom: "#A8C9A6",
    gradientTo: "#5A8A6D",
  },
  dominio: {
    archetype: "dominio",
    emoji: "💎",
    name: "Domínio",
    tagline: "Você não quer aprender. Quer mestria.",
    description: [
      "Você já passou da fase de 'aprender o básico'. Estudou, praticou, investiu em si mesma. Você é a aluna que evolui o método — que faz o conteúdo render mais do que o esperado.",
      "O que te move agora não é mais só 'resolver um problema'. É refinar. É buscar nuances, profundidade, mestria. Você reconhece valor em formatos premium porque sabe que profundidade não vem em massa.",
      "O caminho do Domínio é pra mulher que entende que investir alto em si mesma é o melhor investimento que existe — e que quer um espaço de evolução à altura.",
    ],
    characteristics: [
      "Alto histórico de investimento em desenvolvimento pessoal",
      "Busca formatos premium (mentoria, imersão, alta densidade)",
      "Disposta a pagar pelo que é realmente bom",
      "Quer profundidade e personalização, não conteúdo de massa",
      "Está num momento de maturidade íntima e pessoal",
    ],
    recommendations: [
      "Defina esta semana qual é a UMA coisa que você quer dominar nos próximos 90 dias. Não três. Uma. A profundidade vem do foco.",
      "Faça uma autoavaliação honesta: o que te falta hoje é técnica, prática, ou mentoria? A resposta define o próximo investimento.",
      "Ritualize sua prática: mesmo horário, mesmo espaço, mesma intenção. Mestria é resultado de ritual, não esforço.",
    ],
    expertMessage:
      "Eu reconheço seu nível. Você não precisa de outro curso introdutório — precisa de uma jornada à altura. Tô preparando algo pra você.",
    gradientFrom: "#C9A876",
    gradientTo: "#8B6F47",
  },
};

export function getProfile(archetype: Archetype): ProfileContent {
  return PROFILES[archetype];
}

export const ARCHETYPES: Archetype[] = [
  "renascimento",
  "expansao",
  "equilibrio",
  "dominio",
];
