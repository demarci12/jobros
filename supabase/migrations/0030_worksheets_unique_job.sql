-- T-35 fix: ensure one worksheet per job (prevents duplicate insert race)
alter table public.worksheets
  add constraint worksheets_job_id_unique unique (job_id);
