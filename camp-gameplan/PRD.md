# PRD — Camp · Game Plan Builder

| Campo | Valor |
|---|---|
| Produto | Camp — Game plan |
| Versão do documento | 1.0 |
| Data | 16/07/2026 |
| Referência ao vivo | https://site-nine-delta-65.vercel.app |
| Implementação | `camp-gameplan/index.html` (arquivo único, autocontido) |
| Idioma do produto | Português (pt-BR) |

---

## 1. Visão geral

O **Camp — Game Plan Builder** é uma calculadora estratégica de lançamentos de eventos pagos (workshops/eventos online com pitch de produto principal). O usuário informa a **meta de faturamento** e o produto trabalha **de trás para frente**: dimensiona a meta de ingressos, a esteira de ofertas, a verba de tráfego, o CAC máximo e as metas diárias por responsável.

O produto materializa a metodologia **"Método W / Camp"**: todos os campos derivados trazem defaults da metodologia (exibidos com borda tracejada) e podem ser sobrescritos pelo usuário (ficam destacados e param de recalcular sozinhos).

### 1.1 Problema

Organizadores de lançamentos definem metas de receita sem saber:
- quantos ingressos precisam vender e a que preço;
- quanto investir em tráfego e como dividir a verba;
- qual o CAC máximo que o plano suporta e se ele é realista frente ao CPM/CTR/conversão de mercado;
- o ritmo diário necessário e a meta de cada responsável do time.

### 1.2 Solução

Um wizard guiado (10 etapas) que coleta poucas decisões-chave, seguido de um **dashboard totalmente editável** com recálculo em tempo real, um **teste de viabilidade** com metas por etapa/responsável e exportação (PDF/CSV).

### 1.3 Público-alvo

- Infoprodutores e experts que lançam via evento pago (workshop de ingresso baixo + oferta principal high ticket).
- Estrategistas de lançamento, gestores de tráfego e times comerciais.
- Dois perfis de nicho suportados: **"Demais nichos"** (ingresso ~R$29) e **"Nicho médico / high ticket"** (ingresso ~R$97).

---

## 2. Objetivos e métricas de sucesso

### 2.1 Objetivos do produto
1. Transformar uma meta de receita em um plano operacional completo em menos de 5 minutos.
2. Expor riscos cedo: CAC estimado acima do teto, exposição de caixa, meta de ingressos fora da curva do nicho.
3. Gerar um artefato compartilhável (PDF/CSV) que sirva de contrato de metas para o time.

### 2.2 Métricas de sucesso (sugeridas)
- % de usuários que completam o wizard até o dashboard.
- % que executa o "Teste de viabilidade".
- % que exporta (PDF/CSV).
- Tempo médio até o primeiro plano completo.
- (Futuro) contas criadas e planos salvos.

---

## 3. Escopo funcional

O app possui **três telas** (SPA em arquivo único, sem rotas):

1. **Wizard** — passo a passo de 10 etapas;
2. **Dashboard ("Plano completo")** — tudo ajustável, recálculo em tempo real;
3. **Metas / Teste de viabilidade** — metas por etapa e responsável + download.

### 3.1 Wizard (10 etapas)

Barra de progresso no topo ("Etapa N de 10", preenchimento animado), navegação por botões **Voltar** / **Próximo** (no último passo o botão vira **"Conferir plano"**). Voltar fica oculto na etapa 1.

