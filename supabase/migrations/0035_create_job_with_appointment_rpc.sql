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

grant execute on function public.create_job_with_appointment to authenticated;
