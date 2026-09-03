-- Skip tables that exist; only fix policies + trigger + seeds

create extension if not exists "uuid-ossp";

alter table public.profiles enable row level security;
alter table public.curricula enable row level security;
alter table public.user_sessions enable row level security;
alter table public.chapters enable row level security;

drop policy if exists "Users can insert own profile" on public.profiles;
create policy "Users can insert own profile" on public.profiles
  for insert with check (auth.uid() = id);

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, full_name)
  values (new.id, coalesce(new.raw_user_meta_data->>'full_name', 'Anonymous Learner'))
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();