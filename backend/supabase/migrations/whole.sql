-- UTSAV FOOD TECHNOLOGY - complete Supabase setup
-- Run this one file in the Supabase SQL Editor.

create extension if not exists "uuid-ossp";

create or replace function public.set_updated_at() returns trigger
language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create table if not exists public.categories (
  id uuid primary key default uuid_generate_v4(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  name text not null,
  slug text not null unique,
  description text,
  image_url text,
  display_order integer not null default 0,
  is_active boolean not null default true
);

create table if not exists public.products (
  id uuid primary key default uuid_generate_v4(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  category_id uuid references public.categories(id) on delete set null,
  name text not null,
  slug text not null unique,
  short_description text,
  description text,
  specifications jsonb not null default '{}'::jsonb,
  images text[] not null default '{}',
  is_featured boolean not null default false,
  is_active boolean not null default true,
  show_in_hero boolean not null default false,
  hero_order integer not null default 0,
  applications text[] not null default '{}',
  brochure_url text
);

alter table public.products add column if not exists show_in_hero boolean not null default false;
alter table public.products add column if not exists hero_order integer not null default 0;
alter table public.products add column if not exists applications text[] not null default '{}';
alter table public.products add column if not exists brochure_url text;

create table if not exists public.about_content (
  id uuid primary key default uuid_generate_v4(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  section_key text not null unique,
  title text not null,
  content text,
  image_url text,
  name text,
  designation text,
  photo text
);

create table if not exists public.why_choose_us (
  id uuid primary key default uuid_generate_v4(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  title text not null,
  description text,
  display_order integer not null default 0
);

create table if not exists public.fact_sheet (
  id uuid primary key default uuid_generate_v4(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  label text not null,
  value text not null,
  display_order integer not null default 0
);

create table if not exists public.site_stats (
  id uuid primary key default uuid_generate_v4(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  label text not null,
  value text not null,
  display_order integer not null default 0
);

create table if not exists public.site_settings (
  id uuid primary key default uuid_generate_v4(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  logo_url text,
  company_name text,
  tagline text,
  phone text,
  email text,
  address text,
  whatsapp text,
  social_links jsonb not null default '{}'::jsonb,
  map_embed_url text,
  catalog_url text,
  seo_title text,
  seo_description text,
  footer_text text
);

alter table public.site_settings add column if not exists company_name text;
alter table public.site_settings add column if not exists tagline text;

create table if not exists public.enquiries (
  id uuid primary key default uuid_generate_v4(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  product_id uuid references public.products(id) on delete set null,
  name text not null,
  email text not null,
  phone text,
  country text,
  message text not null,
  status text not null default 'new' check (status in ('new','read','replied'))
);

create table if not exists public.admin_users (
  user_id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

create table if not exists public.process_steps (
  id uuid primary key default uuid_generate_v4(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  title text not null unique,
  description text,
  display_order integer not null default 0
);

do $$
declare table_name text;
begin
  foreach table_name in array array[
    'categories','products','about_content','why_choose_us','fact_sheet',
    'site_stats','site_settings','enquiries','process_steps'
  ] loop
    execute format('drop trigger if exists set_%s_updated_at on public.%s', table_name, table_name);
    execute format(
      'create trigger set_%s_updated_at before update on public.%s for each row execute function public.set_updated_at()',
      table_name, table_name
    );
  end loop;
end $$;

alter table public.categories enable row level security;
alter table public.products enable row level security;
alter table public.about_content enable row level security;
alter table public.why_choose_us enable row level security;
alter table public.fact_sheet enable row level security;
alter table public.site_stats enable row level security;
alter table public.site_settings enable row level security;
alter table public.enquiries enable row level security;
alter table public.admin_users enable row level security;
alter table public.process_steps enable row level security;

create or replace function public.is_admin() returns boolean
language sql stable security definer set search_path = public
as $$ select exists(select 1 from public.admin_users where user_id = auth.uid()) $$;

drop policy if exists "public active categories" on public.categories;
create policy "public active categories" on public.categories for select using (is_active or public.is_admin());
drop policy if exists "public active products" on public.products;
create policy "public active products" on public.products for select using (is_active or public.is_admin());
drop policy if exists "public content read" on public.about_content;
create policy "public content read" on public.about_content for select using (true);
drop policy if exists "public why read" on public.why_choose_us;
create policy "public why read" on public.why_choose_us for select using (true);
drop policy if exists "public facts read" on public.fact_sheet;
create policy "public facts read" on public.fact_sheet for select using (true);
drop policy if exists "public stats read" on public.site_stats;
create policy "public stats read" on public.site_stats for select using (true);
drop policy if exists "public settings read" on public.site_settings;
create policy "public settings read" on public.site_settings for select using (true);
drop policy if exists "public enquiry create" on public.enquiries;
create policy "public enquiry create" on public.enquiries for insert with check (true);
drop policy if exists "public process read" on public.process_steps;
create policy "public process read" on public.process_steps for select using (true);

do $$
declare table_name text;
begin
  foreach table_name in array array[
    'categories','products','about_content','why_choose_us','fact_sheet',
    'site_stats','site_settings','enquiries','process_steps'
  ] loop
    execute format('drop policy if exists "admin %s" on public.%s', table_name, table_name);
    execute format(
      'create policy "admin %s" on public.%s for all using (public.is_admin()) with check (public.is_admin())',
      table_name, table_name
    );
  end loop;
end $$;

drop policy if exists "admin self read" on public.admin_users;
create policy "admin self read" on public.admin_users for select using (auth.uid() = user_id);
drop policy if exists "admin self insert" on public.admin_users;
create policy "admin self insert" on public.admin_users for insert with check (public.is_admin());

alter table public.enquiries drop constraint if exists enquiries_name_length;
alter table public.enquiries drop constraint if exists enquiries_email_length;
alter table public.enquiries drop constraint if exists enquiries_message_length;
alter table public.enquiries add constraint enquiries_name_length check (char_length(name) between 2 and 120);
alter table public.enquiries add constraint enquiries_email_length check (char_length(email) between 5 and 254);
alter table public.enquiries add constraint enquiries_message_length check (char_length(message) between 2 and 5000);

insert into public.categories (name, slug, description, display_order) values
('Papad Machines','papad-machines','Equipment for consistent papad production.',1),
('Papad Plants','papad-plants','Complete production lines for growing units.',2),
('Samosa Patti Machines','samosa-patti-machines','Machines for uniform samosa patti sheets.',3),
('Applam Machines','applam-machines','Reliable applam processing equipment.',4),
('Papad Dryers','papad-dryers','Controlled drying solutions for food units.',5),
('Accessories','accessories','Supporting equipment and components.',6)
on conflict (slug) do nothing;

insert into public.products
  (category_id,name,slug,short_description,description,specifications,is_featured)
values
((select id from public.categories where slug='papad-machines'),'Semi Automatic Papad Machine','semi-automatic-papad-machine','A practical machine for small and medium units.','A practical machine for small and medium papad production units.','{"Capacity":"On request","Power":"On request","Material":"Stainless steel"}',true),
((select id from public.categories where slug='papad-plants'),'Papad Plant','papad-plant','A complete papad production setup.','A complete papad production setup planned around your capacity.','{"Capacity":"On request","Power":"On request","Dimensions":"On request"}',true),
((select id from public.categories where slug='papad-machines'),'Automatic Papad Making Machine','automatic-papad-making-machine','Automated forming for consistent output.','Automated forming for consistent papad output.','{"Capacity":"On request","Motor":"On request","Weight":"On request"}',true),
((select id from public.categories where slug='samosa-patti-machines'),'Samosa Patti Making Machine','samosa-patti-making-machine','Uniform sheets for commercial kitchens.','Equipment for uniform samosa patti production.','{"Capacity":"On request","Power":"On request","Material":"Stainless steel"}',false),
((select id from public.categories where slug='applam-machines'),'Applam Making Machine','applam-making-machine','Equipment for reliable applam production.','Equipment for reliable applam production.','{"Capacity":"On request","Motor":"On request"}',false),
((select id from public.categories where slug='papad-dryers'),'Papad Dryer Machine','papad-dryer-machine','Controlled drying for finished papad.','Controlled drying equipment for finished papad.','{"Capacity":"On request","Power":"On request","Dimensions":"On request"}',false)
on conflict (slug) do nothing;

update public.products set category_id = (select id from public.categories where slug = 'papad-machines')
where slug in ('semi-automatic-papad-machine','automatic-papad-making-machine') and category_id is null;
update public.products set category_id = (select id from public.categories where slug = 'papad-plants')
where slug = 'papad-plant' and category_id is null;
update public.products set category_id = (select id from public.categories where slug = 'samosa-patti-machines')
where slug = 'samosa-patti-making-machine' and category_id is null;
update public.products set category_id = (select id from public.categories where slug = 'applam-machines')
where slug = 'applam-making-machine' and category_id is null;
update public.products set category_id = (select id from public.categories where slug = 'papad-dryer-machine')
where slug = 'papad-dryer-machine' and category_id is null;

insert into public.about_content (section_key,title,content) values
('overview','About Utsav Food Technology','UTSAV FOOD TECHNOLOGY manufactures, trades, exports and supplies papad and food processing machinery from Vadodara, Gujarat. Since 1989, the company has focused on durable equipment and dependable service.'),
('vision','Our vision','To anticipate global market changes and deliver machines that match customer expectations.'),
('mission','Our mission','To become a leading provider of food processing equipment from India for customers in India and abroad.'),
('leadership','Leadership','Mr. Utsav Patel has strengthened the business and built its reputation with support from food processing units at home and abroad.'),
('team','Our team','Engineers, quality supervisors, sales and marketing experts and skilled staff work together to serve every project.')
on conflict (section_key) do nothing;

insert into public.why_choose_us(title,description,display_order) values
('Quality materials','Machines made with top-grade materials to international standards.',1),
('Custom solutions','Equipment planned around each client’s production needs.',2),
('Competitive pricing','Practical pricing without compromising product quality.',3),
('Global fulfilment','Worldwide order fulfilment supported from India.',4)
on conflict do nothing;

insert into public.fact_sheet(label,value,display_order) values
('Nature of Business','Manufacturer, Exporter, Trader and Supplier',1),
('Company Location','Vadodara, Gujarat, India',2),
('Company Leader','Mr. Utsav Patel',3),
('Year of Establishment','1989',4),
('No. of Employees','8',5),
('No. of Production Units','1',6),
('Export Market','USA, Canada, UK, Sri Lanka, Africa, New Zealand, Australia',7),
('Monthly Production Capacity','3-4 machines',8),
('Sales Volume','INR 20 Lakh',9),
('Memberships','V.U. Nagar Association, FDI',10)
on conflict do nothing;

insert into public.site_stats(label,value,display_order) values
('Years of experience','35+',1),('Export markets','8',2),('Production units','1',3),('Monthly capacity','3-4 machines',4)
on conflict do nothing;

insert into public.site_settings
  (company_name,tagline,phone,email,address,whatsapp,seo_title,seo_description,footer_text)
select
  'UTSAV FOOD TECHNOLOGY','Papad and food processing machinery since 1989','+91 98250 12345',
  'info@utsavpapadmachine.com','Vadodara, Gujarat, India','+91 98250 12345',
  'Papad Machine Manufacturer | Utsav Food Technology',
  'Manufacturer and exporter of papad and food processing machinery from Vadodara, Gujarat since 1989.',
  'UTSAV FOOD TECHNOLOGY — Food processing equipment since 1989.'
where not exists (select 1 from public.site_settings);

update public.site_settings
set company_name = coalesce(company_name, 'UTSAV FOOD TECHNOLOGY'),
    tagline = coalesce(tagline, 'Papad and food processing machinery since 1989'),
    phone = coalesce(phone, '+91 98250 12345'),
    email = coalesce(email, 'info@utsavpapadmachine.com'),
    address = coalesce(address, 'Vadodara, Gujarat, India'),
    whatsapp = coalesce(whatsapp, '+91 98250 12345'),
    seo_title = coalesce(seo_title, 'Papad Machine Manufacturer | Utsav Food Technology'),
    seo_description = coalesce(seo_description, 'Manufacturer and exporter of papad and food processing machinery from Vadodara, Gujarat since 1989.')
where id = (select id from public.site_settings order by created_at limit 1);

insert into public.process_steps(title,description,display_order) values
('Requirement discussion','We understand the product, capacity and space available at your unit.',1),
('Machine selection and customisation','We recommend a suitable machine and agree the required configuration.',2),
('Fabrication','The machine is built and finished by our manufacturing team.',3),
('Testing and trial','The equipment is checked and trialled before dispatch.',4),
('Packing and dispatch','We prepare the machine for delivery and export documentation.',5)
on conflict (title) do nothing;

update public.products set show_in_hero = true, hero_order = 1 where slug = 'semi-automatic-papad-machine';
update public.products set show_in_hero = true, hero_order = 2 where slug = 'papad-plant';
update public.products set show_in_hero = true, hero_order = 3 where slug = 'automatic-papad-making-machine';
update public.products set show_in_hero = true, hero_order = 4 where slug = 'samosa-patti-making-machine';
update public.products set show_in_hero = true, hero_order = 5 where slug = 'papad-dryer-machine';

create or replace function public.limit_hero_products() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.show_in_hero and (select count(*) from public.products where show_in_hero and id <> new.id) >= 5 then
    raise exception 'A maximum of five products can be shown in the hero slider';
  end if;
  return new;
end;
$$;
drop trigger if exists products_limit_hero on public.products;
create trigger products_limit_hero before insert or update of show_in_hero on public.products
for each row execute function public.limit_hero_products();

do $$
declare table_name text;
begin
  foreach table_name in array array[
    'products','categories','about_content','why_choose_us','fact_sheet',
    'site_stats','site_settings','process_steps','enquiries'
  ] loop
    begin
      execute format('alter publication supabase_realtime add table public.%I', table_name);
    exception when duplicate_object then null;
    end;
    execute format('alter table public.%I replica identity full', table_name);
  end loop;
end $$;

insert into storage.buckets (id,name,public) values
('product-images','product-images',true),
('category-images','category-images',true),
('site-assets','site-assets',true),
('brochures','brochures',true)
on conflict (id) do nothing;

drop policy if exists "public storage read" on storage.objects;
create policy "public storage read" on storage.objects for select
using (bucket_id in ('product-images','category-images','site-assets'));
drop policy if exists "public brochure read" on storage.objects;
create policy "public brochure read" on storage.objects for select
using (bucket_id = 'brochures');
drop policy if exists "admin storage write" on storage.objects;
create policy "admin storage write" on storage.objects for all
using (public.is_admin()) with check (public.is_admin());
drop policy if exists "admin brochure write" on storage.objects;
create policy "admin brochure write" on storage.objects for all
using (public.is_admin()) with check (public.is_admin());

-- After creating the first Auth user, add it as an admin:
-- insert into public.admin_users(user_id)
-- select id from auth.users where email = 'YOUR_EMAIL';


-- 0006_hardening.sql
alter table public.enquiries drop constraint if exists enquiries_phone_length;
alter table public.enquiries add constraint enquiries_phone_length check (phone is null or char_length(phone) <= 40);

alter table public.enquiries drop constraint if exists enquiries_country_length;
alter table public.enquiries add constraint enquiries_country_length check (country is null or char_length(country) <= 80);

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

alter table public.site_settings add column if not exists export_markets text[] not null default '{"USA","Canada","UK","Sri Lanka","Africa","New Zealand","Australia"}';
update public.site_settings
set export_markets = array['USA','Canada','UK','Sri Lanka','Africa','New Zealand','Australia']
where export_markets is null or cardinality(export_markets) = 0;

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

insert into public.about_content (section_key, title, content)
values ('why_intro', 'A practical manufacturing partner', 'Since 1989, our team has worked with food processing units that need reliable equipment, clear specifications and responsive support.')
on conflict (section_key) do nothing;

drop policy if exists "admin self insert" on public.admin_users;
create policy "admin self insert" on public.admin_users for insert with check (public.is_admin());

drop policy if exists "admin self delete" on public.admin_users;
create policy "admin self delete" on public.admin_users for delete using (public.is_admin());
