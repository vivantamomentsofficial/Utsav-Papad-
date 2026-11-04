# Utsav Food Technology

## Local setup
1. Run `npm install --prefix frontend` from the repository root.
2. Copy `.env.example` to `frontend/.env.local` and set the Supabase URL and publishable key.
3. Run `backend/supabase/migrations/whole.sql` once in Supabase SQL Editor.
4. Create an Auth user, then add its UUID to `public.admin_users` (see the Supabase README).
5. Use `npm run dev`, `npm run build`, or `npm run preview`.

## GitHub
```powershell
git init
git add .
git commit -m "Initial Utsav Papad website"
git branch -M main
git remote add origin https://github.com/vivantamomentsofficial/Utsav-Papad-.git
git push -u origin main
```
If `origin` already exists, use `git remote set-url origin ...` instead.

## Vercel deployment
1. Import the GitHub repository into Vercel.
2. Keep the repository root as the project root; `vercel.json` already builds `frontend` and rewrites React Router routes.
3. Add `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` in Vercel for Production, Preview and Development.
4. Redeploy after adding variables. Only the publishable key belongs in frontend environment variables.

## Backend and security
Supabase is the backend; Render is not required because there is no separate API server.
Keep the Supabase service-role/secret key only in Supabase server-side tools and rotate any key previously exposed.
`frontend/public/robots.txt` blocks `/admin`; RLS, Auth, Storage policies and Realtime are configured by `whole.sql`.
