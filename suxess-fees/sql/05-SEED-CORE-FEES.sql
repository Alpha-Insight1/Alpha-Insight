-- Core fee types + default_amount column
alter table public.fee_types add column if not exists default_amount numeric(12,2) default 0;
alter table public.fee_types add column if not exists is_active boolean default true;

insert into public.fee_types (name, description, default_amount, is_active)
select v.name, v.description, 0, true
from (values
  ('School Fees', 'Term school fees'),
  ('NECO', 'NECO examination'),
  ('JAMB', 'JAMB / UTME'),
  ('Uniform', 'School uniform'),
  ('School Bus', 'School bus fee')
) as v(name, description)
where not exists (
  select 1 from public.fee_types ft where lower(ft.name) = lower(v.name)
);

select id, name, default_amount from public.fee_types order by name;