| # | Seção (eyebrow) | Pergunta | Entradas | Comportamento |
|---|---|---|---|---|
| 1 | Meta | "Quanto você quer faturar neste lançamento?" | Meta de faturamento (R$, default **500.000,00**) | Campo grande com máscara monetária; editar a meta libera a meta de ingressos para voltar a derivar |
| 2 | Ingresso | "Qual é o seu nicho?" | Toggle **Demais nichos · R$29** / **Nicho médico · R$97**; ticket médio do ingresso (derivado) | Trocar o nicho redefine todos os defaults derivados (ver §5) |
| 3 | Captação | "Vai vender gravações junto aos ingressos?" | Sim (default) / Não; ticket da gravação (derivado: R$197 ou R$497) e conversão sobre ingressos (15% ou 5%) | Texto educativo: comprador de gravação converte ~50% mais; habilita a mecânica de cashback |
| 4 | Captação | "Terá outro order bump na captação?" | Não (default) / Sim; ticket (R$67) e conversão (6%) | Ao ativar, exibe alerta: excesso de order bumps reduz conversão e eleva CAC. Traz o **Panorama da captação**: meta de ingressos, faturamento na captação, receita por ingresso e mini-gráfico de barras da esteira de captação |
| 5 | Investimento | "Quanto você quer investir para alcançar a meta?" | Investimento total em tráfego (R$) | O valor default é **sugerido automaticamente** a partir do CAC estimado e da verba líquida (arredondado ao milhar); painel mostra faturamento na captação e **exposição de caixa** |
| 6 | Origem das vendas | "Quantos ingressos você vende sem tráfego pago?" | Ingressos pela base (default 150) e orgânicos (default 300) | Painel de CAC: ingressos via tráfego, verba de vendas, **CAC máximo** e veredicto (pill "CAC saudável" ou alertbox com opções de correção) |
| 7 | Carrinho | "Vai ter upsell imediato?" | Não (default) / Sim; ticket (R$997) e conversão sobre compradores do principal (3%) | |
| 8 | Carrinho | "Vai ter downsell?" | Não (default) / Sim; ticket (derivado: 1/5 do principal) e conversão sobre não-compradores (5%) | |
| 9 | Plano | "Seu game plan" | — (somente leitura) | Totais do lançamento (investimento, faturamento estimado, ROAS total) e da captação (receita, exposição de caixa, ROAS da captação); alerta final se o CAC estimado passar o teto |
| 10 | Escala | "Você pretende fazer viradas de lote?" | Não (default) / Sim + **editor de lotes** | Infobox: não recomendado no primeiro lançamento pago. Editor: tabela de lotes (ativar/desativar, preço, participação em % ou quantidade, ingressos e faturamento por lote, remover linha), botões "+ Adicionar lote" e "Resetar sugestão", leitura do ticket médio ponderado (não editável), ingressos e faturamento totais |

**Editor de lotes — regras:**
- Sugestão automática por nicho: demais nichos → Lote 0 a 5 partindo de **R$19** com degrau de **+R$5**, mais **lote especial de R$9,90** com 15% de participação; médico → Lote 0 a 4 partindo de **R$97** com degrau de **+R$20**, também com lote especial de R$9,90 (15%).
- Ticket médio do ingresso = média ponderada dos lotes ativos (Σ participação×preço ÷ Σ participação). Com lotes ativos, o campo de ticket do ingresso fica **travado** no médio calculado.
- Alternância de modo **% ↔ Quantidade** converte as participações preservando as proporções.
- Sem nenhum lote ativo/participação, o plano volta ao ticket normal e exibe aviso.

### 3.2 Dashboard — "Plano completo · tudo ajustável"

Cabeçalho com ações: **Voltar ao passo a passo** (retorna ao wizard na etapa 9), **Restaurar padrões** (limpa sobrescritas manuais e volta aos defaults da metodologia) e **Imprimir / PDF** (window.print com folha de estilo própria).

Convenção visual central: **campos tracejados = defaults derivados da metodologia**; ao editar, ficam com borda âmbar ("touched") e param de recalcular.

Blocos, em ordem:

1. **Resultado do plano** (gráfico de 3 barras empilhadas com tooltips):
   - Receita total (com a fatia do investimento embutida) + ROAS total;
   - Margem bruta (receita − investimento);
   - Exposição de caixa (investimento − receita da captação), com rodapé textual.
   - Semântica de cores: verde para receita/margem, "tijolo" para custo; vermelho/coral é reservado a alertas.
