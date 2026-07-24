-- Gamification: reward ledger, task completions, spin state, secure RPCs

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------

create table if not exists public.reward_transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  kind text not null check (kind in ('task', 'spin', 'signup', 'redeem', 'admin')),
  source text not null default '',
  points_delta numeric not null,
  metadata jsonb not null default '{}',
  created_at timestamptz not null default now()
);

create index if not exists reward_transactions_user_id_idx
  on public.reward_transactions (user_id, created_at desc);

create table if not exists public.task_completions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  task_id text not null,
  points_awarded numeric not null default 0,
  completed_at timestamptz not null default now(),
  unique (user_id, task_id)
);

create index if not exists task_completions_user_id_idx
  on public.task_completions (user_id);

create table if not exists public.user_gamification (
  user_id uuid primary key references auth.users(id) on delete cascade,
  last_free_spin_date date,
  spin_tokens int not null default 0 check (spin_tokens >= 0),
  updated_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------

alter table public.reward_transactions enable row level security;
alter table public.task_completions enable row level security;
alter table public.user_gamification enable row level security;

create policy "Users can read own reward_transactions"
  on public.reward_transactions for select
  using (auth.uid() = user_id);

create policy "Users can read own task_completions"
  on public.task_completions for select
  using (auth.uid() = user_id);

create policy "Users can read own user_gamification"
  on public.user_gamification for select
  using (auth.uid() = user_id);

-- Inserts/updates only via security definer RPCs

-- ---------------------------------------------------------------------------
-- Protect profiles.user_points from direct client updates
-- ---------------------------------------------------------------------------

create or replace function public.protect_user_points_update()
returns trigger
language plpgsql
as $$
begin
  if new.user_points is distinct from old.user_points then
    if coalesce(auth.jwt() ->> 'role', '') = 'service_role' then
      return new;
    end if;
    if coalesce(current_setting('app.allow_points_update', true), '') <> 'on' then
      raise exception 'user_points can only be updated via reward functions';
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists protect_user_points on public.profiles;
create trigger protect_user_points
  before update on public.profiles
  for each row
  execute function public.protect_user_points_update();

-- ---------------------------------------------------------------------------
-- Helpers
-- ---------------------------------------------------------------------------

create or replace function public.gamification_ensure_row(p_user_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.user_gamification (user_id)
  values (p_user_id)
  on conflict (user_id) do nothing;
end;
$$;

create or replace function public.gamification_apply_points(
  p_user_id uuid,
  p_delta numeric,
  p_kind text,
  p_source text,
  p_metadata jsonb default '{}'
)
returns numeric
language plpgsql
security definer
set search_path = public
as $$
declare
  v_balance numeric;
begin
  perform set_config('app.allow_points_update', 'on', true);

  update public.profiles
  set user_points = greatest(0, coalesce(user_points, 0) + p_delta)
  where id = p_user_id
  returning user_points into v_balance;

  insert into public.reward_transactions (user_id, kind, source, points_delta, metadata)
  values (p_user_id, p_kind, p_source, p_delta, coalesce(p_metadata, '{}'));

  perform set_config('app.allow_points_update', 'off', true);
  return coalesce(v_balance, 0);
end;
$$;

create or replace function public.gamification_task_points(p_task_id text)
returns numeric
language sql
immutable
as $$
  select case p_task_id
    when 'update-budget' then 50
    when 'record-debt-payment' then 100
    when 'complete-course' then 50
    when 'daily-mood' then 25
    when 'onboarding-complete' then 100
    when 'signup' then 100
    else 0
  end;
$$;

create or replace function public.gamification_resolve_task_key(
  p_task_id text,
  p_local_date text
)
returns text
language plpgsql
stable
as $$
begin
  if p_task_id = 'daily-mood' then
    return 'daily-mood-' || coalesce(nullif(p_local_date, ''), to_char(current_date, 'YYYY-MM-DD'));
  end if;
  if p_task_id = 'update-budget' then
    return 'update-budget-' || to_char(
      coalesce(nullif(p_local_date, '')::date, current_date),
      'IYYY-"W"IW'
    );
  end if;
  return p_task_id;
end;
$$;

create or replace function public.gamification_spin_prize()
returns int
language plpgsql
as $$
declare
  r float := random();
begin
  if r < 0.40 then return 10;
  elsif r < 0.65 then return 25;
  elsif r < 0.85 then return 50;
  elsif r < 0.95 then return 100;
  elsif r < 0.99 then return 250;
  else return 500;
  end if;
end;
$$;

-- ---------------------------------------------------------------------------
-- RPC: award_task_points
-- ---------------------------------------------------------------------------

create or replace function public.award_task_points(
  p_task_id text,
  p_local_date text default null
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
begin
  if v_user_id is null then
    raise exception 'not_authenticated';
  end if;

  v_task_key := public.gamification_resolve_task_key(p_task_id, p_local_date);
  v_points := public.gamification_task_points(p_task_id);

  if v_points <= 0 and p_task_id not in ('daily-mood', 'update-budget', 'record-debt-payment', 'complete-course', 'onboarding-complete', 'signup') then
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

  -- onboarding-complete: skip duplicate bonus if user already has welcome points
  if p_task_id = 'onboarding-complete' then
    select coalesce(user_points, 0) into v_balance from public.profiles where id = v_user_id;
    if v_balance >= 100 then
      v_points := 0;
    end if;
  end if;

  insert into public.task_completions (user_id, task_id, points_awarded)
  values (v_user_id, v_task_key, v_points);

  if v_points > 0 then
    v_balance := public.gamification_apply_points(
      v_user_id, v_points, 'task', p_task_id,
      jsonb_build_object('task_key', v_task_key)
    );
  else
    select coalesce(user_points, 0) into v_balance from public.profiles where id = v_user_id;
  end if;

  -- Spin token grants
  if p_task_id = 'record-debt-payment' then
    v_grant_token := true;
  elsif p_task_id = 'daily-mood' and extract(dow from coalesce(nullif(p_local_date, '')::date, current_date)) = 1 then
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

-- ---------------------------------------------------------------------------
-- RPC: redeem_points
-- ---------------------------------------------------------------------------

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

-- ---------------------------------------------------------------------------
-- RPC: spin_wheel  (mode: free | token | paid)
-- ---------------------------------------------------------------------------

create or replace function public.spin_wheel(
  p_mode text,
  p_local_date text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_today date := coalesce(nullif(p_local_date, '')::date, current_date);
  v_prize int;
  v_balance numeric;
  v_cost constant int := 50;
  v_g public.user_gamification%rowtype;
begin
  if v_user_id is null then
    raise exception 'not_authenticated';
  end if;

  perform public.gamification_ensure_row(v_user_id);
  select * into v_g from public.user_gamification where user_id = v_user_id;

  if p_mode = 'free' then
    if v_g.last_free_spin_date is not null and v_g.last_free_spin_date >= v_today then
      select coalesce(user_points, 0) into v_balance from public.profiles where id = v_user_id;
      return jsonb_build_object('ok', false, 'error', 'free_spin_used', 'balance', v_balance);
    end if;
    update public.user_gamification
    set last_free_spin_date = v_today, updated_at = now()
    where user_id = v_user_id;
  elsif p_mode = 'token' then
    if coalesce(v_g.spin_tokens, 0) < 1 then
      return jsonb_build_object('ok', false, 'error', 'no_spin_tokens');
    end if;
    update public.user_gamification
    set spin_tokens = spin_tokens - 1, updated_at = now()
    where user_id = v_user_id;
  elsif p_mode = 'paid' then
    select coalesce(user_points, 0) into v_balance from public.profiles where id = v_user_id;
    if v_balance < v_cost then
      return jsonb_build_object('ok', false, 'error', 'insufficient_points', 'balance', v_balance);
    end if;
    perform public.gamification_apply_points(
      v_user_id, -v_cost, 'spin', 'paid_spin_cost',
      jsonb_build_object('cost', v_cost)
    );
  else
    return jsonb_build_object('ok', false, 'error', 'invalid_mode');
  end if;

  v_prize := public.gamification_spin_prize();
  v_balance := public.gamification_apply_points(
    v_user_id, v_prize, 'spin', 'wheel',
    jsonb_build_object('mode', p_mode, 'prize', v_prize)
  );

  return jsonb_build_object(
    'ok', true,
    'prize', v_prize,
    'balance', v_balance,
    'mode', p_mode
  );
end;
$$;

-- ---------------------------------------------------------------------------
-- RPC: get_gamification_state
-- ---------------------------------------------------------------------------

create or replace function public.get_gamification_state(p_local_date text default null)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_today date := coalesce(nullif(p_local_date, '')::date, current_date);
  v_balance numeric;
  v_g public.user_gamification%rowtype;
  v_completed text[];
  v_free_available boolean;
begin
  if v_user_id is null then
    raise exception 'not_authenticated';
  end if;

  perform public.gamification_ensure_row(v_user_id);

  select coalesce(user_points, 0) into v_balance from public.profiles where id = v_user_id;
  select * into v_g from public.user_gamification where user_id = v_user_id;

  v_free_available := v_g.last_free_spin_date is null or v_g.last_free_spin_date < v_today;

  select coalesce(array_agg(task_id), '{}')
  into v_completed
  from public.task_completions
  where user_id = v_user_id;

  return jsonb_build_object(
    'balance', v_balance,
    'spin_tokens', coalesce(v_g.spin_tokens, 0),
    'free_spin_available', v_free_available,
    'last_free_spin_date', v_g.last_free_spin_date,
    'completed_task_keys', to_jsonb(v_completed),
    'spin_cost', 50
  );
end;
$$;

grant execute on function public.award_task_points(text, text) to authenticated;
grant execute on function public.redeem_points(numeric, jsonb) to authenticated;
grant execute on function public.spin_wheel(text, text) to authenticated;
grant execute on function public.get_gamification_state(text) to authenticated;
