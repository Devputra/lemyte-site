-- Serialize access changes for each user, including changes from different orders.
create or replace function gate.grant_access_for_order(p_order_id uuid, p_provider_payment_id text)
returns jsonb
language plpgsql
security invoker
set search_path = gate, public
as $$
declare
  v_user_id uuid;
  v_order gate.payment_orders%rowtype;
  v_plan gate.plans%rowtype;
  v_pass gate.access_passes%rowtype;
  v_start timestamptz;
  v_end timestamptz;
begin
  select user_id into strict v_user_id from gate.payment_orders where id = p_order_id;
  perform pg_advisory_xact_lock(hashtextextended(v_user_id::text, 0));
  select * into strict v_order from gate.payment_orders where id = p_order_id for update;
  -- A refunded order is terminal. FAILED is not: Razorpay lets the buyer retry on the same order, so a later
  -- captured payment must still grant access.
  if v_order.status = 'REFUNDED' then
    return jsonb_build_object('granted', false, 'reason', v_order.status::text);
  end if;
  select * into v_pass from gate.access_passes where payment_order_id = p_order_id;
  if found then
    return jsonb_build_object('granted', true, 'pass', to_jsonb(v_pass));
  end if;
  select * into strict v_plan from gate.plans where id = v_order.plan_id;
  select greatest(now(), max(ends_at)) into v_start
    from gate.access_passes where user_id = v_user_id and status = 'ACTIVE';
  v_end := coalesce(v_plan.ends_at, v_start + make_interval(months => v_plan.duration_months));
  if v_end <= v_start then
    return jsonb_build_object('granted', false, 'reason', 'NO_TIME_TO_ADD');
  end if;
  insert into gate.access_passes(user_id, plan_id, payment_order_id, starts_at, ends_at)
    values (v_user_id, v_order.plan_id, p_order_id, v_start, v_end)
    returning * into v_pass;
  update gate.payment_orders set status = 'CAPTURED',
    provider_payment_id = coalesce(p_provider_payment_id, provider_payment_id), updated_at = now()
    where id = p_order_id;
  return jsonb_build_object('granted', true, 'pass', to_jsonb(v_pass));
end;
$$;

create or replace function gate.revoke_access_for_order(p_order_id uuid)
returns jsonb
language plpgsql
security invoker
set search_path = gate, public
as $$
declare
  v_user_id uuid;
  v_pass gate.access_passes%rowtype;
  v_now timestamptz := now();
  v_removed interval;
begin
  select user_id into strict v_user_id from gate.payment_orders where id = p_order_id;
  perform pg_advisory_xact_lock(hashtextextended(v_user_id::text, 0));
  update gate.payment_orders set status = 'REFUNDED', updated_at = v_now where id = p_order_id;
  select * into v_pass from gate.access_passes where payment_order_id = p_order_id for update;
  if not found or v_pass.status = 'REFUNDED' then
    return jsonb_build_object('refunded', true);
  end if;
  if v_pass.ends_at > v_now then
    v_removed := v_pass.ends_at - greatest(v_pass.starts_at, v_now);
    update gate.access_passes set status = 'REFUNDED',
      starts_at = least(v_pass.starts_at, v_now - interval '1 second'),
      ends_at = v_now, updated_at = v_now where id = v_pass.id;
    -- Any failure rolls back the refund as well as every shifted pass.
    -- Fixed-date passes ("Until GATE 2027") keep their end date; only their start moves earlier.
    update gate.access_passes ap set starts_at = ap.starts_at - v_removed,
      ends_at = case when pl.ends_at is null then ap.ends_at - v_removed else ap.ends_at end,
      updated_at = v_now
      from gate.plans pl
      where pl.id = ap.plan_id and ap.user_id = v_user_id and ap.status = 'ACTIVE' and ap.starts_at >= v_pass.ends_at;
  else
    update gate.access_passes set status = 'REFUNDED', updated_at = v_now where id = v_pass.id;
  end if;
  return jsonb_build_object('refunded', true);
end;
$$;

revoke all on function gate.grant_access_for_order(uuid, text) from public, anon, authenticated;
revoke all on function gate.revoke_access_for_order(uuid) from public, anon, authenticated;
grant execute on function gate.grant_access_for_order(uuid, text) to service_role;
grant execute on function gate.revoke_access_for_order(uuid) to service_role;