2. **Meta de ingressos** (campo hero) + **Canais que compõem a meta**: Orgânico e Base editáveis inline (input aparece no hover), Tráfego derivado (meta − base − orgânico), com barras proporcionais e %.
3. **Alertas contextuais**: CAC estourado (com lista de 4 correções possíveis); infobox do nicho médico (faixa típica de 50–200 ingressos) e alerta quando a meta passa de 2.000 ingressos em high ticket.
4. **Premissas — Meta & ingressos**: meta de faturamento, ticket do produto principal, conversão do principal, meta de ingressos (derivada; editável e fixável à mão).
5. **Esteira — Ofertas & faturamento**: tabela com grupos "Captação" e "Abertura do carrinho". Linhas: Ingresso, Gravação, Order bump, Produto principal, **Principal com cashback** (para quem comprou gravação; ticket = principal − 2× gravação; conversão = 1,5× a do principal), Upsell imediato, Downsell. Cada linha opcional tem toggle on/off; ticket e conversão são editáveis na célula; colunas de Vendas e Faturamento são calculadas; linha de total (compradores do principal e faturamento total).
6. **Captação — Origem, verba & CAC**:
   - Investimento total (campo hero) + ingressos pela base/orgânicos (espelhados com o topo);
   - **Divisão da verba** com barra e valor em R$ por fatia: Vendas (captação) — *não editável, é a sobra*; Imposto sobre mídia (12,5%); API, ligações e outros (12%); Distribuição (6%); Remarketing/carrinho (6%);
   - Leituras: ingressos via tráfego, verba de vendas, **CAC máximo** (verba de vendas ÷ ingressos via tráfego) e **CAC vs ticket principal** (pill verde ≤30%, âmbar ≤45%, vermelho acima).
7. **Prova real — Simulação de CPM**: campos CPM, CTR, connect rate e conversão da página (com *benchmarks de mercado* exibidos ao focar cada campo); calcula o **CAC estimado real** = CPM ÷ (1000 × CTR × connect × conv. página) e compara com o CAC máximo (pill "Dentro do planejado" com folga por ingresso, ou "Ajustar").
8. **CTA de viabilidade**: botão grande vermelho **"Testar viabilidade do plano"**.
9. Rodapé "Como ler" explicando a lógica de trás para frente e o aviso: *"Projeção é planejamento, não promessa."*

### 3.3 Metas / Teste de viabilidade

1. **Calendário**: data de início da captação e data do evento (defaults: hoje e hoje+45 dias) → **dias de captação**.
2. **Cards de resumo**: Investimento, Faturamento, ROAS, Meta de ingressos, Meta de CAC, **Meta de pacing** (ingressos/dia = teto(meta ÷ dias)).
3. **Orçamento diário**: investimento diário em vendas e em distribuição (verba ÷ dias).
4. **Canais de vendas — metas por responsável** (total e por dia): Conteúdo (social media + especialista), Base (copywriter + estrategista), Tráfego (gestor de tráfego + estrategista, copy e designer).
5. **Performance de tráfego**: metas de CTR, conversão de página, connect rate e CPM médio, com nota de que os indicadores dependem do time inteiro.
6. **Performance do evento**: comparecimento **60%** da meta, presença no pitch **45%**, conversão total (derivada do plano) e conversão na abertura (metade do plano; **¼** no nicho médico), com números absolutos.
7. **Performance do comercial**: vendas a fazer no carrinho (plano − abertura; multiplicador de referência 2× ou 4× no médico), vendas/dia, **CAC do carrinho** (¼ do ticket; ⅛ no médico), investimento diário de remarketing; campo editável de **dias de carrinho aberto** (14 default; 45 no médico).
8. **Download**: botão "Baixar plano" abre as opções **Salvar em PDF** (print) e **Baixar CSV (Excel)** (CSV com `;`, BOM UTF-8, colunas Seção/Métrica/Valor, nome `plano-lancamento-camp.csv`). Teaser: *"Em breve: salve o plano e acompanhe o lançamento em tempo real com a Profitfy (liberado quando o beta abrir)."*

---

## 4. Motor de cálculo (regras de negócio)

Estado central `S` + conjunto `M` de campos derivados "tocados à mão" (que deixam de recalcular). Todas as telas leem do mesmo motor `compute()`.

### 4.1 Economia por ingresso
```
gC   = conversão da gravação (se ativa)
pC   = conversão do principal
cC   = conversão do cashback (default 1,5 × pC)
tkCash = ticket do cashback (default: principal − 2 × gravação, mínimo 0)

capPer  = ticket_ingresso + gC·ticket_gravação + bumpConv·ticket_bump      (receita de captação por ingresso)
prinPer = com cashback: (1−gC)·pC·ticket_principal + gC·cC·tkCash
          sem cashback: pC·ticket_principal
pbPer   = compradores do principal por ingresso
corePer = capPer + prinPer

meta_de_ingressos = round(meta_faturamento ÷ corePer)   [derivada; fixável à mão]
```

