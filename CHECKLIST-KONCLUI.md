# Checklist — paridade e próximos passos (vs Koncluí / operação)

Marca `[x]` à medida que concluíres. Ordem sugerida de cima para baixo.

## Infra e Supabase

*(Estes itens dependem do teu projeto cloud — marca manualmente quando estiverem aplicados.)*

- [ ] Projeto Supabase criado + `.env.local` com URL e chave (publishable ou anon)
- [ ] Migration `20260504120000_init_logos_koncui.sql` aplicada
- [ ] Migration `20260505120000_runs_late_alert_sent.sql` aplicada
- [ ] Migration `20260506120000_profiles_select_org_peers.sql` aplicada (nomes na Equipe)
- [ ] Migration `20260507120000_storage_checklist_evidence.sql` aplicada (fotos no Storage)
- [ ] Migration `20260508200000_create_organization_rpc.sql` aplicada (RPC criar organização)
- [ ] Migration `20260508120000_org_creator_trigger_security_definer.sql` aplicada (trigger owner inicial)
- [ ] Migration `20260509120000_org_settings_units_rls_members_update.sql` aplicada (settings org, `phone` em profiles, RLS unidades, UPDATE membros)
- [ ] Auth: Site URL + redirect `http://localhost:3000/auth/callback` (e produção)
- [ ] `NEXT_PUBLIC_SITE_URL` em produção (PWA / URLs absolutas)
- [ ] `CRON_SECRET` + `SUPABASE_SERVICE_ROLE_KEY` no servidor (Vercel) para agendamentos globais + convites por email (opcional)
- [ ] Cron HTTP agendado para `GET /api/cron/process-schedules?secret=…`

## Painel (já feito vs falta)

- [x] Visão geral com KPIs do dia (conclusão, alertas, prazos, atrasos…)
- [x] **Filtro por unidade** na visão geral (`/painel?unidade=…`) — KPIs “Operação hoje” por loja
- [x] Exportar execuções CSV
- [x] Página Equipe + score de pontualidade (30 dias); permissão **ver score** configurável para gestor
- [x] **CRUD equipa:** adicionar/remover membros, alterar função; convite por email com `SUPABASE_SERVICE_ROLE_KEY` ou UUID
- [x] **CRUD unidades** (criar/editar/apagar); operador com vista só leitura quando RLS aplicada
- [x] **Conta:** perfil (`full_name`, `phone`), nome da organização, **permissões do gestor** (`organizations.settings`)
- [x] Permissões nas ações: modelos, publicar checklists, agendamentos, unidades, equipa (conforme toggles)
- [x] Atribuir responsável ao criar execução (Checklists)
- [x] **Execução:** campos por tipo de item (`number`, `text`) além do checkbox
- [x] **Execução:** evidência em **foto** (Supabase Storage + políticas + upload na UI; JSON = URL)
- [x] **Concluir execução** só com todos os itens cumpridos (incl. número, texto, foto quando obrigatória)
- [x] **Foto obrigatória** apenas quando `item_type = photo` e **`is_critical`**; foto opcional se não for crítico (marca concluído sem foto)
- [x] **Reconhecer alertas** na visão geral (`acknowledged_at` via botão “Reconhecer”)
- [ ] **Comparar** lojas lado a lado (hoje: filtrar uma unidade de cada vez na visão geral)
- [ ] Recorrência **mensal** (além de hora + dias da semana), se necessário para o grupo

## Notificações e canais

- [x] Telegram (bot + chat) para eventos e atrasos
- [ ] WhatsApp Business API (só se houver orçamento e número aprovado Meta)

## Mobile e experiência Koncluí

- [x] **PWA:** `manifest.ts`, ícones (`/icons/icon.svg`), meta / `appleWebApp`, `start_url` → `/operador`
- [x] Service worker básico (cache/offline) — `@ducanh2912/next-pwa`, página `/offline`, build com `next build --webpack`
- [x] **Modo operador** (`/operador`): lista de execuções com cartões grandes; navegação mínima; ligação desde o painel e voltar desde a execução

## Conteúdo e templates

- [x] Modelos demo / seed por setor
- [ ] Biblioteca extra de templates (abertura/fechamento caixa, bar, etc.) importável em um clique
- [ ] Gerar checklist por **IA** a partir de texto (integração API — definir fornecedor)

## Qualidade e governança

- [ ] Testes e2e críticos (login, criar execução, concluir)
- [ ] Política de retenção / RGPD (exportar apagar dados utilizador)

## Documentação interna

- [ ] README com fluxo: primeiro login → org → unidade → modelo → checklist → execução → cron

---

**Próximo item recomendado:** recorrência mensal nos agendamentos **ou** testes e2e críticos **ou** README de onboarding — conforme prioridade do grupo.
