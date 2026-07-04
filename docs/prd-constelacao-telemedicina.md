# PRD — Plataforma de Constelação Familiar Sistêmica por Telemedicina

> **Codinome do produto:** **Constelar** (nome de trabalho — alternativas na seção 15)
> **Documento:** Product Requirements Document (PRD) — v1.0
> **Data:** 04/07/2026
> **Autor:** Bruno Saraiva + assistência de pesquisa
> **Status:** Rascunho para validação

---

## 1. Resumo executivo

A **Constelar** é uma plataforma web (SaaS) de **telemedicina/teleterapia para constelação familiar sistêmica**, criada para terapeutas, consteladores, psicólogos e coaches que atendem online e querem reproduzir — com fidelidade emocional e simbólica — a experiência de uma **constelação presencial com bonecos, âncoras e campo**.

Diferente das soluções atuais (que são essencialmente "personagens 3D em cima de uma mesa"), a Constelar entrega um **escritório terapêutico virtual totalmente personalizável**: o terapeuta monta o seu cenário (luz, incenso, tapetes, cortinas, almofadas, música, campo de água), cria **avatares/bonecos customizáveis** (masculino, feminino, unissex, com roupas, acessórios, cores, tamanhos) e conduz sessões individuais ou em grupo com sincronização em tempo real, videochamada opcional e registro do processo.

O objetivo é ser a plataforma onde o terapeuta **"não atende só pela câmera"** — ele atende dentro de um espaço simbólico vivo, imersivo e acolhedor, que traduz a força do trabalho presencial para o mundo digital.

---

## 2. Contexto e fundamentação teórica

Esta seção resume a pesquisa realizada sobre o método, para que decisões de produto sejam fiéis à prática terapêutica real. **Todo o design da plataforma deriva destes fundamentos.**

### 2.1 O que é constelação familiar (Bert Hellinger)

Bert Hellinger (1925–2019) — teólogo, filósofo e terapeuta alemão — desenvolveu a Constelação Familiar Sistêmica. Ele observou que os sistemas familiares são regidos por **três "Ordens do Amor"**:

1. **Pertencimento** — todos que fazem parte do sistema têm direito a pertencer, inclusive os excluídos, os que morreram cedo, abortos, os "esquecidos". Exclusões geram desequilíbrios que se repetem em gerações seguintes.
2. **Hierarquia (Ordem)** — quem veio antes tem precedência; os pais vêm antes dos filhos. A ordem cronológica precisa ser honrada.
3. **Equilíbrio entre dar e receber** — as trocas nas relações precisam de equilíbrio para o amor fluir de forma saudável.

Quando essas ordens são violadas, surgem "compensações" que se manifestam como doenças, vícios, dificuldades em relacionamentos, financeiras e profissionais. O trabalho da constelação torna visível a **dinâmica oculta** do sistema e busca uma imagem de solução/reconciliação.

### 2.2 As fases do método (importante para o produto)

A prática evoluiu por fases — a plataforma precisa suportar **todas elas**, pois consteladores diferentes trabalham em estilos diferentes:

- **Representações clássicas** — pessoas (ou objetos) representam membros do sistema e relatam o que sentem naquela posição.
- **Movimentos da Alma (2002–2006)** — os representantes falam menos e se entregam aos movimentos que emergem; não há objetivo pré-definido, o campo revela.
- **Constelação do Espírito / "do Espírito-Mente" (2006–2016)** — o constelador pede pouquíssima informação ao cliente, conecta-se a um "grande campo espiritual"; representantes se movem muito lentamente e são escolhidos intuitivamente pelo facilitador, não pelo cliente.

> **Nota de produto:** "Constelação do espírito" aqui refere-se a essa fase fenomenológica de Hellinger (movimento lento, mínima informação, condução intuitiva), e **não** a uma prática religiosa. A plataforma deve permitir ritmos lentos, silêncio, movimento sutil e condução pelo facilitador — não só o "arrastar bonecos rápido".

### 2.3 Conceitos-chave que viram funcionalidades

