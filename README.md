# Utsav Food Technology

## Local setup
1. Run `npm install --prefix frontend` from the repository root.
2. Copy `.env.example` to `frontend/.env.local` and set the Supabase URL, publishable key, and site URL.
3. Run `backend/supabase/migrations/whole.sql` (and `0006_hardening.sql`) in the Supabase SQL Editor.
4. Create an Auth user, then add its UUID to `public.admin_users` (see the Supabase README).
5. Use `npm run dev`, `npm run build`, or `npm run preview`.

## Vercel deployment
1. Import the GitHub repository into Vercel.
2. Keep the repository root as the project root (`./`); `vercel.json` automatically builds `frontend`.
3. Add Environment Variables in Vercel for Production, Preview and Development:
   - `VITE_SUPABASE_URL`: Supabase project URL (`https://xyz.supabase.co`)
   - `VITE_SUPABASE_ANON_KEY`: Supabase anon public key
   - `VITE_SITE_URL`: Your live domain (e.g., `https://utsavpapad.vercel.app`)
   - `SUPABASE_URL`: (for serverless crawler previews)
   - `SUPABASE_ANON_KEY`: (for serverless crawler previews)
4. Redeploy after adding variables.

## Security Checklist
- **Disable Public Signups:** In Supabase Dashboard > Authentication > Providers > Email, turn OFF "Enable Signups" so strangers cannot register admin accounts.
- **Set Site URL & Redirect URLs:** In Supabase Dashboard > Authentication > URL Configuration, set Site URL to `https://utsavpapad.vercel.app` (or your custom domain) and add Redirect URLs for `/admin/reset-password`.
- **Never expose the service-role key:** Only use the publishable anon key in Vercel and the frontend.
- **Rotate exposed keys:** Rotate any API keys or secret keys that were ever shared publicly.
- **Robots & RLS:** `robots.txt` blocks `/admin` from crawlers; Row Level Security (RLS) is active across all tables.
