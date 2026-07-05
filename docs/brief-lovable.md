# Briefing mestre para o Lovable — Constelar

> **Como usar:** abra o [Lovable](https://lovable.dev), crie um novo projeto e **cole o bloco abaixo**
> como a primeira mensagem. Ele constrói o painel + a estrutura do produto nativamente no Lovable
> (React + Tailwind + shadcn/ui + Supabase). Depois é só ir refinando por mensagens.
>
> O campo 3D com bonecos (Three.js) é pesado e específico — deixe-o para uma segunda etapa
> (ver a seção final "Etapa 2" deste documento).

---

## COLE ISTO NO LOVABLE (primeira mensagem)

```
Crie o "Constelar", um app SaaS em português do Brasil (pt-BR) para terapeutas de constelação
familiar sistêmica atenderem clientes online. Use autenticação, banco de dados e storage do backend
padrão (Supabase). Foque num fluxo funcional e navegável de ponta a ponta.

ESTÉTICA: acolhedora, calma e elegante — paleta terrosa e quente (âmbar, terracota, madeira) com
toques de tom de água (teal). Sensação de consultório aconchegante: boa tipografia, cantos
arredondados, bom espaçamento. Funciona bem em tema claro e escuro.

AUTENTICAÇÃO: cadastro e login do terapeuta por e-mail e senha. Cada terapeuta só enxerga os
próprios dados (row level security).

BANCO DE DADOS (isolado por terapeuta):
- Clientes: nome, contato (e-mail/telefone), observações.
- Sessões: cliente vinculado, data/hora agendada, status (Agendada, Realizada, Cancelada),
  tipo (Individual ou Grupo), um código único de sala e anotações.
- Prontuário: anotações privadas por sessão (texto + data).
- Imagens de solução: imagens (PNG) associadas a uma sessão, com legenda opcional, exibidas em galeria.

PÁGINAS:
1. Landing simples e bonita explicando o Constelar, com botões Entrar / Criar conta.
2. Dashboard (após login): resumo com próximas sessões, total de clientes, atalhos.
3. Clientes: lista com busca, criar/editar, e detalhe do cliente com histórico de sessões.
4. Agenda/Sessões: lista com filtro por status, criar sessão (cliente, data/hora, tipo), mudar status.
   Cada sessão tem "Copiar link do cliente" e "Abrir campo".
5. Detalhe da sessão: dados, prontuário (adicionar/listar anotações) e galeria de imagens de solução
   (upload e visualização).
6. Perfil do terapeuta: nome, bio curta, avatar.

REGRA DOS LINKS: cada sessão tem um código único. O "link do cliente" e o "Abrir campo" apontam para
uma URL de campo 3D configurável no formato BASE_URL/?sala=CODIGO (e, para o terapeuta, também &host=1).
Deixe a BASE_URL fácil de configurar (por enquanto um placeholder, ex.: https://campo.constelar.app).

LINGUAGEM: rótulos em pt-BR, usando com sobriedade os termos do método (bonecos, campo, imagem de
solução, ordens do amor). Contexto: constelação familiar na linha de Bert Hellinger / Cristina Florentino.

Priorize deixar tudo navegável e funcional antes de detalhes avançados.
```

---

## Mensagens de refino (envie uma de cada vez, depois do build inicial)

1. `Adicione uma tela de "Sala de espera" e um termo de consentimento informado que o cliente aceita antes da 1ª sessão.`
2. `Adicione assinatura do terapeuta (planos mensal/anual) com Stripe, e um período de teste gratuito.`
3. `No detalhe do cliente, mostre uma linha do tempo com todas as sessões, anotações e imagens de solução.`
4. `Crie uma página pública do terapeuta (mini-site) com bio e botão de agendamento.`
5. `Melhore o dashboard com um calendário semanal das sessões.`

---

## Etapa 2 — o campo 3D (bonecos)

O **campo de constelação 3D** (sala virtual, bonecos manipuláveis, tempo real terapeuta↔cliente e
áudio/vídeo) já existe **em código** neste repositório, na pasta `constelar/` (React + Three.js +
WebSocket + WebRTC). Ele é um app à parte, otimizado para essa experiência.

Duas formas de integrar com o painel do Lovable:

- **A) Manter o campo como app separado** (recomendado no início): o Lovable cuida do painel/negócio e
  aponta os botões "Abrir campo"/"link do cliente" para a URL do campo já pronto (`BASE_URL/?sala=CODIGO`).
  É plugar uma URL — rápido e sem retrabalho.
- **B) Reconstruir o campo dentro do Lovable**: possível, mas Three.js + tempo real é a parte mais
  pesada e específica; só vale se você quiser tudo num único código-base. Neste caso, use este
  repositório como especificação e traga o campo por partes.

> Resumo: **painel e negócio no Lovable**; **campo 3D reaproveitado do que já foi construído**, plugado por URL.
> Quando o conector do Lovable destravar por aqui, também consigo dirigir o Lovable diretamente por você.
```