| Conceito terapêutico | Tradução em funcionalidade |
|---|---|
| **Campo morfogenético / "campo do saber"** (memória coletiva do sistema, ref. Sheldrake) | O "tabuleiro/campo" 3D onde tudo acontece; a metáfora central da tela |
| **Representantes** | Bonecos/avatares que ocupam o lugar de pessoas ou elementos |
| **Âncoras de chão / papéis no chão** | Marcadores/placas posicionáveis que o cliente pode "ocupar" |
| **Campo de água** | Recurso visual de "espelho d'água" onde bonecos flutuam/se movem (método usado por Cristina Florentino) |
| **Frases sistêmicas / frases de solução** | Baralho de cartas com frases ("Eu honro você", "Você é minha mãe, eu sou o filho…") |
| **Movimentos lentos** | Controle fino de posição, rotação, inclinação e velocidade dos bonecos |
| **Imagem de solução** | Snapshot/foto do estado final da constelação, salvo no prontuário |

### 2.4 Cristina Florentino e a constelação com bonecos

Cristina Florentino — psicóloga e consteladora formada na linha Hellinger, criadora da **Formação Novas Constelações Familiares** — trabalha fortemente com **recursos concretos**: bonecos, âncoras, papéis, pedras e **campo de água**. Sua abordagem ("Novas Constelações") observa sem julgamento os padrões inconscientes herdados do sistema e é uma **terapia breve**.

Na **constelação individual com bonecos (playmobil)**, o cliente traz sua questão, escolhe bonecos de cores/gêneros/tamanhos diferentes para representar as pessoas envolvidas e — ao **tocar** os bonecos — sente o "campo sistêmico", e os movimentos indicam caminhos de reconexão, reconciliação e liberação.

> **Insight de produto:** o **toque** e a **escolha do boneco** são atos terapêuticos em si. No digital, a UX de "pegar", "posicionar", "virar de frente/de costas" e "aproximar/afastar" bonecos precisa ser tão fluida e sensível quanto pegar um Playmobil na mão. Esse é o coração do produto.

### 2.5 Ressalva ética/regulatória

A constelação familiar **não é reconhecida** pelo Conselho Federal de Psicologia (CFP) nem pelo Conselho Federal de Medicina (CFM) como prática com eficácia comprovada. Portanto:

- A plataforma é uma **ferramenta de apoio a práticas integrativas/terapêuticas**, não um dispositivo médico.
- Evitar o termo "telemedicina" em sentido regulatório estrito; usar **"teleterapia / atendimento online"**.
- Cada terapeuta é responsável por seu registro profissional e conduta.
- (ver seção 12 — Riscos, ética e conformidade.)

---

## 3. Problema

Terapeutas que atendem constelação **online hoje** enfrentam:

1. **Perda da dimensão simbólica/espacial.** No presencial, o espaço, os bonecos e o toque são parte da terapia. Numa chamada de vídeo comum (Zoom/Meet), tudo isso se perde — vira "só duas cabeças na tela".
2. **Ferramentas atuais são frias e genéricas.** As plataformas existentes oferecem personagens 3D sobre uma mesa neutra, mas **não reproduzem o ambiente terapêutico** (a sala, a luz, o incenso, o acolhimento) nem permitem que o terapeuta expresse sua identidade/marca.
3. **Falta de personalização dos bonecos.** Representar diversidade real (gênero, idade, papéis, "o excluído", o "não-nascido") exige variedade de figuras — pouco disponível hoje.
4. **Fragmentação de ferramentas.** O terapeuta usa Zoom + planilha + WhatsApp + agenda + recebimento à parte. Não há um fluxo único.
5. **Barreira de entrada.** Instalar software, hardware caro ou curva técnica alta afasta terapeutas menos técnicos (público majoritariamente não-técnico).

---

## 4. Oportunidade e análise de concorrência

O mercado de constelação online no Brasil já existe e valida a demanda, mas as soluções são limitadas. Mapa dos concorrentes:

| Plataforma | O que oferece | Preço | Limitações (nosso gap) |
|---|---|---|---|
| **ORION (constelacaovirtual.com.br)** | Personagens e objetos 3D, sync em tempo real, sessões até 3h, foto da sessão, cliente entra pelo navegador | Avulso R$59,90 até planos (R$20–40/sessão) | Ambiente neutro; sem escritório personalizável; sem customização profunda de avatar; sem campo de água |
| **Constele Online (consteleonline.com)** | Bonecos 3D, áudio/vídeo integrado, música, sorteio de cartas com frases sistêmicas, multi-dispositivo | Assinatura R$29,90 (2 dias) a R$697/ano; teste 7 dias | Ambiente limitado; sem construção de cenário/sala; avatares pouco customizáveis |
| **Essennse (essennse.com)** | Ambiente gratuito + marketplace de terapeutas | Grátis | Foco em marketplace; recursos de campo simples |
| **Zoom/Meet + bonecos físicos na webcam** | Improviso | — | Sem sincronização; cliente não interage; nada é registrado |

