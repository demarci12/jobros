alter table public.stock_movements
  add constraint stock_movements_worksheet_material_key
  unique (worksheet_id, material_id);

create or replace function public.deduct_worksheet_stock(
  p_worksheet_id uuid,
  p_user_id      uuid
)
returns void language plpgsql security definer set search_path = public
as $$
declare
  r record;
begin
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

grant execute on function public.deduct_worksheet_stock to authenticated;