### 4.2 Esteira (valores absolutos)
- Vendas de cada oferta = arredondamento de meta × conversão (cashback aplica sobre compradores de gravação; upsell sobre compradores do principal; downsell sobre não-compradores).
- `fatCap` = ingressos + gravações + bump; `fatTotal` = fatCap + principal + cashback + upsell + downsell.

### 4.3 Verba e CAC
```
vendasPct    = 100 − imposto − api − distribuição − remarketing   (mínimo 0)
verbaVendas  = investimento × vendasPct
ingTraf      = max(0, meta − base − orgânico)
CAC_máximo   = verbaVendas ÷ ingTraf
CAC_relativo = CAC_máximo ÷ ticket_principal   (saudável ≤ 30%, atenção ≤ 45%, alerta acima)
CAC_estimado = CPM ÷ (1000 × CTR × connect × conv_página)
alerta       = CAC_estimado > CAC_máximo
```

### 4.4 Resultado
```
ROAS_total = fatTotal ÷ investimento
ROAS_captação = fatCap ÷ investimento
exposição_de_caixa = investimento − fatCap    (≤ 0 ⇒ "captação já cobre o investimento")
margem_bruta = fatTotal − investimento
```

### 4.5 Sugestão automática de investimento (etapa 5)
Se o usuário ainda não tocou no investimento: `investimento = teto_ao_milhar(ingTraf × CAC_estimado ÷ vendasPct)`, mínimo R$1.000.

### 4.6 Metas de viabilidade
Conforme §3.3 — pacing, orçamentos diários, metas por canal, comparecimento 60%, pitch 45%, abertura = 50% do plano (25% no médico), multiplicador comercial 2× (4× no médico), CAC de carrinho = ticket/4 (ticket/8 no médico).

---

## 5. Defaults por nicho (metodologia)

| Parâmetro | Demais nichos | Médico / high ticket |
|---|---|---|
| Ticket do ingresso | R$ 29 | R$ 97 |
| Ticket do principal | R$ 1.997 | R$ 8.000 |
| Conversão do principal | 11% | 5% |
| CPM de referência | R$ 35 | R$ 90 |
| Ticket da gravação | R$ 197 | R$ 497 |
| Conversão da gravação | 15% | 5% |
| Dias de carrinho | 14 | 45 |
| Lotes sugeridos | 6 (R$19, +R$5) | 5 (R$97, +R$20) |
| Lote especial | R$ 9,90 · 15% | R$ 9,90 · 15% |
| Conversão na abertura | 50% do plano | 25% do plano |
| Multiplicador do comercial | 2× | 4× |
| CAC do carrinho | ticket ÷ 4 | ticket ÷ 8 |

**Defaults globais:** meta R$500.000; investimento R$120.000; base 150; orgânico 300; imposto 12,5%; API/ligações 12%; distribuição 6%; remarketing 6%; CTR 0,9%; connect 75%; conversão de página 5%; bump R$67/6%; upsell R$997/3%; downsell 5% (ticket = principal ÷ 5).

**Benchmarks exibidos ao focar (Prova real):** CPM R$25–45 (médico ~R$100); CTR 0,7–1,2%; connect 65–85%; conversão de página 5–12%.

---

## 6. Design e UX

### 6.1 Identidade visual
- **Tema escuro quente**: fundo `#0A0908` com gradientes radiais em tons de vinho (`#6E2318`) e grain sutil (SVG turbulence, opacidade 2,8%).
- **Accent**: laranja-vermelho `#E1400F` (botões, foco, progresso).
- **Tipografia**: **Fraunces** (serifada, títulos e números grandes) + **Public Sans** (interface), ambas embutidas via `@font-face`/woff2 base64; números com `tabular-nums`.
- **Cores de dados**: verde `#7CB08A` (receita/margem), tijolo `#8E3020` (custo/exposição), âmbar `#D2A24E` (campo sobrescrito), coral `#E8603F` reservado a alertas.
- **Marca**: estrela de 5 pontas em traço + "Camp / Game plan".

