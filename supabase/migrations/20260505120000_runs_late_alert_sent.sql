*
  Logos Koncui: coluna late_alert_sent_at em checklist_runs.
  Rode depois da migration init. SQL Editor ou: supabase db push.
*//

alter table public.checklist_runs
  add column if not exists late_alert_sent_at timestamptz;

comment on column public.checklist_runs.late_alert_sent_at is 'Preenchido quando o alerta de atraso (Telegram/registo) foi enviado.';
