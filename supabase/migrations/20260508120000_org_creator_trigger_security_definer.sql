/*
  O trigger add_org_creator_as_owner insere em organization_members.
  A politica "org_members_insert_by_manager" exige ja existir membro manager/owner —
  impossivel na primeira linha.

  1) Funcao SECURITY DEFINER (insere o owner inicial sem depender da politica acima).
  2) Politica extra: permite o primeiro membro (owner) quando a org ainda nao tem linhas
     em organization_members — cobre bases onde o definer ainda sofre RLS.
*/

create or replace function public.add_org_creator_as_owner()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is not null then
    insert into public.organization_members (organization_id, user_id, role)
    values (new.id, auth.uid(), 'owner');
  end if;
  return new;
end;
$$;

drop policy if exists "org_members_insert_first_owner" on public.organization_members;

create policy "org_members_insert_first_owner"
  on public.organization_members for insert
  with check (
    auth.uid() is not null
    and user_id = auth.uid()
    and role = 'owner'
    and not exists (
      select 1 from public.organization_members x
      where x.organization_id = organization_members.organization_id
    )
  );
