-- Munkalap sablon és ellenőrzőlista sablon összevonása: mostantól egy "worksheet"
-- típusú sablon tartalmazza mindkettőt (checklist_items + default_lines).

update job_templates set template_kind = 'worksheet' where template_kind = 'checklist';

alter table job_templates drop constraint if exists job_templates_template_kind_check;
alter table job_templates add constraint job_templates_template_kind_check
  check (template_kind in ('quote', 'worksheet'));
alter table job_templates alter column template_kind set default 'worksheet';