### 6.2 Padrões de interação
- Máscaras de entrada ao vivo pt-BR: moeda (`120.000,00`), moeda com centavos, inteiro com milhar, percentual (uma vírgula).
- Campos derivados tracejados → sólidos/âmbar ao serem sobrescritos; "Restaurar padrões" desfaz.
- Campos espelhados (meta de ingressos, base/orgânico, ticket/conversão do principal) sincronizam entre seções sem sobrescrever o campo em foco.
- Tooltips ricos no gráfico e na divisão da verba (hover e foco); ajuda contextual de benchmark acesa apenas com o campo focado.
- Toggles segmentados (Sim/Não) com `aria-pressed`; switches on/off por oferta na esteira.
- Acessibilidade: `:focus-visible` com outline do accent, `prefers-reduced-motion` remove transições/animações, `role="status"`/`aria-live` nos tooltips, `aria-label` em controles icônicos.
- Responsivo: grids 4→2→1 colunas (breakpoints 900px e 560px); tabelas com scroll horizontal próprio; wizard centrado com `max-width` 640px, dashboard 1160px.
- **CSS de impressão**: converte para tema claro, oculta ações/botões, evita quebra dentro de cards — o PDF sai do próprio print.

---

## 7. Requisitos não-funcionais

| Requisito | Especificação |
|---|---|
| Arquitetura | **Arquivo HTML único e autocontido** (~310 KB): CSS, JS vanilla (IIFE, ES5) e fontes embutidas. Zero dependências externas, zero build |
| Backend | Inexistente — todo cálculo é client-side; nenhum dado sai do navegador |
| Persistência | Nenhuma nesta versão (recarregar zera o plano). API interna `window.CampPlan.serialize()/.load()` pronta para a camada de conta |
| Performance | Recálculo integral a cada tecla (funções puras, DOM patch seletivo — rebuild de tabelas só quando a estrutura muda) |
| Compatibilidade | Navegadores modernos; sintaxe ES5 amplia o alcance |
| Idioma/locale | pt-BR (formatação `toLocaleString('pt-BR')`, moeda R$, CSV com `;` e BOM para Excel) |
| Hospedagem | Estática (Vercel) |

---

## 8. Fora de escopo (v1) e roadmap

**Presente no código, mas ainda não ativo:**
- **Conta e salvamento de planos**: CSS completo do widget de conta (canto inferior direito), modal de login (Google + e-mail), lista de planos salvos e a API `window.CampPlan` já existem; a camada de autenticação/persistência não está embarcada nesta versão.
- **Integração Profitfy**: acompanhamento do lançamento em tempo real (teaser "liberado quando o beta abrir").

**Sugestões de evolução:**
1. Persistência local (`localStorage`) como fallback antes da conta.
2. Compartilhamento por URL (estado serializado no hash).
3. Múltiplos cenários lado a lado (conservador/realista/agressivo).
4. Acompanhamento real vs. planejado durante a captação.

---

## 9. Critérios de aceite

1. Wizard completa as 10 etapas com defaults e chega ao dashboard sem entrada obrigatória adicional.
2. Alterar a meta de faturamento recalcula meta de ingressos, esteira, CAC e ROAS em tempo real em todas as telas.
3. Campo derivado sobrescrito fica destacado e não é mais recalculado; "Restaurar padrões" reverte.
4. Com CAC estimado > CAC máximo, o alerta aparece no wizard (etapas 6 e 9), no topo do dashboard e na Prova real.
5. Trocar o nicho atualiza todos os defaults ainda não sobrescritos conforme a tabela do §5.
6. Lotes ativos travam o ticket do ingresso no médio ponderado; desativar todos volta ao ticket normal com aviso.
7. Datas válidas produzem pacing e orçamentos diários; datas ausentes exibem "informe as datas" sem quebrar.
8. CSV baixado abre corretamente no Excel pt-BR (BOM + `;`) com todas as seções do §3.3.
9. Imprimir/PDF gera versão clara e legível sem controles de UI.
