# Supabase setup
Run `migrations/whole.sql` once in the Supabase SQL Editor. It includes schema, seed data, storage, RLS and realtime setup.
Create the first user under Authentication, then run:

```sql
insert into public.admin_users(user_id)
select id from auth.users where lower(email) = lower('your-real-login-email@example.com')
on conflict (user_id) do nothing;
```

The frontend requires `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`.

This project has no Node/Python backend to deploy to Render. Supabase is the backend:
database, Auth, Storage, RLS and Realtime all run in Supabase. Deploy only the
frontend to Vercel; do not put a service-role key in Vercel or the browser.

### Security smoke test (run with anon and authenticated SQL/API clients):
```sql
select * from public.products where is_active = false; -- anon: zero rows
insert into public.enquiries(name,email,message) values ('Test','test@example.com','Test enquiry'); -- anon: allowed
select * from public.enquiries; -- anon: denied
```

### Enquiry Email Notification (Edge Function via Resend):
1. Deploy the edge function:
   ```bash
   supabase functions deploy notify-enquiry
   ```
2. Set the function secrets in Supabase Dashboard (or CLI):
   ```bash
   supabase secrets set RESEND_API_KEY=re_your_api_key OWNER_EMAIL=your-company-email@gmail.com FROM_EMAIL=enquiries@yourdomain.com
   ```
3. Create a Database Webhook in Supabase Dashboard:
   - Navigate to **Database** > **Webhooks** > **Create a new webhook**
   - Name: `notify_enquiry_on_insert`
   - Table: `public.enquiries`
   - Events: `INSERT`
   - Type: `Supabase Edge Function`
   - Edge Function: `notify-enquiry`
   - Method: `POST`

### Hardening Migration:
To apply latest constraints, rate limits, timeline_items table, and export_markets column:
Run `migrations/0006_hardening.sql` in the Supabase SQL Editor.
