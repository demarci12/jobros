-- Prevent multiple open time entries per technician
create unique index if not exists time_entries_one_open_per_technician
  on public.time_entries (technician_id)
  where stopped_at is null;
