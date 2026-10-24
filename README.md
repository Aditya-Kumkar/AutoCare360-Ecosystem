# Auto Care 360 Ecosystem — UI Prototype

A responsive React + TypeScript concept prototype for four role-specific experiences:

- Manager Console
- Technician Workspace
- Customer App
- Supplier Marketplace

## Run locally

1. Install Node.js (LTS) if needed.
2. Extract this ZIP.
3. Open a terminal in the `autocare360-ecosystem` folder.
4. Run:

   ```bash
   npm install
   npm run dev
   ```

5. Open the local URL printed by Vite (typically `http://localhost:5173`).

## Current state

This is a frontend demonstration using illustrative, in-memory data. It includes role switching, dashboard views, a service Kanban board, appointment calendar, vehicle cards, technician workload, inventory, supplier offers, modal forms and local demo status updates.

It is **not connected to Salesforce yet**. Changes are local to the current browser session; authentication, API integration, persistence, record-level authorization, live notifications and production workflows are not implemented. The supplier and customer screens contain illustrative data. Supplier offer review does not place a real purchase order.

## Next integration phase

After Salesforce CLI/OAuth access and object API names are verified, connect through a secure backend/API layer, map existing Salesforce objects, and enforce role and record-level permissions server-side. Never place Salesforce client secrets in frontend code.


## Salesforce integration setup

A secure Vercel serverless endpoint is provided at `/api/salesforce/schema`. It obtains a Salesforce access token on the server and discovers accessible custom objects and selected standard objects. To inspect fields for an object after discovering its exact API name, call `/api/salesforce/schema?object=ExactApiName__c`.

Configure these **server-side** Vercel Project Environment Variables for Production (and Preview only if intentionally connecting a non-production Salesforce org):

- `SF_DOMAIN`: your Salesforce My Domain base URL, e.g. `https://your-domain.my.salesforce.com` (not a guessed URL and not `login.salesforce.com` for Client Credentials Flow).
- `SF_CLIENT_ID`: External Client App consumer key.
- `SF_CLIENT_SECRET`: External Client App consumer secret.

Never put the secret in `VITE_*` variables, frontend code, a committed `.env` file, screenshots, or chat. `.env.example` contains placeholders only.

### Salesforce setup checklist

1. In Salesforce Setup, open **External Client Apps Manager** and create an External Client App (or inspect an existing app).
2. Enable OAuth and the **Client Credentials Flow**. Select the API scope (Manage user data via APIs).
3. Configure the app's Client Credentials policy to run as a dedicated integration user. Give that user only the object and field permissions needed by AutoCare 360; avoid using a personal administrator account for ongoing integration.
4. Copy the consumer key and secret from the app's settings, then add them and the org's verified My Domain URL to Vercel Environment Variables.
5. Redeploy, then open `/api/salesforce/schema`. A successful response has `ok: true` and an `objects` array. Use the returned exact API names to map the UI to the existing org.
6. To inspect a particular object's fields, open `/api/salesforce/schema?object=ExactApiName` using an exact name returned by the schema endpoint.

The endpoint is read-only and only discovers schema. It does **not** yet connect customer bookings, vehicles, estimates, invoices, role authentication, or other frontend CRUD operations to Salesforce. Those need to be mapped to the discovered objects and implemented with server-side authorization before the UI can be considered integrated. Do not remove integration/demo disclosures until real data paths have been tested.

Official Salesforce guidance: https://help.salesforce.com/s/articleView?id=configure_client_credentials_flow_for_external_client_apps.htm&language=en_US&type=5