**Conclusão / posicionamento:** existe validação de mercado, mas **ninguém entrega imersão + personalização do ambiente + customização profunda dos bonecos + fluxo completo (agenda, pagamento, prontuário) numa experiência calorosa e "com alma"**. É exatamente esse o espaço da Constelar.

### 4.1 Nossa proposta de valor (diferenciação)

1. **Escritório virtual que é "seu".** O terapeuta decora a sala: paredes, piso, tapetes, cortinas, almofadas, plantas, iluminação (quente/velas), incenso animado (partículas de fumaça), som ambiente, campo de água. É o **"consultório digital"** com identidade.
2. **Editor de bonecos/avatares.** Masculino, feminino, unissex/neutro; faixas etária (bebê, criança, adulto, idoso); pele, cabelo, roupas, acessórios, cores; rótulos ("Mãe", "Vovô", "O excluído", "A doença", "Dinheiro"). Salva bibliotecas reutilizáveis.
3. **Manipulação sensível ("como pegar um Playmobil").** Pegar, posicionar, girar (direção do olhar é chave!), inclinar, aproximar, deitar, mover devagar. Suporta os "movimentos da alma".
4. **Campo simbólico rico.** Âncoras de chão, papéis com nomes, campo de água, pedras, corações, símbolos de conexão (linhas/laços entre representantes).
5. **Fluxo completo do terapeuta.** Agenda, sala de espera, videochamada opcional, cartas de frases sistêmicas, gravação da imagem de solução, prontuário/anotações, pagamento — num só lugar.
6. **Zero-fricção para o cliente.** Entra por um **link no navegador**, sem instalar nada, celular/tablet/PC.

---

## 5. Público-alvo e personas

### Persona 1 — "Terapeuta Consteladora" (usuária principal)
Mulher, 35–55 anos, formada em constelação (ex: linha Hellinger/Cristina Florentino), atende presencial e quer expandir para online. Pouca afinidade técnica. Valoriza estética, acolhimento e a "energia" do espaço. Dores: não quer "atender pelo Zoom", quer algo bonito e profissional que traduza seu trabalho.

### Persona 2 — "Psicólogo/Coach integrativo"
Usa constelação como uma das ferramentas. Quer algo confiável, com prontuário e agenda, que se integre à sua prática clínica.

### Persona 3 — "Cliente/Consulente"
Pessoa buscando autoconhecimento. Não é técnica. Precisa de acesso simples (link), experiência emocionalmente segura e privacidade.

### Persona 4 — "Formadora/Escola de constelação" (B2B futuro)
Instituições que formam consteladores e querem uma sala virtual para aulas, supervisão e prática em grupo (turmas).

---

## 6. Escopo do produto

### 6.1 Dentro do escopo (v1 → v2)
- Escritório/sala virtual personalizável
- Editor e biblioteca de bonecos/avatares
- Campo 3D com manipulação em tempo real (individual e grupo)
- Videochamada e áudio opcionais
- Cartas de frases sistêmicas
- Captura de "imagem de solução" e prontuário
- Agenda, sala de espera e link de convite
- Pagamentos / assinatura do terapeuta
- Multi-dispositivo (web responsivo)

### 6.2 Fora do escopo (por enquanto)
- App nativo iOS/Android dedicado (v1 é web/PWA)
- Realidade virtual (VR headset) — item de visão futura
- Marketplace público de terapeutas (fase posterior)
- IA que "conduz" a constelação sozinha (risco ético — só assistência, ver 11.4)

---

## 7. Requisitos funcionais

Notação: **[MVP]** = essencial para o primeiro lançamento; **[V2]** = segunda onda; **[Visão]** = futuro.

### 7.1 Onboarding e conta do terapeuta
- **RF-01 [MVP]** Cadastro/login (e-mail + social login).
- **RF-02 [MVP]** Perfil profissional (nome, foto, bio, abordagem, registro se houver).
- **RF-03 [MVP]** Onboarding guiado ("monte sua primeira sala em 3 min").
- **RF-04 [V2]** Página pública do terapeuta (mini-site) com botão de agendamento.

