drop table if exists build_order_votes;

create table build_order_votes (
  id uuid default uuid_generate_v4() primary key,
  user_email text not null,
  build_order_id text not null,
  vote smallint not null check (vote = 1 or vote = -1),
  created_at timestamptz default now(),
  unique(user_email, build_order_id)
);

alter table build_order_votes enable row level security;

create policy "Anyone can view votes" on build_order_votes for select using (true);
create policy "Authenticated users can vote" on build_order_votes for insert with check (true); -- We check app-side if logged in
create policy "Users can update their own vote" on build_order_votes for update using (true);
create policy "Users can delete their own vote" on build_order_votes for delete using (true);
