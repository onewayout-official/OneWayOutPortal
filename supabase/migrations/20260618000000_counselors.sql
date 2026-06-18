-- Life coaches / counsellors shown on the Help Me page
create table if not exists public.counselors (
  id text primary key,
  name text not null,
  title text not null default 'Life Coach/Counsellor',
  specialty text not null default '',
  bio text not null default '',
  about text not null default '',
  experience_years integer not null default 0,
  languages text[] not null default '{}',
  location text not null default '',
  availability text[] not null default '{}',
  rating numeric not null default 0,
  sessions_completed integer not null default 0,
  image text not null default '',
  is_active boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.counselors enable row level security;

-- Authenticated users can read active coaches only
create policy "counselors_select_active"
  on public.counselors
  for select
  to authenticated
  using (is_active = true);

-- Seed existing mock counselors as active
insert into public.counselors (
  id, name, title, specialty, bio, about, experience_years, languages, location,
  availability, rating, sessions_completed, image, is_active
) values
  (
    'sarah-mitchell', 'Sarah Mitchell', 'Financial Counselor',
    'Debt Management & Budgeting',
    'Practical debt payoff plans and realistic monthly budgeting support.',
    'Sarah helps clients reduce financial stress by creating simple debt and budget systems they can actually keep up with.',
    8, array['English'], 'Windhoek',
    array['Mon 09:00', 'Wed 14:00', 'Fri 10:30'],
    4.8, 420, 'https://i.pravatar.cc/200?img=5', true
  ),
  (
    'james-okonkwo', 'James Okonkwo', 'Investment Advisor',
    'Wealth Building & Investments',
    'Long-term investment planning for beginners and growing professionals.',
    'James focuses on helping clients build confidence in investing with clear, low-complexity strategies and disciplined planning.',
    11, array['English', 'French'], 'Lagos (Remote)',
    array['Tue 11:00', 'Thu 16:00', 'Sat 09:00'],
    4.7, 610, 'https://i.pravatar.cc/200?img=11', true
  ),
  (
    'priya-sharma', 'Priya Sharma', 'Savings Strategist',
    'Emergency Funds & Savings',
    'Step-by-step support to build emergency savings and financial buffers.',
    'Priya works with families and young professionals to set practical savings targets and stay consistent over time.',
    7, array['English', 'Hindi'], 'Cape Town (Remote)',
    array['Mon 13:00', 'Thu 09:30', 'Fri 15:00'],
    4.9, 355, 'https://i.pravatar.cc/200?img=44', true
  ),
  (
    'michael-torres', 'Michael Torres', 'Retirement Planner',
    'Retirement & Legacy Planning',
    'Retirement strategies tailored to your current income and goals.',
    'Michael helps clients map long-term retirement goals and create contribution plans that fit current life stages.',
    12, array['English', 'Spanish'], 'Johannesburg',
    array['Tue 10:00', 'Wed 17:00', 'Fri 12:00'],
    4.8, 530, 'https://i.pravatar.cc/200?img=15', true
  ),
  (
    'amara-diallo', 'Amara Diallo', 'Budget Coach',
    'Income Optimization',
    'Monthly planning methods to improve cash flow and reduce overspending.',
    'Amara specializes in helping clients optimize income usage and identify spending leaks across household budgets.',
    6, array['English', 'French'], 'Accra (Remote)',
    array['Mon 16:00', 'Thu 11:30', 'Sat 10:00'],
    4.6, 290, 'https://i.pravatar.cc/200?img=21', true
  ),
  (
    'david-chen', 'David Chen', 'Tax Consultant',
    'Tax Planning & Efficiency',
    'Tax-aware planning to keep more of your income legally and responsibly.',
    'David supports clients with practical tax planning habits and annual preparation guidance for better outcomes.',
    10, array['English', 'Mandarin'], 'Nairobi (Remote)',
    array['Tue 14:00', 'Thu 10:00', 'Fri 16:30'],
    4.7, 470, 'https://i.pravatar.cc/200?img=25', true
  )
on conflict (id) do nothing;