### 7.2 Escritório/sala virtual (o diferencial)
- **RF-10 [MVP]** Biblioteca de **cenários prontos** (ex.: "Sala Zen", "Consultório Aconchegante", "Jardim", "Ateliê", "Campo de Água") aplicáveis em 1 clique.
- **RF-11 [MVP]** **Editor de sala**: trocar piso, parede, cor, tapete, cortina, almofadas, plantas, quadros, móveis.
- **RF-12 [MVP]** **Iluminação ambiente**: presets (quente/velas, neutro, claro), intensidade, "modo penumbra".
- **RF-13 [MVP]** **Atmosfera**: som ambiente (playlist de músicas calmas/meditação), volume; **incenso animado** (partículas de fumaça); opcional "velas acesas".
- **RF-14 [MVP]** **Campo de água**: superfície reflexiva/espelho d'água como base do trabalho (modo alternativo ao "chão").
- **RF-15 [V2]** Salvar múltiplas salas nomeadas ("Sala 1 — atendimento", "Sala 2 — grupo").
- **RF-16 [Visão]** Upload de textura/quadro próprio (personalizar com a marca do terapeuta).

### 7.3 Bonecos / avatares
- **RF-20 [MVP]** Biblioteca base de bonecos: **masculino, feminino, unissex/neutro**; faixas: bebê, criança, adulto, idoso.
- **RF-21 [MVP]** **Editor de avatar**: cor de pele, cabelo (estilo/cor), roupa (tipo/cor), tamanho/escala.
- **RF-22 [MVP]** **Acessórios**: chapéu, óculos, bengala, coração, mochila (carga/fardo), correntes (símbolos), etc.
- **RF-23 [MVP]** **Rótulo/etiqueta** em cada boneco (texto livre: "Mãe", "Vovô João", "O excluído", "A empresa", "Dinheiro", "A doença", "Sintoma").
- **RF-24 [MVP]** **Elementos abstratos/simbólicos**: âncoras de chão, papéis com nome, pedras, esferas de luz, para representar conceitos (não só pessoas).
- **RF-25 [V2]** Salvar "elenco" reutilizável por cliente (a família do consulente pré-montada).
- **RF-26 [V2]** Paleta de cores por gênero/energia (ex.: masculino/feminino, vivo/falecido) — convenção visual configurável.

### 7.4 Campo de trabalho e manipulação (núcleo terapêutico)
- **RF-30 [MVP]** Área 3D (tabuleiro/campo) vista de cima e em perspectiva; **rotação e zoom da câmera**.
- **RF-31 [MVP]** **Pegar e posicionar** boneco (drag), com física suave/"peso".
- **RF-32 [MVP]** **Girar/orientar** o boneco — a **direção do olhar** é fundamental na constelação (para quem olha, de costas etc.).
- **RF-33 [MVP]** **Inclinar/deitar** o boneco (representa fragilidade, morte, entrega).
- **RF-34 [MVP]** **Movimento lento** com controle fino (suporta "movimentos da alma"); opção de "modo lento".
- **RF-35 [MVP]** **Linhas/laços de conexão** entre representantes (vínculos, emaranhamentos).
- **RF-36 [MVP]** **Sincronização em tempo real** entre terapeuta e cliente (e representantes, no grupo).
- **RF-37 [MVP]** **Controle de permissão**: terapeuta define quem pode mover o quê (só terapeuta / cliente também / representante move a si mesmo).
- **RF-38 [V2]** "Régua/grade" opcional e "desfazer/refazer" de movimentos.
- **RF-39 [V2]** **Modo representante**: cada participante recebe um boneco e o move como "a si mesmo" (constelação em grupo).

### 7.5 Comunicação
- **RF-40 [MVP]** **Áudio/voz** em tempo real na plataforma (WebRTC).
- **RF-41 [MVP]** **Vídeo opcional** (janela pequena, ativável/desativável — muitos preferem só áudio para focar no campo).
- **RF-42 [MVP]** Chat de texto.
- **RF-43 [V2]** "Modo cinema/foco": esconder rostos e ver só o campo.

