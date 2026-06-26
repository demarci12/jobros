-- T-26: booking settings — working_hours + default_slot_duration_min on companies

alter table companies
  add column if not exists working_hours jsonb not null default '{
    "mon": {"open": true,  "start": "08:00", "end": "17:00"},
    "tue": {"open": true,  "start": "08:00", "end": "17:00"},
    "wed": {"open": true,  "start": "08:00", "end": "17:00"},
    "thu": {"open": true,  "start": "08:00", "end": "17:00"},
    "fri": {"open": true,  "start": "08:00", "end": "17:00"},
    "sat": {"open": false, "start": "08:00", "end": "13:00"},
    "sun": {"open": false, "start": "08:00", "end": "13:00"}
  }'::jsonb,
  add column if not exists default_slot_duration_min int not null default 120;
