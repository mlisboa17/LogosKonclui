/*
  Cria organizacao + primeiro owner numa unica transacao (SECURITY DEFINER).
  Evita falhas RLS no trigger / primeiro insert em organization_members.
  A app passa a usar rpc('create_organization_with_owner') em vez de insert direto.
*/

drop trigger if exists on_organization_created on public.organizations;

create or replace function public.create_organization_with_owner(org_name text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  new_id uuid;
begin
  if auth.uid() is null then
    raise exception 'not_authenticated' using errcode = 'P0001';
  end if;
  if trim(org_name) = '' then
    raise exception 'empty_name' using errcode = 'P0002';
  end if;

  insert into public.organizations (name)
  values (trim(org_name))
  returning id into new_id;

  insert into public.organization_members (organization_id, user_id, role)
  values (new_id, auth.uid(), 'owner');

  return new_id;
end;
$$;

revoke all on function public.create_organization_with_owner(text) from public;
grant execute on function public.create_organization_with_owner(text) to authenticated;

comment on function public.create_organization_with_owner(text) is
  'Cria org + membership owner; chamado pelo painel (substitui trigger).';
