# AutoCare360: Developer Edition + Supabase + Vercel setup

## What this branch includes
Opt-in secured **live records console** with Supabase Auth, Vercel API role checks, Salesforce custom object metadata and CRUD. Original customer/staff demo workspaces remain **local browser previews**, not synced to Salesforce. No real Flow, Knowledge, CRM native object config, SMS, email or payments deployed.

## 1. Review and merge
Review this PR and its GitHub Actions build. Merge when reviewed. Never put secrets into GitHub or chat.

## 2. Create Supabase project
1. Create a Supabase project at https://supabase.com/dashboard.
2. Authentication > Providers > Email: enable email/password; require email verification.
3. Authentication > URL Configuration: set your Vercel site URL and permitted redirect URLs.
4. Obtain the project URL and publishable (or anon) key. Do NOT use the service-role key.
5. Customer signups receive customer permissions by default. Staff roles must be assigned ONLY by an administrator in Supabase Auth app_metadata.autocare_role, not user_metadata. Values: customer, technician, manager, supplier. After role changes, sign in again.

## 3. Deploy Salesforce metadata to Developer Edition
1. Install Salesforce CLI locally: https://developer.salesforce.com/tools/salesforcecli
2. Clone the branch or merged repository onto your machine.
3. In your terminal run:

    sf org login web --alias autocare-dev --instance-url https://login.salesforce.com

4. Complete OAuth login yourself. From the repository directory run:

    sf project deploy start --target-org autocare-dev --source-dir force-app/main/default/objects/AutoCare_Record__c

5. In Salesforce Setup > Object Manager, confirm AutoCare Record exists with Record_Key__c, Record_Type__c, Owner_Auth_Id__c and Payload__c.
6. Set the custom object's sharing model to Private, and give the dedicated integration user only required object and field permissions.

## 4. Salesforce External Client App
1. Setup > External Client Apps Manager: create/configure an External Client App with OAuth Client Credentials Flow and API scope.
2. Configure a dedicated least-privilege run-as integration user (not your personal admin account for ongoing access).
3. Confirm object CRUD and field access, including DELETE for demo delete operations.
4. Put the actual consumer key/secret directly into Vercel project environment variables, NOT GitHub/chat.
5. If a dedicated integration user is unavailable in your edition, use a separate test-only configuration after checking license/role limitations; do not claim production isolation.

## 5. Vercel environment variables
Go to Vercel > Project > Settings > Environment Variables. Configure a Preview deployment before production.

| Variable | Placement | Description |
|---|---|---|
| VITE_SUPABASE_URL | Public browser | Supabase HTTPS project URL |
| VITE_SUPABASE_PUBLISHABLE_KEY | Public browser | Supabase publishable/anon key |
| SUPABASE_URL | Server | Same Supabase project URL |
| SUPABASE_PUBLISHABLE_KEY | Server | Same publishable/anon key |
| SF_DOMAIN | Server | Exact Salesforce My Domain URL |
| SF_CLIENT_ID | Server | Salesforce External Client App consumer key |
| SF_CLIENT_SECRET | **Server secret** | Salesforce External Client App consumer secret |
| SF_RECORD_OBJECT | Server optional | AutoCare_Record__c |

IMPORTANT: Never put Salesforce secrets, Supabase service-role keys or payment secrets into VITE_ variables. Vite embeds VITE_ variables in public browser code. Redeploy Vercel after updating environments.

## 6. Smoke test
1. Open the deployed site, use Secure Salesforce sign in from the four-role selector.
2. Register a customer test user, confirm email if needed, and sign in.
3. In the live records console, create a vehicle and confirm the returned record appears in Salesforce. Copy the UUID.
4. Create an appointment with its vehicleId set to that UUID (initial status is forced to Pending confirmation).
5. Sign in as a different customer and confirm the first customer's records are invisible and uneditable.
6. Via a trusted Supabase admin operation, set app_metadata.autocare_role=manager for a staff test user; sign in and check expanded manager permissions.
7. Check that unauthenticated calls to /api/me, /api/records and /api/salesforce/schema are rejected.
8. Note that the Vite local dev server alone does not host Vercel API functions; use a Vercel deployment to test backend.

## Security and scope constraints
- API verifies the bearer session directly with Supabase Auth's /auth/v1/user endpoint.
- Server-side role checks use only trusted app_metadata, with customer as the default.
- Customer records must have Owner_Auth_Id__c set to the Supabase user UUID; manager-created customer data requires an owner UUID.
- Technician access requires a live job assigned to their Supabase user UUID (not demo technician name).
- Generic JSON editor is for lab verification, not a polished public customer interface.
- Demo pages still use localStorage. Live console does not automatically sync its Salesforce records into the demo pages.
- Auth token exists in memory, not localStorage. You must sign in again after refresh.
- A maximum 200 records per resource are returned; no multi-tenant production hardening or pagination yet.
- Salesforce integration object stores typed JSON (not the normalized CRM object model). Real CRM objects, Salesforce Flows and approvals, native reports, Knowledge, verified email/SMS, and payment capture require subsequent deployments.
- Never store actual customers' sensitive data in this first-pass lab demonstration.

## Next phase
Build real Vehicle, Appointment, Repair, Estimate, Invoice, Inventory and Service History Salesforce objects and relationships, Flow approvals, Knowledge, reports, messaging providers and Razorpay test checkout with verified webhook handling. No provider keys are needed in this branch.

References: https://developer.salesforce.com/docs/platform/salesforce-cli-reference/guide/cli_reference_org_login_web.html ; https://supabase.com/docs/guides/auth