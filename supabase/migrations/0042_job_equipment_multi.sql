-- Egységes foglalási folyamat: berendezés opcionális + több berendezés választható foglaláskor.
-- Emellett javítja a create_job_with_appointment RPC hibáját: a text paramétereket
-- (p_status, p_kind) explicit cast nélkül próbálta enum oszlopba írni, ami mindig
-- "column is of type ... but expression is of type text" hibát dobott.

create table job_equipment (
  job_id       uuid not null references jobs(id) on delete cascade,
  equipment_id uuid not null references equipment(id) on delete cascade,
  company_id   uuid not null references companies(id) on delete cascade,
  created_at   timestamptz not null default now(),
  primary key (job_id, equipment_id)
);
create index on job_equipment (company_id);
create index on job_equipment (equipment_id);

alter table job_equipment enable row level security;
create policy job_equipment_select on job_equipment for select
  using (company_id in (select auth_company_ids()));
create policy job_equipment_insert on job_equipment for insert
  with check (has_role(company_id, array['owner','dispatcher']::company_role[]));
create policy job_equipment_delete on job_equipment for delete
  using (has_role(company_id, array['owner','dispatcher']::company_role[]));

-- Signature changed (p_equipment_id uuid -> p_equipment_ids uuid[]); drop old overload first.
drop function if exists public.create_job_with_appointment(
  uuid, text, uuid, uuid, uuid, uuid, text, uuid, uuid, text, text, timestamptz, timestamptz
);

create or replace function public.create_job_with_appointment(
  p_company_id    uuid,
  p_job_number    text,
  p_customer_id   uuid,
  p_site_id       uuid,
  p_service_id    uuid,
  p_equipment_ids uuid[],
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
  v_job_id       uuid;
  v_appt_id      uuid;
  v_equipment_id uuid;
begin
  insert into public.jobs (
    company_id, job_number, customer_id, site_id, service_id, equipment_id,
    title, assigned_to, created_by, status
  ) values (
    p_company_id, p_job_number, p_customer_id, p_site_id,
    nullif(p_service_id::text, '')::uuid,
    p_equipment_ids[1],
    p_title, p_assigned_to, p_created_by, p_status::job_status
  )
  returning id into v_job_id;

  if p_equipment_ids is not null then
    foreach v_equipment_id in array p_equipment_ids loop
      insert into public.job_equipment (job_id, equipment_id, company_id)
      values (v_job_id, v_equipment_id, p_company_id)
      on conflict do nothing;
    end loop;
  end if;

  insert into public.appointments (
    company_id, job_id, kind, technician_id, starts_at, ends_at
  ) values (
    p_company_id, v_job_id, p_kind::appointment_kind, p_assigned_to, p_starts_at, p_ends_at
  )
  returning id into v_appt_id;

  return json_build_object('job_id', v_job_id, 'appointment_id', v_appt_id);
end;
$$;

grant execute on function public.create_job_with_appointment to authenticated;
