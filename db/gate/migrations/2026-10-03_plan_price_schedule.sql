-- Published price schedule for a plan (see src/lib/gate/plan-price.ts): tiers in date order, each valid up to and
-- including `until` (IST date); the last tier has until = null. price_inr stays as the base/fallback price.
alter table gate.plans add column if not exists price_schedule jsonb;

-- "Until GATE 2027" gets cheaper as the exam nears, so it never costs more than another plan that covers the exam.
update gate.plans set price_schedule = '[
  {"until": "2026-10-31", "price": 999},
  {"until": "2026-11-30", "price": 799},
  {"until": "2026-12-31", "price": 599},
  {"until": "2027-01-19", "price": 399},
  {"until": null, "price": 299}
]'::jsonb
where code = 'LM_GATE_UNTIL_2027';
