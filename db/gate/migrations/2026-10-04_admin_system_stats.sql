-- Admin "System" page (/admin/system): one small RPC that summarises the database, and a heartbeat table that
-- off-site jobs (the nightly backup on the owner's computer) write to, so the page can show they still run.
-- Both are server-only: no anon/authenticated access.

create table if not exists gate.system_heartbeats (
  name text primary key,
  at timestamptz not null default now(),
  ok boolean not null default true,
  detail jsonb
);
alter table gate.system_heartbeats enable row level security;
revoke all on gate.system_heartbeats from anon, authenticated;
grant select, insert, update on gate.system_heartbeats to service_role;

create or replace function gate.admin_system_stats()
returns jsonb
language sql
stable
-- definer: reads auth.users counts and pg_stat_statements, which service_role can't read directly. Only
-- service_role may execute it (see grants below), and it returns counts and sizes, never rows of user data.
security definer
set search_path = pg_catalog, gate, public
as $$
  select jsonb_build_object(
    'db_bytes', pg_database_size(current_database()),
    'tables', (select coalesce(jsonb_agg(t order by t.bytes desc), '[]') from (
        select c.relname as name, pg_total_relation_size(c.oid) as bytes, greatest(c.reltuples, 0)::bigint as rows
          from pg_class c where c.relnamespace = 'gate'::regnamespace and c.relkind = 'r'
          order by 2 desc limit 6) t),
    'users', (select jsonb_build_object(
        'total', count(*),
        'new_7d', count(*) filter (where created_at > now() - interval '7 days'),
        'unconfirmed', count(*) filter (where email_confirmed_at is null),
        'active_30d', count(*) filter (where last_sign_in_at > now() - interval '30 days'))
      from auth.users),
    'connections', (select count(*) from pg_stat_activity where datname = current_database()),
    'max_connections', current_setting('max_connections')::int,
    -- security self-check (same idea as Supabase's security advisor)
    'rls_off', (select coalesce(jsonb_agg(n.nspname || '.' || c.relname order by 1), '[]')
        from pg_class c join pg_namespace n on n.oid = c.relnamespace
        where n.nspname in ('gate', 'public') and c.relkind = 'r' and not c.relrowsecurity),
    'anon_definer_functions', (select coalesce(jsonb_agg(n.nspname || '.' || p.proname order by 1), '[]')
        from pg_proc p join pg_namespace n on n.oid = p.pronamespace
        where n.nspname in ('gate', 'public') and p.prosecdef and has_function_privilege('anon', p.oid, 'execute')),
    'anon_policies', (select coalesce(jsonb_agg(schemaname || '.' || tablename || ': ' || policyname order by 1), '[]')
        from pg_policies where schemaname = 'gate' and roles && array['anon', 'public']::name[]),
    -- busiest database API queries since stats were last reset: a runaway script shows up here first
    'top_queries', (select coalesce(jsonb_agg(q), '[]') from (
        select s.calls, s.rows, round(s.total_exec_time)::bigint as ms,
               left(regexp_replace(s.query, '\s+', ' ', 'g'), 140) as query
          from extensions.pg_stat_statements s
          where s.query not ilike '%pg_stat_statements%'
          order by s.calls desc limit 5) q),
    'stats_since', (select stats_reset from extensions.pg_stat_statements_info),
    'heartbeats', (select coalesce(jsonb_object_agg(name, jsonb_build_object('at', at, 'ok', ok, 'detail', detail)), '{}')
        from gate.system_heartbeats)
  );
$$;

revoke execute on function gate.admin_system_stats() from public, anon, authenticated;
grant execute on function gate.admin_system_stats() to service_role;
