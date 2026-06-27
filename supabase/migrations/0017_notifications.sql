-- T-53: Értesítések (notifications) + T-54: notification_settings
-- Rendszerterv 8.11

-- ---------------------------------------------------------------------------
-- notification_event enum
-- ---------------------------------------------------------------------------
create type public.notification_event as enum (
  'technician_on_the_way',
  'quote_ready',
  'invoice_sent',
  'service_reminder',
  'appointment_confirmed',
  'appointment_cancelled'
);

create type public.notification_channel as enum ('sms', 'email', 'push');

-- ---------------------------------------------------------------------------
-- notifications (kimenő értesítés napló)
-- ---------------------------------------------------------------------------
create table public.notifications (
  id             uuid                       primary key default gen_random_uuid(),
  company_id     uuid                       not null references public.companies(id) on delete cascade,
  job_id         uuid                       references public.jobs(id) on delete set null,
  recipient      text                       not null,   -- telefon vagy email
  channel        public.notification_channel not null,
  event          public.notification_event  not null,
  body           text                       not null,
  status         text                       not null default 'sent',  -- sent|failed
  external_id    text,                                 -- Infobip/Resend message id
  error          text,
  created_at     timestamptz                not null default now()
);

create index on public.notifications (company_id);
create index on public.notifications (job_id);

alter table public.notifications enable row level security;

create policy notifications_select on public.notifications
  for select using (public.has_role(company_id, array['owner','dispatcher']::public.company_role[]));

-- INSERT via service role only (server-side notification layer)

-- ---------------------------------------------------------------------------
-- notification_settings (per-company, per-event beállítások)
-- ---------------------------------------------------------------------------
create table public.notification_settings (
  id             uuid                        primary key default gen_random_uuid(),
  company_id     uuid                        not null references public.companies(id) on delete cascade,
  event          public.notification_event   not null,
  is_enabled     boolean                     not null default true,
  channels       public.notification_channel[] not null default array['sms']::public.notification_channel[],
  template       text,                                  -- null = alapértelmezett sablon
  updated_at     timestamptz                 not null default now(),
  unique (company_id, event)
);

create trigger trg_notification_settings_updated_at
  before update on public.notification_settings
  for each row execute function public.set_updated_at();

alter table public.notification_settings enable row level security;

create policy notification_settings_select on public.notification_settings
  for select using (public.has_role(company_id, array['owner','dispatcher']::public.company_role[]));

create policy notification_settings_upsert on public.notification_settings
  for all using (public.has_role(company_id, array['owner']::public.company_role[]));
