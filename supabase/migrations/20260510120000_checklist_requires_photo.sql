-- Evidência fotográfica por item mesmo quando o tipo de resposta é sim/nº/texto.

alter table public.checklist_items
  add column if not exists requires_photo boolean not null default false;

alter table public.checklist_template_items
  add column if not exists requires_photo boolean not null default false;

comment on column public.checklist_items.requires_photo is
  'Se true, a execução exige foto (path) mesmo para tipos boolean/number/text.';

comment on column public.checklist_template_items.requires_photo is
  'Propagado aos checklist_items quando se publica a partir deste modelo.';
