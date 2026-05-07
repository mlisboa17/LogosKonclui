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

Se usares o endpoint de cron:

1. Cria um **Cron Job** HTTP (Vercel Cron ou serviço externo) que chama periodicamente:
   `GET https://SEU_DOMINIO/api/cron/process-schedules?secret=CRON_SECRET`
2. O valor de `secret` deve coincidir com `CRON_SECRET` na Vercel.

## 4. PWA / Service Worker

- O ficheiro `public/sw.js` é **gerado no build**; não é obrigatório commitá-lo (está no `.gitignore`).
- Em desenvolvimento (`next dev`) o PWA está **desativado** (`disable: development` no `next.config.ts`).
- Após o deploy, instala a app no telemóvel (“Adicionar ao ecrã inicial”) e testa `/operador` com rede desligada para ver cache / página `/offline`.

## 5. Domínio próprio (opcional)

Na Vercel → Domains, adiciona o domínio e atualiza **Site URL** / redirects no Supabase e `NEXT_PUBLIC_SITE_URL`.
