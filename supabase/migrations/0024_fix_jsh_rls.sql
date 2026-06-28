-- A log_job_status_change trigger SECURITY DEFINER-rel fut, ezért
-- az INSERT-et az RLS blokkolja (nincs INSERT policy).
-- Megoldás: a trigger függvényt SECURITY DEFINER-re állítjuk, így
-- a DB-owner kontextusában írja a sort (bypass RLS), az auth.uid() azonban
-- megmarad, mert a session context öröklődik.

create or replace function log_job_status_change() returns trigger
  security definer
  set search_path = public
as $$
begin
  if (tg_op = 'UPDATE' and new.status is distinct from old.status) then
    insert into job_status_history (company_id, job_id, from_status, to_status, changed_by)
    values (new.company_id, new.id, old.status, new.status, auth.uid());
  end if;
  return new;
end;
$$ language plpgsql;
