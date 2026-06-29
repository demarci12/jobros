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

grant execute on function public.create_customer_with_site to authenticated;
