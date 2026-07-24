-- Rewards balance = lifetime earned minus gift-card / spend redemptions (kind = redeem).
-- Shown on Spend page and Rewards Tracker; decreases when points are redeemed.
-- Existing test redemptions before the cutoff are treated as legacy so the
-- current displayed balance starts from the pre-change Rewards Tracker total.

update public.reward_transactions
set metadata = coalesce(metadata, '{}'::jsonb) ||
  jsonb_build_object('exclude_from_reward_balance', true)
where kind = 'redeem'
  and points_delta < 0
  and created_at < '2026-07-09T15:00:00Z'::timestamptz
  and coalesce(metadata->>'exclude_from_reward_balance', 'false') <> 'true';

create or replace function public.gamification_reward_total_points(p_user_id uuid)
returns numeric
language sql
stable
security definer
set search_path = public
as $$
  select greatest(
    0,
    coalesce(sum(case when points_delta > 0 then points_delta else 0 end), 0)
    - coalesce(
        sum(
          case
            when kind = 'redeem'
              and points_delta < 0
              and coalesce(metadata->>'exclude_from_reward_balance', 'false') <> 'true'
              and created_at >= '2026-07-09T15:00:00Z'::timestamptz
            then abs(points_delta)
            else 0
          end
        ),
        0
      )
  )
  from public.reward_transactions
  where user_id = p_user_id;
$$;

create or replace function public.gamification_gift_spendable_points(p_user_id uuid)
returns numeric
language sql
stable
security definer
set search_path = public
as $$
  select public.gamification_reward_total_points(p_user_id);
$$;

create or replace function public.redeem_points(
  p_amount numeric,
  p_metadata jsonb default '{}'
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_balance numeric;
  v_amount numeric := floor(coalesce(p_amount, 0));
begin
  if v_user_id is null then
    raise exception 'not_authenticated';
  end if;
  if v_amount <= 0 then
    return jsonb_build_object('ok', false, 'error', 'invalid_amount');
  end if;

  v_balance := public.gamification_reward_total_points(v_user_id);

  if v_balance < v_amount then
    return jsonb_build_object('ok', false, 'error', 'insufficient_points', 'balance', v_balance);
  end if;

  perform public.gamification_apply_points(
    v_user_id, -v_amount, 'redeem', 'spend_redeem',
    jsonb_build_object('amount', v_amount) || coalesce(p_metadata, '{}'::jsonb)
  );

  v_balance := public.gamification_reward_total_points(v_user_id);

  return jsonb_build_object('ok', true, 'balance', v_balance, 'redeemed', v_amount);
end;
$$;

grant execute on function public.gamification_reward_total_points(uuid) to authenticated;
grant execute on function public.gamification_gift_spendable_points(uuid) to authenticated;
grant execute on function public.redeem_points(numeric, jsonb) to authenticated;

-- Client-facing balance for the authenticated user (no row-limit issues).
create or replace function public.get_reward_balance()
returns numeric
language sql
stable
security definer
set search_path = public
as $$
  select public.gamification_reward_total_points(auth.uid());
$$;

grant execute on function public.get_reward_balance() to authenticated;
