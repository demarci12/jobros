-- Atomic update of reserved_qty on materials (positive delta = reserve, negative = release).
-- Clamps to 0 so reserved_qty never goes negative.
create or replace function public.increment_reserved(
  p_material_id uuid,
  p_delta       numeric
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.materials
  set reserved_qty = greatest(0, reserved_qty + p_delta)
  where id = p_material_id;
end;
$$;
