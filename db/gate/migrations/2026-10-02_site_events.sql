-- First-party site analytics: page views, clicks and engaged time, read by /admin/analytics.
-- Written only by /api/track (service role); RLS on with no policies, so no client can read or write it.

create table if not exists gate.site_events (
  id          bigint generated always as identity primary key,
  created_at  timestamptz not null default now(),
  type        text not null check (type in ('pageview', 'click', 'engage')),
  visitor_id  text not null,                 -- random id in a first-party cookie (1 year)
  session_id  text not null,                 -- ends after 30 minutes without activity
  user_id     uuid,                          -- set when the visitor is signed in
  path        text not null,
  label       text,                          -- click: button/link text or data-track name
  target      text,                          -- click: link destination
  referrer    text,
  utm_source  text,
  utm_medium  text,
  utm_campaign text,
  device      text check (device in ('mobile', 'tablet', 'desktop')),
  country     text,
  engaged_ms  integer check (engaged_ms between 0 and 3600000)
);
create index if not exists site_events_created_idx on gate.site_events (created_at);
create index if not exists site_events_session_idx on gate.site_events (session_id);
create index if not exists site_events_user_idx on gate.site_events (user_id) where user_id is not null;
alter table gate.site_events enable row level security;

-- Whole dashboard in one call. Days are counted in IST.
create or replace function gate.analytics_report(p_days integer default 30)
returns jsonb
language sql
stable
set search_path = gate, public
as $$
with ev as (
  select * from gate.site_events where created_at >= now() - make_interval(days => p_days)
),
sess as (
  select
    session_id,
    min(created_at) as started,
    max(created_at) as last_at,
    max(visitor_id) as visitor_id,
    max(user_id::text) as user_id,
    count(*) filter (where type = 'pageview') as pageviews,
    count(*) filter (where type = 'click') as clicks,
    coalesce(sum(engaged_ms), 0) as engaged_ms,
    (array_agg(path order by created_at) filter (where type = 'pageview'))[1] as entry,
    (array_agg(path order by created_at) filter (where type = 'pageview')) as pages,
    (array_agg(coalesce(nullif(utm_source, ''),
       nullif(regexp_replace(referrer, '^https?://(www\.)?([^/:]+).*$', '\2'), ''),
       'Direct') order by created_at))[1] as source,
    max(device) as device,
    max(country) as country
  from ev group by session_id
),
sess2 as (
  select *, (engaged_ms >= 10000 or pageviews >= 2) as engaged from sess
)
select jsonb_build_object(
  'totals', (select jsonb_build_object(
      'visitors', count(distinct visitor_id),
      'sessions', count(*),
      'pageviews', coalesce(sum(pageviews), 0),
      'clicks', coalesce(sum(clicks), 0),
      'engaged_sessions', count(*) filter (where engaged),
      'avg_engaged_s', coalesce(round(avg(engaged_ms) / 1000.0), 0),
      'signed_in_visitors', count(distinct user_id)
    ) from sess2),
  'daily', (select coalesce(jsonb_agg(d order by d.day), '[]') from (
      select (started at time zone 'Asia/Kolkata')::date as day, count(distinct visitor_id) as visitors,
             count(*) as sessions, sum(pageviews) as pageviews, count(*) filter (where engaged) as engaged
      from sess2 group by 1) d),
  'pages', (select coalesce(jsonb_agg(p order by p.views desc), '[]') from (
      select e.path, count(*) filter (where type = 'pageview') as views,
             count(distinct visitor_id) filter (where type = 'pageview') as visitors,
             round(coalesce(sum(engaged_ms) filter (where type = 'engage'), 0) / 1000.0
                   / greatest(count(distinct session_id) filter (where type = 'pageview'), 1)) as avg_engaged_s,
             (select round(avg(m)) from (select max(scroll_pct) m from ev x where x.path = e.path and x.scroll_pct is not null group by x.session_id) d) as avg_scroll,
             (select round(100.0 * count(*) filter (where m >= 75) / nullif(count(*), 0)) from (select max(scroll_pct) m from ev x where x.path = e.path and x.scroll_pct is not null group by x.session_id) d) as reach_75
      from ev e group by e.path having count(*) filter (where type = 'pageview') > 0
      order by views desc limit 40) p),
  'clicks', (select coalesce(jsonb_agg(c order by c.clicks desc), '[]') from (
      select label, path, max(target) as target, count(*) as clicks, count(distinct visitor_id) as visitors
      from ev where type = 'click' and label is not null
      group by label, path order by clicks desc limit 60) c),
  'sources', (select coalesce(jsonb_agg(s order by s.sessions desc), '[]') from (
      select source, count(*) as sessions, count(*) filter (where engaged) as engaged
      from sess2 group by source order by sessions desc limit 20) s),
  'devices', (select coalesce(jsonb_agg(x), '[]') from (
      select coalesce(device, 'unknown') as name, count(*) as sessions from sess2 group by 1 order by 2 desc) x),
  'countries', (select coalesce(jsonb_agg(x), '[]') from (
      select coalesce(country, '??') as name, count(*) as sessions from sess2 group by 1 order by 2 desc limit 15) x),
  'sessions', (select coalesce(jsonb_agg(r order by r.started desc), '[]') from (
      select started, visitor_id, user_id, entry, source, device, country, pageviews, clicks,
             round(engaged_ms / 1000.0) as engaged_s, pages[1:12] as pages
      from sess2 order by started desc limit 60) r),
  'users', (select coalesce(jsonb_agg(u order by u.last_seen desc), '[]') from (
      select user_id, count(*) as sessions, sum(pageviews) as pageviews, sum(clicks) as clicks,
             round(sum(engaged_ms) / 1000.0) as engaged_s, max(last_at) as last_seen
      from sess2 where user_id is not null group by user_id order by last_seen desc limit 100) u)
);
$$;
revoke all on function gate.analytics_report(integer) from public, anon, authenticated;
grant execute on function gate.analytics_report(integer) to service_role;
grant select, insert on gate.site_events to service_role;
revoke all on gate.site_events from anon, authenticated;
