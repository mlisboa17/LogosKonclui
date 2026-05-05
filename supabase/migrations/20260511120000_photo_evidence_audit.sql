-- Quem enviou a foto e quando (carimbo de servidor ao mudar photo_path).

alter table public.checklist_run_responses
  add column if not exists photo_uploaded_at timestamptz,
  add column if not exists photo_uploaded_by uuid references auth.users (id) on delete set null;

comment on column public.checklist_run_responses.photo_uploaded_at is
  'Horário registrado pela aplicação no Supabase quando photo_path foi definido ou substituído.';

comment on column public.checklist_run_responses.photo_uploaded_by is
  'Utilizador autenticado (auth.users) associado ao envio atual da foto.';
