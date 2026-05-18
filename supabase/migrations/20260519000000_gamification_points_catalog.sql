-- Points catalog v2 (product spec)

drop function if exists public.award_task_points(text, text);
drop function if exists public.gamification_task_points(text);
drop function if exists public.gamification_resolve_task_key(text, text);

create or replace function public.gamification_task_points(
  p_task_id text,
  p_metadata jsonb default '{}'
)
returns numeric
language plpgsql
stable
as $$
declare
  v_tier text := coalesce(p_metadata->>'tier', '');
  v_section text := coalesce(p_metadata->>'section', '');
  v_override numeric;
begin
  v_override := nullif(p_metadata->>'points', '')::numeric;
  if v_override is not null and v_override > 0 then
    return v_override;
  end if;

  return case p_task_id
    when 'daily-login' then 10
    when 'daily-mood' then 20
    when 'expense-log' then 30
    when 'video-quiz' then 100
    when 'counselling-session' then 500
    when 'counselling-reflection' then 50
    when 'plan-line-item' then greatest(
      50,
      least(300, coalesce(nullif(p_metadata->>'tier_level', '')::int, 1) * 75)
    )
    when 'plan-section-complete' then
      case
        when v_section in ('income', 'expenses') then 500
        when v_section in ('assets', 'liabilities') then 1000
        else 500
      end
    when 'full-plan-complete' then 5000
    when 'monthly-budget-update' then 500
    when 'update-budget' then 500
    when 'monthly-review-complete' then 1500
    when 'month-ended-green' then 2000
    when 'month-ended-red-logged' then 1000
    when 'tier-promotion' then
      case v_tier
        when 'Debt Crusher' then 2000
        when 'Cash King' then 4000
        when 'Wealth Creator' then 7000
        when 'Legacy Builder' then 10000
        else 2000
      end
    when 'transunion-connection' then 1500
    when 'astute-connection' then 3000
    when 'buddy-mentor-session' then 200
    when 'onboarding-complete' then 1500
    when 'signup' then 0
    else 0
  end;
end;
$$;

create or replace function public.gamification_resolve_task_key(
  p_task_id text,
  p_local_date text,
  p_metadata jsonb default '{}'
)
returns text
language plpgsql
stable
as $$
declare
  v_date date := coalesce(nullif(p_local_date, '')::date, current_date);
  v_date_str text := to_char(v_date, 'YYYY-MM-DD');
  v_month_str text := to_char(v_date, 'YYYY-MM');
  v_session text := coalesce(p_metadata->>'session_id', '');
  v_content text := coalesce(p_metadata->>'content_id', 'default');
  v_section text := coalesce(p_metadata->>'section', 'general');
  v_tier text := coalesce(p_metadata->>'tier', 'unknown');
  v_n int;
begin
  case p_task_id
    when 'daily-login' then
      return 'daily-login-' || v_date_str;
    when 'daily-mood' then
      return 'daily-mood-' || v_date_str;
    when 'expense-log' then
      return 'expense-log-' || v_date_str;
    when 'video-quiz' then
      select count(*)::int into v_n
      from public.task_completions
      where user_id = auth.uid()
        and task_id like 'video-quiz-' || v_date_str || '-%';
      return 'video-quiz-' || v_date_str || '-' || (v_n + 1)::text;
    when 'counselling-session' then
      return 'counselling-session-' || coalesce(nullif(v_session, ''), v_date_str);
    when 'counselling-reflection' then
      return 'counselling-reflection-' || coalesce(nullif(v_session, ''), v_date_str);
    when 'plan-line-item' then
      return 'plan-line-item-' || coalesce(p_metadata->>'item_id', v_date_str || '-' || gen_random_uuid()::text);
    when 'plan-section-complete' then
      return 'plan-section-' || v_section;
    when 'monthly-budget-update', 'update-budget' then
      return 'monthly-budget-update-' || v_month_str;
    when 'monthly-review-complete' then
      return 'monthly-review-' || v_month_str;
    when 'month-ended-green' then
      return 'month-ended-green-' || v_month_str;
    when 'month-ended-red-logged' then
      return 'month-ended-red-' || v_month_str;
    when 'buddy-mentor-session' then
      return 'buddy-mentor-' || to_char(v_date, 'IYYY-"W"IW') || '-' || coalesce(nullif(v_session, ''), '1');
    when 'tier-promotion' then
      return 'tier-promotion-' || v_tier;
    else
      return p_task_id;
  end case;