### 7.6 Recursos de condução
- **RF-50 [MVP]** **Baralho de frases sistêmicas** (cartas): sortear/escolher frases de solução, exibir ao cliente.
- **RF-51 [MVP]** Biblioteca editável de frases (o terapeuta adiciona as suas).
- **RF-52 [MVP]** **Captura da "imagem de solução"** (snapshot do campo) salva na sessão.
- **RF-53 [V2]** Linha do tempo da sessão (registrar posições em momentos-chave: inicial → intermediária → solução).
- **RF-54 [V2]** Timer/sino (marcar tempo, tocar um sino tibetano ao final).

### 7.7 Sessões, agenda e clientes
- **RF-60 [MVP]** Agenda com horários disponíveis e agendamento.
- **RF-61 [MVP]** **Link de convite** para o cliente entrar sem cadastro/instalação; **sala de espera**.
- **RF-62 [MVP]** Cadastro de cliente e **prontuário/anotações** privadas por sessão.
- **RF-63 [MVP]** Histórico de sessões com imagens de solução salvas.
- **RF-64 [V2]** Lembretes automáticos (e-mail/WhatsApp) e confirmação.
- **RF-65 [V2]** Consentimento informado digital (termo assinado antes da 1ª sessão).

### 7.8 Pagamentos e planos
- **RF-70 [MVP]** Assinatura do terapeuta (planos mensais/anuais) via gateway (ex.: Stripe/Pagar.me).
- **RF-71 [V2]** Cobrança do cliente pelo terapeuta dentro da plataforma (split/repasse).
- **RF-72 [Visão]** Marketplace com descoberta de terapeutas.

---

## 8. Requisitos não-funcionais

- **RNF-01 Desempenho:** o campo 3D deve rodar fluido (≥30 fps) em notebooks medianos e celulares recentes; latência de sincronização < 150 ms percebida.
- **RNF-02 Acessibilidade:** cliente entra **sem instalar**, só com navegador moderno; UX simples para público não-técnico.
- **RNF-03 Multi-dispositivo:** responsivo para desktop, tablet e celular; PWA instalável.
- **RNF-04 Confiabilidade:** reconexão automática se a rede cair (a sessão não pode "morrer" no meio de um momento delicado).
- **RNF-05 Privacidade/LGPD:** dados de saúde são **sensíveis**; criptografia em trânsito e repouso; consentimento; direito ao esquecimento; servidores/tratamento em conformidade com a LGPD.
- **RNF-06 Segurança:** salas privadas com token; sem indexação; gravação só com consentimento explícito.
- **RNF-07 Escalabilidade:** arquitetura realtime que suporte crescimento de salas simultâneas.
- **RNF-08 Estética/emocional:** a UI precisa transmitir calma, acolhimento e beleza — é requisito de produto, não "enfeite".
- **RNF-09 Internacionalização:** PT-BR primeiro; arquitetura pronta para PT-PT/ES/EN (mercado lusófono e latino é grande).

---

## 9. Arquitetura técnica sugerida

> Recomendações; a equipe de engenharia deve validar. Prioriza **web, sem instalação** e **tempo real**.

**Frontend**
- **React + TypeScript**.
- **3D no navegador:** **Three.js** via **React Three Fiber** + **drei** (helpers). Alternativa: Babylon.js (bom para cenas mais "app-like").
- Assets 3D em **glTF/GLB** (bonecos, móveis, props) — leves, com LOD.
- Estado/UI: Zustand/Redux; animações com react-spring.
- PWA (offline-friendly para o terapeuta preparar salas).

**Tempo real (o coração)**
- **WebSocket** com camada de estado compartilhado — recomenda-se **CRDT** (ex.: **Yjs**) ou um servidor autoritativo de estado (ex.: **Colyseus**, feito para salas multiplayer) para sincronizar posições/rotações dos bonecos sem conflito.
- **WebRTC** para áudio/vídeo P2P; usar **SFU** (ex.: LiveKit/mediasoup) quando houver grupos (>2 pessoas).

**Backend**
- **Node.js (NestJS)** ou similar; API REST/GraphQL.
- **PostgreSQL** (dados relacionais: usuários, sessões, prontuário).
- **Object storage** (S3/R2) para snapshots, assets e gravações.
- Redis para presença/pub-sub das salas.
- Autenticação (Auth0/Clerk/Supabase Auth).

**Infra**
- Deploy em nuvem (com opção de dados no Brasil por LGPD).
- Observabilidade (logs, métricas, Sentry).
- Gateway de pagamento (Stripe/Pagar.me).

