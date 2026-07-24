-- Store gift card details on reward redemption transactions.

drop function if exists public.redeem_points(numeric);

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

  select coalesce(user_points, 0) into v_balance
  from public.profiles where id = v_user_id;

  if v_balance < v_amount then
    return jsonb_build_object('ok', false, 'error', 'insufficient_points', 'balance', v_balance);
  end if;

  v_balance := public.gamification_apply_points(
    v_user_id, -v_amount, 'redeem', 'spend_redeem',
    jsonb_build_object('amount', v_amount) || coalesce(p_metadata, '{}'::jsonb)
  );

  return jsonb_build_object('ok', true, 'balance', v_balance, 'redeemed', v_amount);
end;
$$;

grant execute on function public.redeem_points(numeric, jsonb) to authenticated;
