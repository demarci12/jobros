-- migration 0038: fix bump_next_service trigger to scope update to NEW.equipment_id only

create or replace function public.bump_next_service()
returns trigger language plpgsql security definer set search_path = public
as $$
begin
  if NEW.status = 'kesz' and (OLD.status is distinct from 'kesz') then
    update public.equipment
    set next_service_due = now() + interval '1 year'
    where id = NEW.equipment_id
      and NEW.equipment_id is not null;
  end if;
  return NEW;
end;
$$;
