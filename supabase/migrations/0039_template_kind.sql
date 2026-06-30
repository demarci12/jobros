alter table public.job_templates
  add column template_kind text not null default 'checklist'
  check (template_kind in ('checklist', 'quote', 'worksheet'));
