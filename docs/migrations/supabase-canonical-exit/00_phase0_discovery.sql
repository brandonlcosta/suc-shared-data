-- Phase 0: Discovery only (read-only)
-- Purpose: produce a dependency map before any mutation.

set search_path = public;

with canonical_tables(table_name) as (
  values
    ('routes'),
    ('segments'),
    ('events'),
    ('event_routes'),
    ('event_route_segments'),
    ('event_series'),
    ('route_pois')
)
select
  ct.table_name,
  to_regclass(format('public.%I', ct.table_name)) is not null as exists_in_public
from canonical_tables ct
order by ct.table_name;

-- Canonical table columns
select
  c.table_name,
  c.column_name,
  c.data_type,
  c.is_nullable,
  c.column_default
from information_schema.columns c
where c.table_schema = 'public'
  and c.table_name in (
    'routes','segments','events','event_routes',
    'event_route_segments','event_series','route_pois'
  )
order by c.table_name, c.ordinal_position;

-- Foreign keys crossing canonical/user boundaries
with canonical(name) as (
  values
    ('routes'),
    ('segments'),
    ('events'),
    ('event_routes'),
    ('event_route_segments'),
    ('event_series'),
    ('route_pois')
)
select
  con.conname as fk_name,
  src.relname as source_table,
  tgt.relname as target_table,
  pg_get_constraintdef(con.oid) as fk_definition,
  (src.relname in (select name from canonical)) as source_is_canonical,
  (tgt.relname in (select name from canonical)) as target_is_canonical
from pg_constraint con
join pg_class src on src.oid = con.conrelid
join pg_namespace srcn on srcn.oid = src.relnamespace
join pg_class tgt on tgt.oid = con.confrelid
join pg_namespace tgtn on tgtn.oid = tgt.relnamespace
where con.contype = 'f'
  and srcn.nspname = 'public'
  and tgtn.nspname = 'public'
  and (
    src.relname in (select name from canonical)
    or tgt.relname in (select name from canonical)
  )
order by source_table, target_table, fk_name;

-- Indexes on canonical tables
select
  schemaname,
  tablename,
  indexname,
  indexdef
from pg_indexes
where schemaname = 'public'
  and tablename in (
    'routes','segments','events','event_routes',
    'event_route_segments','event_series','route_pois'
  )
order by tablename, indexname;

-- Triggers on canonical tables
select
  cls.relname as table_name,
  trg.tgname as trigger_name,
  pg_get_triggerdef(trg.oid, true) as trigger_definition
from pg_trigger trg
join pg_class cls on cls.oid = trg.tgrelid
join pg_namespace nsp on nsp.oid = cls.relnamespace
where not trg.tgisinternal
  and nsp.nspname = 'public'
  and cls.relname in (
    'routes','segments','events','event_routes',
    'event_route_segments','event_series','route_pois'
  )
order by cls.relname, trg.tgname;

-- RLS policy map
select
  pol.schemaname,
  pol.tablename,
  pol.policyname,
  pol.permissive,
  pol.roles,
  pol.cmd,
  pol.qual,
  pol.with_check
from pg_policies pol
where pol.schemaname = 'public'
  and pol.tablename in (
    'routes','segments','events','event_routes',
    'event_route_segments','event_series','route_pois'
  )
order by pol.tablename, pol.policyname;

-- Views depending on canonical tables
with canonical(name) as (
  values
    ('routes'),
    ('segments'),
    ('events'),
    ('event_routes'),
    ('event_route_segments'),
    ('event_series'),
    ('route_pois')
)
select distinct
  view_n.nspname as view_schema,
  view_c.relname as view_name,
  base_c.relname as referenced_canonical_table
from pg_rewrite rw
join pg_class view_c on view_c.oid = rw.ev_class
join pg_namespace view_n on view_n.oid = view_c.relnamespace
join pg_depend dep on dep.objid = rw.oid
join pg_class base_c on base_c.oid = dep.refobjid
join pg_namespace base_n on base_n.oid = base_c.relnamespace
where view_c.relkind in ('v', 'm')
  and view_n.nspname = 'public'
  and base_n.nspname = 'public'
  and base_c.relname in (select name from canonical)
order by view_schema, view_name, referenced_canonical_table;

-- RPC/functions referencing canonical tables
select
  n.nspname as function_schema,
  p.proname as function_name,
  pg_get_function_identity_arguments(p.oid) as function_args,
  case
    when pg_get_functiondef(p.oid) ilike '% routes %' or pg_get_functiondef(p.oid) ilike '% public.routes %' then 'routes'
    when pg_get_functiondef(p.oid) ilike '% segments %' or pg_get_functiondef(p.oid) ilike '% public.segments %' then 'segments'
    when pg_get_functiondef(p.oid) ilike '% events %' or pg_get_functiondef(p.oid) ilike '% public.events %' then 'events'
    when pg_get_functiondef(p.oid) ilike '% event_routes %' or pg_get_functiondef(p.oid) ilike '% public.event_routes %' then 'event_routes'
    when pg_get_functiondef(p.oid) ilike '% event_route_segments %' or pg_get_functiondef(p.oid) ilike '% public.event_route_segments %' then 'event_route_segments'
    when pg_get_functiondef(p.oid) ilike '% event_series %' or pg_get_functiondef(p.oid) ilike '% public.event_series %' then 'event_series'
    when pg_get_functiondef(p.oid) ilike '% route_pois %' or pg_get_functiondef(p.oid) ilike '% public.route_pois %' then 'route_pois'
    else 'unknown'
  end as likely_reference
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public'
  and (
    pg_get_functiondef(p.oid) ilike '%routes%'
    or pg_get_functiondef(p.oid) ilike '%segments%'
    or pg_get_functiondef(p.oid) ilike '%events%'
    or pg_get_functiondef(p.oid) ilike '%event_routes%'
    or pg_get_functiondef(p.oid) ilike '%event_route_segments%'
    or pg_get_functiondef(p.oid) ilike '%event_series%'
    or pg_get_functiondef(p.oid) ilike '%route_pois%'
  )
order by function_schema, function_name;

