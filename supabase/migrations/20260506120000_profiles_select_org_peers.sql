/*
  Membros da mesma organizacao podem ver nome (profiles) uns dos outros — necessario para painel Equipe / score (estilo Konclui).
*/

drop policy if exists "profiles_select_org_peers" on public.profiles;

create policy "profiles_select_org_peers"
  on public.profiles for select
  using (
    exists (
      select 1 from public.organization_members m1
      inner join public.organization_members m2 on m1.organization_id = m2.organization_id
      where m1.user_id = auth.uid() and m2.user_id = profiles.id
    )
  );
