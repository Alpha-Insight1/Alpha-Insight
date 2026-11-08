# Alpha Insight v2 — School Operations & Analytics

For **directors** and **secretaries**. Redeploy-ready.

## What is included
- Director dashboard: KPIs, cashflow, charts, monthly stats
- Students, payments, outstanding, fees tracker, receipts
- School bus
- Expenses, inventory, staff, loans, scholarships
- Exam register, private lessons, parents SMS
- Ask Alpha (admin AI, 50/day)
- Light SaaS UI, night/day, privacy mode

## Removed
- Card renewals module

## Roles
| Login as | profiles.role | UI label |
|----------|---------------|----------|
| Director | `admin` | Director |
| Secretary | `secretary` | Secretary |

## Redeploy checklist

### A. Supabase (new or empty project recommended)
1. SQL Editor → paste and run **`schema/COMPLETE.sql`**
2. Run **`FIX-ADMIN-ROLE.sql`** (change email to yours)
3. Auth → Users → Add user (email + password)
4. Copy Project URL + anon/publishable key

### B. Vercel
1. Push this repo to GitHub
2. Import on Vercel
3. Env:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
4. Deploy → open URL → sign in

### C. If you still see Secretary
profiles.id must = auth.users.id and role = admin. Re-run FIX-ADMIN-ROLE.sql.

## Local
```bash
npm install
cp .env.example .env.local
npm run dev
```

Alpha Insight · Strategy & Business Analytics
