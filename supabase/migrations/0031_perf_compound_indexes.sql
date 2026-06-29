-- Perf: compound indexes for the three hottest query paths

-- (1) auth_company_ids() + has_role() fire on every RLS policy evaluation.
--     Both filter: user_id = auth.uid() AND is_active = true.
--     The existing (user_id) index helps but Postgres still evaluates is_active
--     as a heap fetch. A partial index on active rows removes that step.
create index if not exists company_users_active_user_idx
  on public.company_users (user_id)
  where is_active = true;

-- (2) Cron idempotency check in service-reminders and billing-lifecycle:
--     SELECT ... WHERE company_id = ? AND event = ? AND created_at >= ?
--     Only (company_id) and (job_id) indexes exist — event + date scan was full.
create index if not exists notifications_company_event_created_idx
  on public.notifications (company_id, event, created_at);

-- (3) /raktar stock_movements list: ORDER BY created_at DESC, filtered by company_id.
--     The (company_id) index exists but Postgres needs a separate sort step.
create index if not exists stock_movements_company_created_idx
  on public.stock_movements (company_id, created_at desc);
