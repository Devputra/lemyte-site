-- How far down the page a visitor got (max % of the page height seen during that page view), sent with engage events.
alter table gate.site_events add column if not exists scroll_pct smallint check (scroll_pct between 0 and 100);
