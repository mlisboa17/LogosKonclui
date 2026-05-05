/*
  Logos Koncui: schema inicial (multi-unidade, checklists, execucoes, alertas).
  Colar no SQL Editor do Supabase ou: supabase db push
*/

create extension if not exists "pgcrypto";

-- Perfis (1:1 com auth.users)
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text,
  created_at timestamptz not null default now()
);

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, full_name)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1))
  );
  return new;
end;
$$;

create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

-- Organizações (grupo econômico)
create table public.organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  created_at timestamptz not null default now()
);

create table public.organization_members (
  organization_id uuid not null references public.organizations (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  role text not null check (role in ('owner', 'manager', 'operator')),
  primary key (organization_id, user_id)
);

create or replace function public.add_org_creator_as_owner()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  /* SECURITY DEFINER: primeiro insert em organization_members nao passa RLS "só manager" */
  if auth.uid() is not null then
    insert into public.organization_members (organization_id, user_id, role)
    values (new.id, auth.uid(), 'owner');
  end if;
  return new;
end;
$$;

create trigger on_organization_created
after insert on public.organizations
for each row execute function public.add_org_creator_as_owner();

-- Unidades: conveniência, posto, restaurante
create table public.units (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  name text not null,
  unit_type text not null default 'other'
    check (unit_type in ('convenience', 'gas_station', 'restaurant', 'other')),
  city text,
  created_at timestamptz not null default now()
);

create index units_org_idx on public.units (organization_id);

-- Modelos de checklist
create table public.checklist_templates (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  name text not null,
  description text,
  sector text,
  created_at timestamptz not null default now()
);

create table public.checklist_template_items (
  id uuid primary key default gen_random_uuid(),
  template_id uuid not null references public.checklist_templates (id) on delete cascade,
  title text not null,
  sort_order int not null default 0,
  item_type text not null default 'boolean'
    check (item_type in ('boolean', 'number', 'text', 'photo')),
  is_critical boolean not null default false,
  weight int not null default 1
);

create index checklist_template_items_tpl_idx
  on public.checklist_template_items (template_id);

-- Checklist publicado (por unidade ou org-wide se unit_id nulo)
create table public.checklists (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  unit_id uuid references public.units (id) on delete cascade,
  template_id uuid references public.checklist_templates (id) on delete set null,
  name text not null,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create table public.checklist_items (
  id uuid primary key default gen_random_uuid(),
  checklist_id uuid not null references public.checklists (id) on delete cascade,
  title text not null,
  sort_order int not null default 0,
  item_type text not null default 'boolean'
    check (item_type in ('boolean', 'number', 'text', 'photo')),
  is_critical boolean not null default false,
  weight int not null default 1
);

-- Agendamento simples: hora + dias da semana (0=domingo … 6=sábado)
create table public.checklist_schedules (
  id uuid primary key default gen_random_uuid(),
  checklist_id uuid not null references public.checklists (id) on delete cascade,
  time_local time not null,
  days_of_week smallint[] not null default array[0,1,2,3,4,5,6]::smallint[],
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

-- Execução (instância para a equipe cumprir)
create table public.checklist_runs (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  unit_id uuid not null references public.units (id) on delete cascade,
  checklist_id uuid not null references public.checklists (id) on delete cascade,
  assigned_user_id uuid references auth.users (id) on delete set null,
  due_at timestamptz not null,
  started_at timestamptz,
  completed_at timestamptz,
  status text not null default 'scheduled'
    check (status in ('scheduled', 'in_progress', 'completed', 'late', 'missed')),
  created_at timestamptz not null default now()
);

create index checklist_runs_org_due_idx on public.checklist_runs (organization_id, due_at);
create index checklist_runs_assignee_idx on public.checklist_runs (assigned_user_id);

create table public.checklist_run_responses (
  id uuid primary key default gen_random_uuid(),
  run_id uuid not null references public.checklist_runs (id) on delete cascade,
  checklist_item_id uuid not null references public.checklist_items (id) on delete cascade,
  completed boolean not null default false,
  numeric_value numeric,
  text_value text,
  photo_path text,
  note text,
  responded_at timestamptz not null default now(),
  unique (run_id, checklist_item_id)
);

-- Alertas (WhatsApp / notificações podem consumir esta tabela)
create table public.alerts (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  run_id uuid references public.checklist_runs (id) on delete set null,
  message text not null,
  severity text not null default 'warning',
  acknowledged_at timestamptz,
  created_at timestamptz not null default now()
);

create index alerts_org_idx on public.alerts (organization_id, created_at desc);

-- ---------- RLS ----------
alter table public.profiles enable row level security;
alter table public.organizations enable row level security;
alter table public.organization_members enable row level security;
alter table public.units enable row level security;
alter table public.checklist_templates enable row level security;
alter table public.checklist_template_items enable row level security;
alter table public.checklists enable row level security;
alter table public.checklist_items enable row level security;
alter table public.checklist_schedules enable row level security;
alter table public.checklist_runs enable row level security;
alter table public.checklist_run_responses enable row level security;
alter table public.alerts enable row level security;

create or replace function public.user_org_ids()
returns setof uuid
language sql
stable
security definer
set search_path = public
as $$
  select organization_id from public.organization_members where user_id = auth.uid();
$$;

-- profiles
create policy "profiles_select_own"
  on public.profiles for select using (auth.uid() = id);
create policy "profiles_insert_own"
  on public.profiles for insert with check (auth.uid() = id);
create policy "profiles_update_own"
  on public.profiles for update using (auth.uid() = id);

-- organizations
create policy "organizations_select_member"
  on public.organizations for select
  using (id in (select public.user_org_ids()));
create policy "organizations_insert_authenticated"
  on public.organizations for insert
  with check (auth.uid() is not null);
create policy "organizations_update_manager"
  on public.organizations for update
  using (
    exists (
      select 1 from public.organization_members m
      where m.organization_id = organizations.id
        and m.user_id = auth.uid()
        and m.role in ('owner', 'manager')
    )
  );

-- organization_members
create policy "org_members_select"
  on public.organization_members for select
  using (organization_id in (select public.user_org_ids()));
create policy "org_members_insert_by_manager"
  on public.organization_members for insert
  with check (
    exists (
      select 1 from public.organization_members m
      where m.organization_id = organization_members.organization_id
        and m.user_id = auth.uid()
        and m.role in ('owner', 'manager')
    )
  );
create policy "org_members_delete_by_manager"
  on public.organization_members for delete
  using (
    exists (
      select 1 from public.organization_members m
      where m.organization_id = organization_members.organization_id
        and m.user_id = auth.uid()
        and m.role in ('owner', 'manager')
    )
  );

-- units
create policy "units_all_member"
  on public.units for all
  using (organization_id in (select public.user_org_ids()))
  with check (organization_id in (select public.user_org_ids()));

-- templates
create policy "checklist_templates_all_member"
  on public.checklist_templates for all
  using (organization_id in (select public.user_org_ids()))
  with check (organization_id in (select public.user_org_ids()));

create policy "checklist_template_items_all_member"
  on public.checklist_template_items for all
  using (
    exists (
      select 1 from public.checklist_templates t
      where t.id = checklist_template_items.template_id
        and t.organization_id in (select public.user_org_ids())
    )
  )
  with check (
    exists (
      select 1 from public.checklist_templates t
      where t.id = checklist_template_items.template_id
        and t.organization_id in (select public.user_org_ids())
    )
  );

-- checklists + items
create policy "checklists_all_member"
  on public.checklists for all
  using (organization_id in (select public.user_org_ids()))
  with check (organization_id in (select public.user_org_ids()));

create policy "checklist_items_all_member"
  on public.checklist_items for all
  using (
    exists (
      select 1 from public.checklists c
      where c.id = checklist_items.checklist_id
        and c.organization_id in (select public.user_org_ids())
    )
  )
  with check (
    exists (
      select 1 from public.checklists c
      where c.id = checklist_items.checklist_id
        and c.organization_id in (select public.user_org_ids())
    )
  );

create policy "checklist_schedules_all_member"
  on public.checklist_schedules for all
  using (
    exists (
      select 1 from public.checklists c
      where c.id = checklist_schedules.checklist_id
        and c.organization_id in (select public.user_org_ids())
    )
  )
  with check (
    exists (
      select 1 from public.checklists c
      where c.id = checklist_schedules.checklist_id
        and c.organization_id in (select public.user_org_ids())
    )
  );

-- runs + responses
create policy "checklist_runs_all_member"
  on public.checklist_runs for all
  using (organization_id in (select public.user_org_ids()))
  with check (organization_id in (select public.user_org_ids()));

create policy "checklist_run_responses_all_member"
  on public.checklist_run_responses for all
  using (
    exists (
      select 1 from public.checklist_runs r
      where r.id = checklist_run_responses.run_id
        and r.organization_id in (select public.user_org_ids())
    )
  )
  with check (
    exists (
      select 1 from public.checklist_runs r
      where r.id = checklist_run_responses.run_id
        and r.organization_id in (select public.user_org_ids())
    )
  );

create policy "alerts_all_member"
  on public.alerts for all
  using (organization_id in (select public.user_org_ids()))
  with check (organization_id in (select public.user_org_ids()));
