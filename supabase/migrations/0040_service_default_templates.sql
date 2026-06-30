alter table public.services
  add column if not exists default_quote_template_id     uuid references public.job_templates(id) on delete set null,
  add column if not exists default_worksheet_template_id uuid references public.job_templates(id) on delete set null;
