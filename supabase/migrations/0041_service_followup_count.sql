-- Egységes foglalási folyamat: konfigurálható követő-látogatás szám + "kovetes" appointment típus

alter table services add column follow_up_count int not null default 2 check (follow_up_count >= 0);

alter type appointment_kind add value 'kovetes';
