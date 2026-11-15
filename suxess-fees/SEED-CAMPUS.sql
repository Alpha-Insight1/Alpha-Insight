-- One Main campus for Alpha Insight (safe to run more than once)
insert into public.campuses (name, short_name, is_active)
select 'Main School', 'MAIN', true
where not exists (
  select 1 from public.campuses where lower(name) = 'main school' or short_name = 'MAIN'
);

-- Optional: remove extra test campuses (keep MAIN / Main School only)
-- delete from public.campuses
-- where short_name not in ('MAIN') and lower(name) not in ('main school');
