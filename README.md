# AutoCare360 — Dark Workshop Operating System

A responsive, dark-themed React application for vehicle service operations, with four connected workspaces: **Customer, Technician, Service Manager and Supplier**.

## Launch modes

### Browser Workshop (default)
Opening the app launches the full interactive workshop **without login, OTP, or seeded fake records**. Use the role selector to access vehicles, bookings, technician jobs, estimates, invoices, inventory, quotations, purchase orders, notifications and service history. All four roles use the **same data saved in this browser** (`localStorage`), so changes appear when you switch roles.

This mode is deliberately **not multi-user shared data**. Its invoices, payment statuses, notifications and purchasing actions are simulations; the site does **not** process payment or send email/SMS, nor does it synchronize data with Salesforce or Supabase. Avoid placing real customer-sensitive information in an unsecured/shared browser.

### Secure Cloud (optional)
Choose **Cloud sign-in** or open `/?login=1`. This separate mode authenticates with **Supabase Auth** and stores records through Vercel API functions in a Supabase table protected by database row-level security. Roles are obtained from trusted user `app_metadata.autocare_role` (never user-editable metadata). Cloud data does **not** mix with browser records.

Self-signup and confirmation email resends are deliberately **paused by default** because Supabase built-in email delivery is not configured for general public registration. Project admins can provision a verified test account in **Supabase → Authentication → Users** using Auto Confirm only after checking account ownership. For genuine email signups, configure custom SMTP and the project's Site URL/Redirect URLs, then explicitly set `VITE_ALLOW_PUBLIC_SIGNUP=true` in Vercel Preview/Production. Do not disable email-verification globally to resolve mail delivery.

**Salesforce is not currently synchronized or verified.** Metadata and a prototype API are under development, but Salesforce tokens and object deployment have not been verified. The demo website should not be described as Salesforce live.

## Browser features

- **Customer:** vehicle registration, booking, appointment changes, ten-stage repair tracking, estimate approval, invoices, history and notifications.
- **Technician:** assigned jobs, four-point inspections, repair-stage transitions and spare-part requests.
- **Manager:** scheduling, workshop repairs, technician assignments, estimates, billing status, stock monitoring, purchasing and reports.
- **Supplier:** catalogue, quotations, purchase orders, dispatch/delivery stages, restocking.
- **Cross-workspace:** notifications, derived KPIs, repair history on completion, CSV exports, printable *preview* invoices, JSON backup/restore, responsive layouts.
- Records start empty and are created only by the user.

## Run locally

```sh
npm ci
npm run dev
```

Then open the Vite URL.

## Tests

```sh
node --experimental-strip-types --test tests/*.test.ts
npm run build
```

Workflow tests include customer booking, repair sequencing, supplier quoting and stock replenishment, estimate approval, payment-state simulation, CSV injection safety, and authentication error messages.

## Deployment

The canonical repository is `Aditya-Kumkar/AutoCare360-Ecosystem`; the Vercel deployment mirror is `ABCD4443/autocare360-ecosystem`. A GitHub Actions job in the mirror syncs canonical `main` periodically, then Vercel deploys the mirror's `main`.

For cloud setup and limitations, read [docs/CLOUD_WORKSPACE_SETUP.md](docs/CLOUD_WORKSPACE_SETUP.md).

## Security boundaries

Browser sandbox data is local only; a role selector in sandbox mode is **not real authorization**. Cloud mode independently requires a valid Supabase session and enforces server-side role checks and PostgreSQL RLS. Never paste Salesforce or Supabase secret keys into the browser, GitHub, screenshots or chat.
