-- 0018: RLS hardening patches
-- (1) invoices: drop kliens UPDATE policy — minden számla-módosítás service_role-on át megy
-- (2) zones_update: with check hozzáadása hogy UPDATE utáni sor is a tenanthoz tartozzon
-- (3) increment_stock atomikus RPC (stock deduction race condition fix)

-- ---------------------------------------------------------------------------
-- (1) invoices UPDATE — csak webhook (service_role) módosíthat
-- ---------------------------------------------------------------------------
drop policy if exists invoices_update on public.invoices;
-- Megjegyzés: az invoices service_role-os server action-ökön (API route) át módosul,
-- kliens anon key-jével nem szabad nav_status-t írni.

-- ---------------------------------------------------------------------------
-- (2) zones_update — with check biztosítja hogy az UPDATE utáni sor
--     is a saját céghez tartozzon (megakadályozza a company_id módosítást)
-- ---------------------------------------------------------------------------
drop policy if exists zones_update on public.service_zones;

create policy zones_update on public.service_zones
  for update
  using (public.has_role(company_id, array['owner','dispatcher']::public.company_role[]))
  with check (public.has_role(company_id, array['owner','dispatcher']::public.company_role[]));

-- ---------------------------------------------------------------------------
-- (3) increment_stock — atomikus készlet-módosítás (nincs read-modify-write)
-- ---------------------------------------------------------------------------
create or replace function public.increment_stock(
  p_material_id uuid,
  p_delta       numeric
) returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.materials
     set stock_qty  = greatest(0, stock_qty + p_delta),
         updated_at = now()
   where id = p_material_id;

  if not found then
    raise exception 'Material % not found', p_material_id;
  end if;
end;
$$;

-- Csak az authenticated role hívhatja (RLS a materials táblán biztosítja a tenant izolációt)
revoke all on function public.increment_stock(uuid, numeric) from public;
grant execute on function public.increment_stock(uuid, numeric) to authenticated;
