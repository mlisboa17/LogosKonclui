# Hospedar Logos Konclui (Vercel)

## Pré-requisitos

- Repositório Git (GitHub, GitLab ou Bitbucket).
- Projeto Supabase com migrations aplicadas e Auth configurado.

## 1. Importar o projeto na Vercel

1. Em [vercel.com](https://vercel.com), **Add New → Project** e liga o repositório.
2. **Framework Preset:** Next.js (detetado automaticamente).
3. **Build Command:** `npm run build` (já inclui `next build --webpack` para gerar o **service worker** PWA).

## 2. Variáveis de ambiente (Production)

Defina no painel da Vercel → Project → Settings → Environment Variables:

| Variável | Obrigatório | Notas |
|----------|-------------|--------|
| `NEXT_PUBLIC_SUPABASE_URL` | Sim | URL do projeto Supabase. |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` ou `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Sim | Chave anónima / publishable. |
| `NEXT_PUBLIC_SITE_URL` | **Sim para PWA** | URL **HTTPS** do site em produção (ex. `https://o-teu-projeto.vercel.app`). Usada em `metadataBase` e links absolutos. |
| `SUPABASE_SERVICE_ROLE_KEY` | Opcional | Convites por email / operações admin no servidor. |
| `CRON_SECRET` | Opcional | Segredo para `GET /api/cron/process-schedules`. |
| `SCHEDULE_TIMEZONE` | Opcional | Ex.: `America/Sao_Paulo`. |
| `TELEGRAM_BOT_TOKEN`, `TELEGRAM_CHAT_ID` | Opcional | Alertas no Telegram; configurar também em **Production** na Vercel. Ver `/painel/telegram`. |

**Auth Supabase:** em Authentication → URL Configuration, define **Site URL** e **Redirect URLs** com o domínio Vercel (ex. `https://xxx.vercel.app/auth/callback`).

## 3. Cron (agendamentos automáticos)

A rota `GET /api/cron/process-schedules` **só executa** se o segredo bater com `CRON_SECRET` — por **query** (`?secret=...`) ou por cabeçalho **`Authorization: Bearer <CRON_SECRET>`**. Sem `CRON_SECRET` definido no ambiente, a API responde **503**.

**Recomendado:** usar o **Bearer** no cron (evita o segredo em URLs e em logs de proxy).

Se usares **Vercel Cron** (`vercel.json` → `crons`), a plataforma pode invocar o path configurado; confirma na documentação atual da Vercel se o pedido inclui autenticação automática e, se não, configura o header `Authorization` com o mesmo valor de `CRON_SECRET`.

Fluxo manual ou cron externo:

1. Chama periodicamente, por exemplo:
   `GET https://SEU_DOMINIO/api/cron/process-schedules` com header `Authorization: Bearer SEU_CRON_SECRET`
2. Ou `?secret=SEU_CRON_SECRET` (menos ideal em termos de exposição em logs).

## 4. PWA / Service Worker

- O ficheiro `public/sw.js` é **gerado no build**; não é obrigatório commitá-lo (está no `.gitignore`).
- Em desenvolvimento (`next dev`) o PWA está **desativado** (`disable: development` no `next.config.ts`).
- Após o deploy, instala a app no telemóvel (“Adicionar ao ecrã inicial”) e testa `/operador` com rede desligada para ver cache / página `/offline`.

## 5. Domínio próprio (opcional)

Na Vercel → Domains, adiciona o domínio e atualiza **Site URL** / redirects no Supabase e `NEXT_PUBLIC_SITE_URL`.

## 6. Checklist rápido (notificações e cron em produção)

Antes de dar como estável o Telegram e o processamento de agendamentos:

- [ ] `TELEGRAM_BOT_TOKEN` e `TELEGRAM_CHAT_ID` definidos em **Production** (rever `/painel/telegram`).
- [ ] `CRON_SECRET` definido e o job HTTP envia o mesmo valor (Bearer ou query).
- [ ] `SUPABASE_SERVICE_ROLE_KEY` definido se o cron deve processar **todas** as orgs em modo Supabase.
- [ ] `NEXT_PUBLIC_SUPABASE_URL` + chave anónima/publicável corretas (app e auth).
- [ ] `SCHEDULE_TIMEZONE` coerente com a operação (ex. `America/Sao_Paulo`).
- [ ] Supabase Auth: **Site URL** e **Redirect URLs** com o domínio Vercel.
- [ ] `NEXT_PUBLIC_SITE_URL` = URL HTTPS final (PWA e metadata).

**Auditoria de falhas:** erros de envio Telegram e timeouts aparecem nos **logs das funções** na Vercel (`console.error` no servidor). Não há tabela dedicada na base só para “falha Telegram”; o JSON da resposta do cron inclui `errors` quando algo falha no processamento.