**Pipeline de assets 3D**
- Biblioteca curada de bonecos/props em GLB, otimizados (Draco/meshopt).
- Sistema de "customização" via troca de material/cor + attach de acessórios (evita gerar mil modelos).

---

## 10. Modelo de dados (alto nível)

```
Therapist (id, nome, email, plano, perfil, config_pagamento)
Client    (id, therapist_id, nome, contato, consentimento)
Room      (id, therapist_id, nome, cenario_json)  // sala/escritório salvo
Scene     (id, room_id, iluminacao, audio, props[]) // decoração
AvatarLib (id, therapist_id, nome)               // "elenco" reutilizável
Avatar    (id, lib_id, tipo, genero, faixa_etaria, cor, roupa, acessorios[], rotulo)
Session   (id, therapist_id, client_id, room_id, data, status, tipo[individual|grupo])
FieldState(id, session_id, timestamp, avatares_posicoes_json) // estados do campo
Snapshot  (id, session_id, imagem_url, momento[inicial|solucao], nota)
Note      (id, session_id, texto, privado)       // prontuário
PhraseCard(id, therapist_id, texto)              // frases sistêmicas
Participant(id, session_id, nome, papel, token)  // representantes/cliente
```

---

## 11. Fluxos principais (UX)

### 11.1 Terapeuta prepara a sala
Login → escolhe um cenário pronto ou edita a sala (piso, luz, incenso, som, campo de água) → salva "Minha Sala".

### 11.2 Agendamento e entrada
Terapeuta cria sessão → gera link → cliente recebe → clica → cai na **sala de espera** → terapeuta admite → entram no campo juntos.

### 11.3 Condução da constelação individual
Cliente descreve a questão → terapeuta (ou cliente) escolhe bonecos do "elenco" e os rotula → posicionam no campo/água → trabalham orientação, distância, movimento lento → terapeuta oferece frases sistêmicas → chega-se à **imagem de solução** → snapshot salvo no prontuário → encerramento (sino).

### 11.4 Constelação em grupo (V2)
Terapeuta cria sessão em grupo → participantes entram por link → cada um pode receber um boneco/representar → movem "a si mesmos" → terapeuta conduz e ajusta permissões.

> **Assistência de IA (com cautela — ver riscos):** a IA pode *sugerir* frases sistêmicas, *organizar* anotações e *transcrever*, mas **não conduz** a terapia nem interpreta o campo. A condução é sempre humana.

---

## 12. Riscos, ética e conformidade

| Risco | Mitigação |
|---|---|
| **Regulatório** — constelação não é reconhecida por CFP/CFM | Posicionar como ferramenta de apoio a práticas integrativas; não usar "telemedicina" em sentido médico; termos de uso claros; responsabilidade do profissional |
| **Dados sensíveis de saúde (LGPD)** | Criptografia, consentimento explícito, minimização de dados, base legal, DPO, servidores compatíveis, política de retenção |
| **Gravação de sessões** | Só com consentimento duplo; default = não gravar; storage seguro |
| **Segurança emocional do cliente** | Sala privada com token; sem entrada de estranhos; "botão de pausa"; orientação para o terapeuta sobre acolhimento remoto |
| **Barreira técnica do público** | UX ultra-simples; teste em dispositivos modestos; suporte humano |
| **Apropriação/"IA que consulta"** | IA só assiste; nunca substitui o terapeuta; comunicação transparente |
| **Performance 3D em máquinas fracas** | Modo "leve" (2D/baixa qualidade), assets otimizados, fallback |
| **Sensibilidade cultural/espiritual** | Linguagem inclusiva; cenários laicos e também com elementos espirituais opcionais; não impor religião |

---

## 13. Métricas de sucesso (KPIs)

**Ativação**
- % de terapeutas que criam a 1ª sala e completam a 1ª sessão em 7 dias.
- Tempo até a primeira sessão realizada.

**Engajamento**
- Sessões por terapeuta/mês; nº de bonecos/salas criadas; uso de frases sistêmicas.

**Retenção / negócio**
- Churn mensal de assinantes; LTV; conversão de trial → pago.

**Qualidade percebida**
- NPS do terapeuta e do cliente; "a experiência se aproximou do presencial?" (survey pós-sessão).

**Técnico**
- FPS médio; taxa de quedas/reconexões; latência de sync.

---

## 14. Roadmap por fases

