-- T-stock: warehouse ↔ worksheet ↔ quote integration
-- reserved_qty tracks soft-reservations from accepted/sent quotes.
-- stock_qty is the physical count; available = stock_qty - reserved_qty.

alter table public.materials
  add column if not exists reserved_qty numeric(12,3) not null default 0;

-- quote_lines gets material_id so status changes can reserve/release
alter table public.quote_lines
  add column if not exists material_id uuid references public.materials(id) on delete set null;

create index if not exists quote_lines_material_id_idx on public.quote_lines (material_id);
