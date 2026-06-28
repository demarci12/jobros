-- Security fixes from RLS + eng review (2026-06-28)

-- (1) CRITICAL: increment_stock had SECURITY DEFINER but no tenant ownership check.
--     Any authenticated user could update any tenant's material stock.
create or replace function public.increment_stock(
  p_material_id uuid,
  p_delta       numeric
) returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  -- Enforce tenant ownership even under SECURITY DEFINER
  if not exists (
    select 1 from public.materials
    where id = p_material_id
      and company_id in (select public.auth_company_ids())
  ) then
    raise exception 'Access denied or material not found: %', p_material_id;
  end if;

  update public.materials
     set stock_qty  = greatest(0, stock_qty + p_delta),
         updated_at = now()
   where id = p_material_id;

  if not found then
    raise exception 'Material % not found', p_material_id;
  end if;
end;
$$;

revoke all on function public.increment_stock(uuid, numeric) from public;
grant execute on function public.increment_stock(uuid, numeric) to authenticated;

-- (2) WARNING: bump_next_service ran in caller context — technician role triggers
--     RLS denial on equipment UPDATE when closing a job (status → kesz).
create or replace function public.bump_next_service() returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if (new.status = 'kesz' and old.status is distinct from 'kesz') then
    update public.equipment e
      set next_service_due = (current_date + interval '1 year')::date
    from public.sites s
    where e.site_id = s.id
      and s.id = new.site_id
      and e.kind in ('klima', 'hoszivattyu');
  end if;
  return new;
end;
$$;

-- (3) WARNING: generate_job_number exposed as public RPC with no tenant check.
--     Revoke public/anon access; authenticated use only (still used in Server Actions).
revoke all on function public.generate_job_number(uuid) from public, anon;
grant execute on function public.generate_job_number(uuid) to authenticated;