end;
$$;

create or replace function public.award_task_points(
  p_task_id text,
  p_local_date text default null,
  p_metadata jsonb default '{}'
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_task_key text;
  v_points numeric;
  v_balance numeric;
  v_grant_token boolean := false;
  v_date date := coalesce(nullif(p_local_date, '')::date, current_date);
  v_date_str text := to_char(v_date, 'YYYY-MM-DD');
  v_video_count int;
begin
  if v_user_id is null then
    raise exception 'not_authenticated';
  end if;

  if p_task_id = 'video-quiz' then
    select count(*)::int into v_video_count
    from public.task_completions
    where user_id = v_user_id
      and task_id like 'video-quiz-' || v_date_str || '-%';
    if v_video_count >= 3 then
      select coalesce(user_points, 0) into v_balance from public.profiles where id = v_user_id;
      return jsonb_build_object(
        'ok', false,
        'error', 'daily_cap_reached',
        'balance', v_balance,
        'points_awarded', 0
      );
    end if;
  end if;

  v_task_key := public.gamification_resolve_task_key(p_task_id, p_local_date, p_metadata);
  v_points := public.gamification_task_points(p_task_id, p_metadata);

  if v_points <= 0 and p_task_id not in (
    'daily-login', 'daily-mood', 'expense-log', 'video-quiz',
    'counselling-session', 'counselling-reflection', 'plan-line-item',
    'plan-section-complete', 'full-plan-complete', 'monthly-budget-update',
    'update-budget', 'monthly-review-complete', 'month-ended-green',
    'month-ended-red-logged', 'tier-promotion', 'transunion-connection',
    'astute-connection', 'buddy-mentor-session', 'onboarding-complete'
  ) then
    return jsonb_build_object('ok', false, 'error', 'unknown_task', 'balance', 0);
  end if;

  if exists (
    select 1 from public.task_completions
    where user_id = v_user_id and task_id = v_task_key
  ) then
    select coalesce(user_points, 0) into v_balance from public.profiles where id = v_user_id;
    return jsonb_build_object(
      'ok', true,
      'already_completed', true,
      'task_key', v_task_key,
      'points_awarded', 0,
      'balance', v_balance
    );
  end if;

  insert into public.task_completions (user_id, task_id, points_awarded)
  values (v_user_id, v_task_key, v_points);

  if v_points > 0 then
    v_balance := public.gamification_apply_points(
      v_user_id, v_points, 'task', p_task_id,
      jsonb_build_object('task_key', v_task_key) || coalesce(p_metadata, '{}'::jsonb)
    );
  else
    select coalesce(user_points, 0) into v_balance from public.profiles where id = v_user_id;
  end if;

  if p_task_id = 'daily-login' then
    v_grant_token := true;
  elsif p_task_id = 'counselling-session' then
    v_grant_token := true;
  end if;

  if v_grant_token then
    perform public.gamification_ensure_row(v_user_id);
    update public.user_gamification
    set spin_tokens = spin_tokens + 1, updated_at = now()
    where user_id = v_user_id;
  end if;

  return jsonb_build_object(
    'ok', true,
    'already_completed', false,
    'task_key', v_task_key,
    'points_awarded', v_points,
    'balance', v_balance,
    'spin_token_granted', v_grant_token
  );
end;
$$;

grant execute on function public.award_task_points(text, text, jsonb) to authenticated;
