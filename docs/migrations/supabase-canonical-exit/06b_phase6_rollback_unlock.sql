-- Rollback for Phase 6 lock (if downstream cutover fails)
-- Restores SELECT/EXECUTE to service_role.

begin;

do $$
declare
  t text;
begin
  foreach t in array array[
    '_legacy_routes',
    '_legacy_segments',
    '_legacy_events',
    '_legacy_event_routes',
    '_legacy_event_route_segments',
    '_legacy_event_series',
    '_legacy_route_pois'
  ]
  loop
    if to_regclass(format('public.%I', t)) is not null then
      execute format('grant select on table public.%I to service_role', t);
    end if;
  end loop;
end $$;

do $$
declare
  fn record;
begin
  for fn in
    select
      n.nspname as schema_name,
      p.proname as function_name,
      pg_get_function_identity_arguments(p.oid) as function_args
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
  loop
    begin
      execute format(
        'grant execute on function %I.%I(%s) to service_role',
        fn.schema_name,
        fn.function_name,
        fn.function_args
      );
    exception
      when others then
        null;
    end;
  end loop;
end $$;

drop view if exists public.canonical_legacy_deprecation_notice;

insert into public._migration_log (phase, action, detail)
values (
  'phase6-rollback',
  'legacy_canonical_unlocked',
  jsonb_build_object('rolled_back_at', now())
);

commit;

