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
