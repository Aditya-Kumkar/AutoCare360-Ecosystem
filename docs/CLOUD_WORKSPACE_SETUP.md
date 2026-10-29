# AutoCare360 secure cloud workspace — setup and verification

## What is already built

`src/LiveWorkspace.tsx` provides a separate secure sign-in UI for real cloud records. `api/me.ts` and `api/records.ts` validate Supabase access tokens on the server and apply role restrictions. The PostgreSQL table `public.autocare_records` in the connected Supabase project has RLS enabled. The browser's dark studio uses a different, isolated local-only store.

**Do not treat a Vercel READY build as proof that a user has successfully signed in or that Salesforce is connected.** Verify those independently.

## Vercel environment variables

In Project Settings → Environment Variables configure:

- `VITE_SUPABASE_URL`: public project URL, `https://<project-ref>.supabase.co`
- `VITE_SUPABASE_PUBLISHABLE_KEY`: public `sb_publishable_...` key, safe for browser use
- `SUPABASE_URL`: same project URL, for serverless API
- `SUPABASE_PUBLISHABLE_KEY`: same publishable key, for serverless API
- `VITE_ALLOW_PUBLIC_SIGNUP`: **absent/false** until SMTP is working

Set Preview and Production appropriately, rebuild after changes. Never use `service_role` or admin secret in `VITE_` variables.

## Email verification: source of the earlier failures

Supabase's built-in email service is restricted and rate-limited and is not a production email provider. Earlier confirmation links were redirected to `http://localhost:3000` because Supabase Authentication → URL Configuration still had a development Site URL. Repeated signup attempts also triggered `over_email_send_rate_limit`.

To enable public registration:
1. In Supabase **Authentication → URL Configuration**, set **Site URL** to the actual production URL. Add valid preview redirect URLs separately when necessary.
2. In **Authentication → Emails/SMTP Settings**, configure and verify a custom SMTP provider (e.g., Resend, SendGrid, AWS SES), including the sender domain and credentials. Do not store SMTP credentials in GitHub.
3. Verify a signup/confirmation on a controlled test account. Check that the link redirects to the deployed app and returns a session.
4. Only after successful verification set `VITE_ALLOW_PUBLIC_SIGNUP=true`, then redeploy.

For a controlled college demonstration, an administrator can **create one approved test account** under Supabase Authentication → Users, choosing a password and **Auto Confirm User** only after verifying ownership through an independent method. Do not mark random third-party emails verified.

Supabase docs: https://supabase.com/docs/guides/auth/auth-smtp and https://supabase.com/docs/guides/auth/redirect-urls .

## Cloud role mapping

Users without a trusted `app_metadata.autocare_role` claim are `customer`. To assign `technician`, `manager` or `supplier`, an admin must update the user's **App Metadata** using an authorized Supabase admin workflow. Never trust editable User Metadata or a role selector on the client.

Test with distinct users for each role. Customer records must be owner-scoped and technicians must be assigned relevant work. Validate each API action and cross-user access denial with RLS enabled.

## Salesforce

A Developer Edition org and an External Client App exist separately. However, **Salesforce data synchronization and verified Salesforce CRUD are not deployed** in this application. The old Consumer Secret appeared in a screenshot; rotate it before any real Salesforce connection. The generic Salesforce object metadata and proof-of-concept are in a separate draft PR. Cloud records currently persist in Supabase, not Salesforce.

Real SMS, notifications by email, payments, tax invoicing and Salesforce Flow automations all require separately configured providers and testing; browser-mode events do not make network calls.
