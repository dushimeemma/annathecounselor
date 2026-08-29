# Anna the Counselor — Next.js Supabase CMS

A production-oriented counseling portfolio and content-management application for **Anna the Counselor**. The public website uses the Next.js App Router. Supabase provides administrator authentication, PostgreSQL content storage, realtime updates, and image storage. A hardened multi-stage Docker runtime is included.

## Included

- Responsive public counseling portfolio
- Supabase-backed homepage content and services
- Journal with draft and published states
- Protected `/admin` content studio
- Email/password administrator authentication
- Row Level Security for all database operations
- Public image delivery with administrator-only uploads
- Five-megabyte image/type restrictions
- Realtime public content refresh
- Docker and Docker Compose production runtime
- Health endpoint at `/api/health`
- Safe built-in content before the Supabase schema is initialized

## Architecture

| Layer | Technology | Responsibility |
|---|---|---|
| Public website | Next.js 16 + React 19 | Portfolio, services, journal, and article routes |
| Admin portal | Next.js client application | Content editing, publishing, and uploads |
| Authentication | Supabase Auth | Email/password administrator sign-in |
| Authorization | PostgreSQL Row Level Security | Public reads and administrator-only writes |
| Content | Supabase PostgreSQL | Main page content and journal posts |
| Media | Supabase Storage | Hero and article images |
| Runtime | Docker + Node.js 22 | Standalone production server |

## 1. Initialize Supabase

1. Open the Supabase project:
   `https://hgvnqvoqlavqlmemyyjh.supabase.co`
2. Open **SQL Editor**.
3. Select **New query**.
4. Copy the complete contents of `supabase/setup.sql`.
5. Run the query once.

This creates:

- `public.site_content`
- `public.posts`
- `public.admins`
- The public `site-images` Storage bucket
- Database and Storage Row Level Security policies
- Initial homepage content and starter journal posts
- Realtime publication configuration

## 2. Create the first administrator

1. Open **Authentication → Users → Add user** in the Supabase dashboard.
2. Create the administrator with an email address and strong password.
3. Copy the generated user UID.
4. Open **SQL Editor** and run:

   ```sql
   insert into public.admins (user_id, active)
   values ('PASTE-THE-AUTH-USER-UID-HERE', true);
   ```

Use the authentication UID, not the email address. The CMS deliberately cannot create or approve its own administrators.

## 3. Run locally

The visible `supabase.env` file already contains the supplied project URL and publishable key:

```bash
cp supabase.env .env.local
npm ci
npm run dev:next
```

Open:

- Public website: `http://localhost:3000`
- Admin CMS: `http://localhost:3000/admin`
- Health check: `http://localhost:3000/api/health`

The publishable key is designed for browser applications. Security is enforced by the included Row Level Security policies. Never place a Supabase secret key or `service_role` key in a `NEXT_PUBLIC_*` variable.

## 4. Run with Docker

```bash
docker compose --env-file supabase.env up --build -d
```

Inspect status:

```bash
docker compose ps
docker compose logs -f web
```

Stop the application:

```bash
docker compose down
```

## Data model

### `site_content`

The `main` row stores the homepage content as JSON. Everyone can read it; only active CMS administrators can insert or update it.

### `posts`

Stores:

- `slug`
- `title`
- `excerpt`
- `body`
- `category`
- `cover_image_url`
- `published`
- `published_at`
- `updated_at`
- `updated_by`

The public can read published posts. Administrators can read drafts and create, update, or delete posts.

### `admins`

Maps a Supabase Authentication user UID to an `active` authorization flag. Users may read their own administrator record, but client applications cannot approve or modify administrators.

### `site-images`

A public Supabase Storage bucket for hero and journal images. Only active administrators can upload, replace, or delete files. Uploads are limited to approved image MIME types and five megabytes.

## Production checklist

- Run `supabase/setup.sql`.
- Create and approve the first administrator.
- Add the production URL under **Authentication → URL Configuration** in Supabase.
- Replace starter biography and service wording with Anna's approved copy.
- Upload Anna's approved hero image from `/admin`.
- Use a strong administrator password.
- Export the database periodically because automatic backups are not included on the Supabase Free plan.
- Keep the Supabase secret and `service_role` keys out of client code.

## Content note

No unverified biography, credentials, or personal portrait was copied from Instagram. The starter counseling copy is intentionally general and can be replaced through the admin portal after Anna approves it.