### Fase 0 — Descoberta e validação (2–4 semanas)
- Entrevistas com 8–12 consteladores (incluindo linha Cristina Florentino).
- Protótipo navegável (Figma) da sala + manipulação de bonecos.
- Teste de conceito 3D no navegador (spike técnico: R3F + Colyseus/Yjs + WebRTC).

### Fase 1 — MVP (2–3 meses)
- Sala com 3–5 cenários prontos + edição básica (luz, som, incenso, campo de água).
- Biblioteca de bonecos base + editor essencial + rótulos + âncoras.
- Campo 3D com pegar/posicionar/girar/inclinar + **sync em tempo real** (2 pessoas).
- Áudio/vídeo opcional + chat.
- Frases sistêmicas + snapshot da imagem de solução + prontuário.
- Agenda + link de convite + sala de espera.
- Assinatura do terapeuta (trial + pago).
- **Meta:** 20–50 terapeutas beta atendendo de verdade.

### Fase 2 — Profundidade (2–3 meses)
- Constelação em grupo + modo representante.
- Editor de sala avançado + múltiplas salas salvas + branding.
- Elenco reutilizável por cliente; linha do tempo da sessão.
- Cobrança do cliente pelo terapeuta; lembretes; consentimento digital.
- Modo "leve" para máquinas fracas.

### Fase 3 — Escala (contínuo)
- Página pública/mini-site do terapeuta; SEO.
- Marketplace de terapeutas; formação/escolas (B2B).
- Internacionalização (PT-PT, ES, EN).
- IA assistente (frases, transcrição, organização de notas).

### Visão de longo prazo
- Modo VR (headset) para imersão total; áudio espacial; bibliotecas premium de cenários e bonecos; "loja" de assets.

---

## 15. Nome e identidade (sugestões)

Nomes candidatos (validar disponibilidade de domínio/marca):
- **Constelar** — verbo, ação, simples.
- **Campo** / **Meu Campo** — remete ao "campo sistêmico".
- **Ágora** — praça de encontro.
- **Anima** / **Alma** — dimensão da alma.
- **Reverência** / **Ordem** — remete às Ordens do Amor.
- **Constela** / **Constelaria** / **Sala da Alma**.

Diretrizes de marca: paleta terrosa/quente + tons de água; tipografia acolhedora; sensação de calma, respeito e profundidade. A estética **é** parte da proposta de valor.

---

## 16. Perguntas em aberto (para a próxima rodada)

1. Foco inicial: **individual** (terapeuta+cliente) ou já mirar **grupo**? (Recomendação: individual no MVP — é a modalidade online mais comum e tecnicamente mais simples.)
2. Parceria de conteúdo/validação com uma consteladora de referência (ex.: linha Cristina Florentino) para legitimar o método na plataforma?
3. Nível de realismo 3D desejado (estilizado/"Playmobil aconchegante" vs. realista)? — recomendação: **estilizado e caloroso** (mais leve e mais simbólico).
4. Modelo de negócio: só assinatura do terapeuta, ou também repasse por sessão do cliente?
5. Precisamos de app nativo no lançamento, ou **PWA** basta?

---

## 17. Como tornar isto real — próximos passos concretos

1. **Validar o PRD** com 3–5 terapeutas reais (1 semana).
2. **Protótipo em Figma** da sala + manipulação (para vender a visão e testar UX).
3. **Spike técnico** do campo 3D no navegador com sync em tempo real (a maior incerteza técnica).
4. **Definir MVP fechado** (cortar 20% de escopo que dá 80% do valor: sala + bonecos + campo + sync + áudio + snapshot + agenda).
5. **Escolher o caminho de build:** time próprio (React/Three.js/Colyseus) ou acelerar com ferramentas no-code/low-code para o protótipo (ex.: Lovable para o dashboard/agenda/site, e um módulo 3D dedicado à parte). *Podemos gerar o protótipo do painel do terapeuta rapidamente.*
6. **Beta fechado** com terapeutas parceiros → iterar → lançar.

---

*Documento vivo. Este PRD foi construído a partir de pesquisa sobre Bert Hellinger (as três Ordens do Amor: pertencimento, hierarquia e equilíbrio), as fases do método (representações, Movimentos da Alma e Constelação do Espírito), a abordagem com bonecos e campo de água (linha Cristina Florentino / Novas Constelações) e análise dos concorrentes existentes (ORION, Constele Online, Essennse).*
