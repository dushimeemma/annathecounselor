-- Anna the Counselor CMS: database, authorization, seed content, and image storage.
-- Run this entire file once in Supabase Dashboard > SQL Editor.

create table if not exists public.admins (
  user_id uuid primary key references auth.users(id) on delete cascade,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.site_content (
  id text primary key check (id = 'main'),
  content jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users(id) on delete set null
);

create table if not exists public.posts (
  slug text primary key,
  title text not null,
  excerpt text not null default '',
  body text not null,
  category text not null default 'Reflection',
  cover_image_url text not null default '',
  published boolean not null default false,
  published_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users(id) on delete set null
);

create or replace function public.is_cms_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.admins
    where user_id = (select auth.uid())
      and active = true
  );
$$;

revoke all on function public.is_cms_admin() from public;
grant execute on function public.is_cms_admin() to anon, authenticated;

alter table public.admins enable row level security;
alter table public.site_content enable row level security;
alter table public.posts enable row level security;

drop policy if exists "Administrators can read their record" on public.admins;
create policy "Administrators can read their record"
on public.admins for select
to authenticated
using (user_id = (select auth.uid()));

drop policy if exists "Public can read site content" on public.site_content;
create policy "Public can read site content"
on public.site_content for select
to anon, authenticated
using (true);

drop policy if exists "Administrators can insert site content" on public.site_content;
create policy "Administrators can insert site content"
on public.site_content for insert
to authenticated
with check (public.is_cms_admin());

drop policy if exists "Administrators can update site content" on public.site_content;
create policy "Administrators can update site content"
on public.site_content for update
to authenticated
using (public.is_cms_admin())
with check (public.is_cms_admin());

drop policy if exists "Public can read published posts" on public.posts;
create policy "Public can read published posts"
on public.posts for select
to anon, authenticated
using (published = true or public.is_cms_admin());

drop policy if exists "Administrators can insert posts" on public.posts;
create policy "Administrators can insert posts"
on public.posts for insert
to authenticated
with check (public.is_cms_admin());

drop policy if exists "Administrators can update posts" on public.posts;
create policy "Administrators can update posts"
on public.posts for update
to authenticated
using (public.is_cms_admin())
with check (public.is_cms_admin());

drop policy if exists "Administrators can delete posts" on public.posts;
create policy "Administrators can delete posts"
on public.posts for delete
to authenticated
using (public.is_cms_admin());

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'site-images',
  'site-images',
  true,
  5242880,
  array['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/avif']
)
on conflict (id) do update
set public = excluded.public,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Public can view site images" on storage.objects;
create policy "Public can view site images"
on storage.objects for select
to anon, authenticated
using (bucket_id = 'site-images');

drop policy if exists "Administrators can upload site images" on storage.objects;
create policy "Administrators can upload site images"
on storage.objects for insert
to authenticated
with check (bucket_id = 'site-images' and public.is_cms_admin());

drop policy if exists "Administrators can update site images" on storage.objects;
create policy "Administrators can update site images"
on storage.objects for update
to authenticated
using (bucket_id = 'site-images' and public.is_cms_admin())
with check (bucket_id = 'site-images' and public.is_cms_admin());

drop policy if exists "Administrators can delete site images" on storage.objects;
create policy "Administrators can delete site images"
on storage.objects for delete
to authenticated
using (bucket_id = 'site-images' and public.is_cms_admin());

insert into public.site_content (id, content)
values (
  'main',
  '{
    "brandName": "Anna the Counselor",
    "eyebrow": "Counseling · Reflection · Growth",
    "headline": "A softer place to",
    "headlineAccent": "meet yourself.",
    "introduction": "Thoughtful support for the moments that feel heavy, uncertain, or ready for change. This is a space to pause, understand what is happening, and move forward with greater clarity.",
    "statementLead": "You do not have to have every answer before you begin.",
    "statementTitle": "We can make room for the next step together.",
    "aboutTitle": "Support that starts with listening.",
    "aboutBody": "Anna offers a warm, grounded space for honest conversation and meaningful reflection. Her work is centered on helping people understand their experiences, reconnect with their strengths, and take practical steps toward the life and relationships they want.",
    "approachTitle": "A thoughtful, human approach.",
    "approachBody": "Every person arrives with a different story. Sessions are shaped around your needs, your pace, and the kind of support that feels useful to you.",
    "heroImageUrl": "/anna-counseling-hero.png",
    "heroImageAlt": "A calm counseling room with two chairs in warm morning light",
    "instagramHandle": "@annathecounselor",
    "instagramUrl": "https://www.instagram.com/annathecounselor/",
    "ctaLabel": "Connect on Instagram",
    "ctaTitle": "Ready to begin a conversation?",
    "ctaBody": "Reach out through Anna’s official Instagram profile for current availability and more information.",
    "services": [
      {"id": "individual-support", "title": "Individual support", "description": "A private space to explore emotions, patterns, decisions, and the changes you want to make."},
      {"id": "relationship-support", "title": "Relationship support", "description": "Thoughtful conversations that help bring more understanding, clarity, and intention to relationships."},
      {"id": "life-transitions", "title": "Life transitions", "description": "Grounded support while navigating change, uncertainty, identity, loss, or a new season of life."}
    ]
  }'::jsonb
)
on conflict (id) do nothing;

insert into public.posts (
  slug, title, excerpt, body, category, cover_image_url, published, published_at
)
values
(
  'making-space-for-hard-emotions',
  'Making space for difficult emotions',
  'A gentle reminder that understanding a feeling can be more useful than rushing to silence it.',
  E'Some feelings arrive loudly. Others stay beneath the surface and shape the way we move through our day. Instead of immediately asking how to get rid of an emotion, it can help to ask what it may be trying to communicate.\n\nMaking space does not mean letting a feeling control every decision. It means noticing it without judgment, naming what is present, and giving yourself enough room to respond with intention.',
  'Emotional wellbeing',
  '',
  true,
  '2026-08-20T09:00:00.000Z'
),
(
  'when-rest-feels-uncomfortable',
  'When rest feels uncomfortable',
  'Rest can feel unfamiliar when your body has learned to measure safety through constant activity.',
  E'Rest is not always immediately peaceful. For someone accustomed to staying busy, slowing down can bring up guilt, worry, or a sense that something has been forgotten.\n\nBeginning with small pauses can make rest feel more accessible. A few quiet breaths, a short walk without a task, or one unhurried cup of tea can help the nervous system learn that stillness can also be safe.',
  'Gentle practices',
  '',
  true,
  '2026-08-12T09:00:00.000Z'
)
on conflict (slug) do nothing;

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'site_content'
  ) then
    alter publication supabase_realtime add table public.site_content;
  end if;
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'posts'
  ) then
    alter publication supabase_realtime add table public.posts;
  end if;
end
$$;

-- After creating the administrator in Authentication > Users, run this separately
-- with the real UID copied from the Supabase dashboard:
-- insert into public.admins (user_id, active) values ('YOUR-AUTH-USER-UID', true);
