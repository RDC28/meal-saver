# Demo Seed Data

Use this when you need a ready-made prototype database with donor, NGO, admin, nearby donation, pending match, pickup, delivery, and impact rows.

## Run

1. Make sure the database schema has already been applied.
2. Make sure `.env.local` has `DATABASE_URL`.
3. From the project root, run:

```bash
npm run seed:demo
```

The script loads `.env.local` automatically if `DATABASE_URL` is not already exported. It is safe to run multiple times: it removes and recreates only accounts using `demo.*@mealsaver.local`.

Then start the app:

```bash
npm run dev
```

Open `http://localhost:3000/login`.

## Demo Accounts

All demo accounts use the same password:

```text
Password123!
```

| Login tab | Email | What it shows |
| --- | --- | --- |
| Donor | `demo.donor@mealsaver.local` | Donor dashboard, active donations, delivered impact, expired donation |
| NGO | `demo.ngo@mealsaver.local` | Nearby donations inside the saved 12 km radius, one pending matched donation, assigned pickup, delivered history |
| Donor or NGO | `demo.dual@mealsaver.local` | Same email can be tested through both login tabs |
| Admin | `demo.admin@mealsaver.local` | Admin login/profile access |

## Seeded Location Scenario

The donor kitchen is seeded in Koramangala, Bengaluru. The NGO is seeded in Indiranagar with a `12 km` service radius. The available and pending donations use pickup locations close enough to show up in the NGO nearby flow.

The pending donation also includes a `donation_receiver_notifications` row with `response = 'no_response'`, so it exercises the match invitation behavior rather than bypassing it.
