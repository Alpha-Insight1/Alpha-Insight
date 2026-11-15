-- Run once if student registration fails due to missing campus
insert into public.campuses (name, short_name, is_active)
select 'Main School', 'MAIN', true
where not exists (select 1 from public.campuses limit 1);
