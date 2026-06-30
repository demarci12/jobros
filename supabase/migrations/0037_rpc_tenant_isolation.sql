-- P0 security fix: add ownership check to SECURITY DEFINER functions
-- that previously accepted p_company_id without verifying the caller belongs to that company.

create or replace function public.create_customer_with_site(
  p_company_id  uuid,
  p_name        text,
  p_phone       text,
  p_email       text,
  p_address     text,
  p_city        text,
  p_lat         double precision,
  p_lng         double precision,
  p_h3_index    text
)
returns json language plpgsql security definer set search_path = public
as $$
declare
  v_customer_id uuid;
  v_site_id     uuid;
begin
  if not exists (
    select 1 from public.company_users
    where user_id = auth.uid()
      and company_id = p_company_id
      and is_active = true
  ) then
    raise exception 'Nincs jogosultság';
  end if;

  insert into public.customers (company_id, name, phone, email)
  values (p_company_id, p_name, p_phone, p_email)
  returning id into v_customer_id;

  insert into public.sites (company_id, customer_id, address, city, lat, lng, h3_index)
  values (p_company_id, v_customer_id, p_address, p_city,
          nullif(p_lat, 0), nullif(p_lng, 0), nullif(p_h3_index, ''))
  returning id into v_site_id;

  return json_build_object('customer_id', v_customer_id, 'site_id', v_site_id);
end;
$$;


create or replace function public.create_job_with_appointment(
  p_company_id    uuid,
  p_job_number    text,
  p_customer_id   uuid,
  p_site_id       uuid,
  p_service_id    uuid,
  p_equipment_id  uuid,
  p_title         text,
  p_assigned_to   uuid,
  p_created_by    uuid,
  p_status        text,
  p_kind          text,
  p_starts_at     timestamptz,
  p_ends_at       timestamptz
)
returns json language plpgsql security definer set search_path = public
as $$
declare
  v_job_id  uuid;
  v_appt_id uuid;
begin
  if not exists (
    select 1 from public.company_users
    where user_id = auth.uid()
      and company_id = p_company_id
      and is_active = true
  ) then
    raise exception 'Nincs jogosultság';
  end if;

  insert into public.jobs (
    company_id, job_number, customer_id, site_id, service_id, equipment_id,
    title, assigned_to, created_by, status
  ) values (
    p_company_id, p_job_number, p_customer_id, p_site_id,
    nullif(p_service_id::text, '')::uuid,
    nullif(p_equipment_id::text, '')::uuid,
    p_title, p_assigned_to, p_created_by, p_status
  )
  returning id into v_job_id;

  insert into public.appointments (
    company_id, job_id, kind, technician_id, starts_at, ends_at
  ) values (
    p_company_id, v_job_id, p_kind, p_assigned_to, p_starts_at, p_ends_at
  )
  returning id into v_appt_id;

  return json_build_object('job_id', v_job_id, 'appointment_id', v_appt_id);
end;
$$;


create or replace function public.deduct_worksheet_stock(
  p_worksheet_id uuid,
  p_user_id      uuid
)
returns void language plpgsql security definer set search_path = public
as $$
declare
  v_company_id uuid;
  r record;
begin
  select w.company_id into v_company_id
  from public.worksheets w where w.id = p_worksheet_id;

  if not exists (
    select 1 from public.company_users
    where user_id = auth.uid()
      and company_id = v_company_id
      and is_active = true
  ) then
    raise exception 'Nincs jogosultság';
  end if;

  for r in
    select wl.material_id, wl.quantity
    from public.worksheet_lines wl
    where wl.worksheet_id = p_worksheet_id
      and wl.material_id is not null
      and wl.quantity > 0
  loop
    perform public.increment_stock(r.material_id, -r.quantity);

    insert into public.stock_movements (
      company_id, material_id, worksheet_id, quantity, reason, created_by
    )
    select m.company_id, r.material_id, p_worksheet_id, -r.quantity, 'Munkalap aláírás', p_user_id
    from public.materials m where m.id = r.material_id
    on conflict (worksheet_id, material_id) do nothing;
  end loop;
end;
$$;
