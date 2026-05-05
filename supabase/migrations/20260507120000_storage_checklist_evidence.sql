/*
  Bucket privado para fotos de execucao. Caminho: {organization_id}/{run_id}/{arquivo}
*/

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'checklist-evidence',
  'checklist-evidence',
  false,
  5242880,
  array['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif']::text[]
)
on conflict (id) do update set
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "checklist_evidence_select" on storage.objects;
drop policy if exists "checklist_evidence_insert" on storage.objects;
drop policy if exists "checklist_evidence_update" on storage.objects;
drop policy if exists "checklist_evidence_delete" on storage.objects;

create policy "checklist_evidence_select"
  on storage.objects for select
  to authenticated
  using (
    bucket_id = 'checklist-evidence'
    and split_part(name, '/', 1)::uuid in (
      select organization_id from public.organization_members where user_id = auth.uid()
    )
  );

create policy "checklist_evidence_insert"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'checklist-evidence'
    and split_part(name, '/', 1)::uuid in (
      select organization_id from public.organization_members where user_id = auth.uid()
    )
    and exists (
      select 1 from public.checklist_runs r
      where r.id = split_part(name, '/', 2)::uuid
        and r.organization_id = split_part(name, '/', 1)::uuid
    )
    and array_length(string_to_array(trim(name), '/'), 1) >= 3
  );

create policy "checklist_evidence_update"
  on storage.objects for update
  to authenticated
  using (
    bucket_id = 'checklist-evidence'
    and split_part(name, '/', 1)::uuid in (
      select organization_id from public.organization_members where user_id = auth.uid()
    )
  )
  with check (
    bucket_id = 'checklist-evidence'
    and split_part(name, '/', 1)::uuid in (
      select organization_id from public.organization_members where user_id = auth.uid()
    )
  );

create policy "checklist_evidence_delete"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'checklist-evidence'
    and split_part(name, '/', 1)::uuid in (
      select organization_id from public.organization_members where user_id = auth.uid()
    )
  );
