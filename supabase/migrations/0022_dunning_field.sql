-- T-64: past_due_since a dunning logikához
alter table public.subscriptions
  add column if not exists past_due_since timestamptz;
