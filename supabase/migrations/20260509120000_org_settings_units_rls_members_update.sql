/*
  - Permissões configuráveis (JSON em organizations.settings)
  - Perfis: telefone opcional
  - Unidades: operadores só leem; owner/gestor criam/editam/eliminam
  - Membros: owner/gestor podem atualizar funções (além de inserir/apagar)
*/

-- ---------- Perfis ----------
alter table public.profiles add column if not exists phone text;

-- ---------- Organização: settings ----------
alter table public.organizations
  add column if not exists settings jsonb not null default '{}'::jsonb;

comment on column public.organizations.settings is
  'JSON: manager_permissions { manage_units, manage_team, manage_templates, manage_checklists, manage_schedules, view_equipe_score, manage_org_settings } — omitidos = true.';

-- ---------- Unidades: políticas mais restritas ----------
drop policy if exists "units_all_member" on public.units;
drop policy if exists "units_select_member" on public.units;
drop policy if exists "units_insert_owner_manager" on public.units;
drop policy if exists "units_update_owner_manager" on public.units;
drop policy if exists "units_delete_owner_manager" on public.units;

create policy "units_select_member"
  on public.units for select
  using (organization_id in (select public.user_org_ids()));

create policy "units_insert_owner_manager"
  on public.units for insert
  with check (
    exists (
      select 1 from public.organization_members m
      where m.organization_id = units.organization_id
        and m.user_id = auth.uid()
        and m.role in ('owner', 'manager')
    )
  );

create policy "units_update_owner_manager"
  on public.units for update
  using (
    exists (
      select 1 from public.organization_members m
      where m.organization_id = units.organization_id
        and m.user_id = auth.uid()
        and m.role in ('owner', 'manager')
    )
  )
  with check (
    exists (
      select 1 from public.organization_members m
      where m.organization_id = units.organization_id
        and m.user_id = auth.uid()
        and m.role in ('owner', 'manager')
    )
  );

create policy "units_delete_owner_manager"
  on public.units for delete
  using (
    exists (
      select 1 from public.organization_members m
      where m.organization_id = units.organization_id
        and m.user_id = auth.uid()
        and m.role in ('owner', 'manager')
    )
  );

-- ---------- Membros: UPDATE ----------
drop policy if exists "org_members_update_by_manager" on public.organization_members;

create policy "org_members_update_by_manager"
  on public.organization_members for update
  using (
    exists (
      select 1 from public.organization_members m
      where m.organization_id = organization_members.organization_id
        and m.user_id = auth.uid()
        and m.role in ('owner', 'manager')
    )
  )
  with check (
    exists (
      select 1 from public.organization_members m
      where m.organization_id = organization_members.organization_id
        and m.user_id = auth.uid()
        and m.role in ('owner', 'manager')
    )
  );
