-- UTSAV FOOD TECHNOLOGY - 0006_hardening.sql
-- Idempotent hardening migration

-- Enquiries column length constraints
alter table public.enquiries drop constraint if exists enquiries_phone_length;
alter table public.enquiries add constraint enquiries_phone_length check (phone is null or char_length(phone) <= 40);

alter table public.enquiries drop constraint if exists enquiries_country_length;
alter table public.enquiries add constraint enquiries_country_length check (country is null or char_length(country) <= 80);

-- Rate limit trigger on enquiries INSERT
create or replace function public.rate_limit_enquiries() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  recent_email_count integer;
  recent_total_count integer;
begin
  select count(*) into recent_email_count
  from public.enquiries
  where email = new.email and created_at > (now() - interval '1 hour');

  if recent_email_count >= 5 then
    raise exception 'Too many enquiries submitted from this email address. Please try again later.';
  end if;

  select count(*) into recent_total_count
  from public.enquiries
  where created_at > (now() - interval '10 minutes');

  if recent_total_count >= 20 then
    raise exception 'System is busy handling enquiries. Please try again in a few minutes.';
  end if;

  return new;
end;
$$;

drop trigger if exists trg_rate_limit_enquiries on public.enquiries;
create trigger trg_rate_limit_enquiries
  before insert on public.enquiries
  for each row execute function public.rate_limit_enquiries();

-- site_settings: export_markets
alter table public.site_settings add column if not exists export_markets text[] not null default '{"USA","Canada","UK","Sri Lanka","Africa","New Zealand","Australia"}';
update public.site_settings
set export_markets = array['USA','Canada','UK','Sri Lanka','Africa','New Zealand','Australia']
where export_markets is null or cardinality(export_markets) = 0;

-- timeline_items table
create table if not exists public.timeline_items (
  id uuid primary key default uuid_generate_v4(),
  year text not null,
  title text not null,
  description text,
  display_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists set_timeline_items_updated_at on public.timeline_items;
create trigger set_timeline_items_updated_at
  before update on public.timeline_items
  for each row execute function public.set_updated_at();

alter table public.timeline_items enable row level security;

drop policy if exists "public timeline read" on public.timeline_items;
create policy "public timeline read" on public.timeline_items for select using (true);

drop policy if exists "admin timeline all" on public.timeline_items;
create policy "admin timeline all" on public.timeline_items for all
  using (public.is_admin()) with check (public.is_admin());

do $$
begin
  begin
    execute 'alter publication supabase_realtime add table public.timeline_items';
  exception when duplicate_object then null;
  end;
  execute 'alter table public.timeline_items replica identity full';
end $$;

insert into public.timeline_items (year, title, description, display_order)
select '1989', 'Company established', 'Company established in Vadodara, Gujarat.', 1
where not exists (select 1 from public.timeline_items);

-- about_content: why_intro
insert into public.about_content (section_key, title, content)
values ('why_intro', 'A practical manufacturing partner', 'Since 1989, our team has worked with food processing units that need reliable equipment, clear specifications and responsive support.')
on conflict (section_key) do nothing;

-- Ensure admin_users can only be modified by existing admins
drop policy if exists "admin self insert" on public.admin_users;
create policy "admin self insert" on public.admin_users for insert with check (public.is_admin());

drop policy if exists "admin self delete" on public.admin_users;
create policy "admin self delete" on public.admin_users for delete using (public.is_admin());
