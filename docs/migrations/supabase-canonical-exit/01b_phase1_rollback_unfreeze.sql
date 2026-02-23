-- Rollback for Phase 1 (if Phase 2/3 validation fails and legacy access is needed)
-- Non-destructive reverse rename + write grants restoration.

begin;

do $$
declare
  rec record;
begin
  for rec in
    select *
    from (values
      ('_legacy_routes', 'routes'),
      ('_legacy_segments', 'segments'),
      ('_legacy_events', 'events'),
      ('_legacy_event_routes', 'event_routes'),
      ('_legacy_event_route_segments', 'event_route_segments'),
      ('_legacy_event_series', 'event_series'),
      ('_legacy_route_pois', 'route_pois')
    ) as m(old_name, new_name)
  loop
    if to_regclass(format('public.%I', rec.old_name)) is not null then
      if to_regclass(format('public.%I', rec.new_name)) is not null then
        raise exception 'Rollback blocked; target exists: %', rec.new_name;
      end if;
      execute format('alter table public.%I rename to %I', rec.old_name, rec.new_name);
      execute format('grant select, insert, update, delete on table public.%I to anon, authenticated, service_role', rec.new_name);
    end if;
  end loop;
end $$;

insert into public._migration_log (phase, action, detail)
values (
  'phase1-rollback',
  'legacy_canonical_unfrozen',
  jsonb_build_object('rolled_back_at', now())
);

commit;

