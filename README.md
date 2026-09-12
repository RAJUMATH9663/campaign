# AI Messaging Campaign Manager

A full-stack app for managing contacts and sending SMS/WhatsApp campaigns through **official, compliant provider APIs only** (no WhatsApp Web automation, scraping, or QR-session hacks). Includes AI-assisted message drafting (OpenAI or Anthropic), a compliance/opt-out engine, and a background job queue for rate-limited sending.

## Stack

- **Frontend:** React + Vite + TypeScript + Tailwind CSS
- **Backend:** Node.js + Express + TypeScript
- **Database:** PostgreSQL + Prisma ORM
- **Queue:** BullMQ + Redis
- **Auth:** JWT (email/password, bcrypt hashing)
- **AI:** Pluggable OpenAI / Anthropic service (server-side only)
- **Messaging:** Pluggable `SMSProvider` / `WhatsAppProvider` interfaces (Mock, Twilio, Meta WhatsApp Cloud API included)

## Project structure

```
/client   → React frontend
/server   → Express API + BullMQ worker
  /prisma → schema.prisma (database models)
```

---

## 1. Installation

**Prerequisites:** Node.js 18+, PostgreSQL 14+, Redis 6+ (or Docker for either).

```bash
# from the project root
cd server && npm install
cd ../client && npm install
```

## 2. Environment variables

Copy the example env files and fill in what you have. Everything works locally with **mock** providers even before you have real credentials.

```bash
cd server && cp .env.example .env
cd ../client && cp .env.example .env
```

Key server variables (`server/.env`):

```
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/campaign_manager?schema=public"
REDIS_URL="redis://localhost:6379"
JWT_SECRET="replace-with-a-long-random-string"
AI_PROVIDER="anthropic"          # or "openai"
ANTHROPIC_API_KEY=
OPENAI_API_KEY=
SMS_PROVIDER="mock"              # or "twilio"
WHATSAPP_PROVIDER="mock"         # or "meta_cloud_api"
```

Secrets are **only** read from server-side environment variables — never sent to or stored in the frontend, and `.env` is git-ignored (see `.env.example` for the full list).

## 3. Database setup

```bash
# Quick local Postgres via Docker, if you don't already have one:
docker run --name campaign-pg -e POSTGRES_PASSWORD=postgres -e POSTGRES_DB=campaign_manager -p 5432:5432 -d postgres:16

# Quick local Redis via Docker:
docker run --name campaign-redis -p 6379:6379 -d redis:7

cd server
npx prisma generate
npx prisma migrate dev --name init
```

This creates all tables (User, Contact, Campaign, Message, MessageTemplate, Consent, SuppressionList, Provider, AuditLog, etc.) per `prisma/schema.prisma`.

> **Note:** in this sandboxed build environment, `prisma generate` couldn't download its engine binary because outbound network access was restricted to a small allowlist. This is a sandbox limitation only — it will work normally on your machine with regular internet access.

## 4. Run the backend

Two processes: the API server and the background worker that actually sends messages.

```bash
cd server
npm run dev       # API on http://localhost:4000
```

In a second terminal:

```bash
cd server
npm run worker    # BullMQ worker, processes queued messages
```

## 5. Run the frontend

```bash
cd client
npm run dev        # http://localhost:5173
```

Sign up for an account at `http://localhost:5173/login` — the first account you create is your admin user.

## 6. Add an AI API key

Edit `server/.env`:

```
AI_PROVIDER="gemini"
GEMINI_API_KEY=AQ....
```

or

```
AI_PROVIDER="anthropic"
ANTHROPIC_API_KEY=sk-ant-...
```

or

```
AI_PROVIDER="openai"
OPENAI_API_KEY=sk-...
```

Restart `npm run dev` in `/server` after changing env vars. The AI Assistant page and the "Generate/Improve/Shorten/..." buttons in the campaign wizard will now call the real model instead of failing with a "not configured" error.

## 7. Configure messaging providers

By default both SMS and WhatsApp use the **mock** provider — messages are simulated (with a ~95% fake success rate) so you can test the whole pipeline without spending money or risking a real send.

**Twilio (SMS):**
```
SMS_PROVIDER="twilio"
SMS_PROVIDER_API_KEY=ACxxxxxxxx        # Twilio Account SID
SMS_PROVIDER_API_SECRET=your_auth_token
SMS_SENDER_ID=+15551234567             # your Twilio number
```

**Meta WhatsApp Cloud API (WhatsApp):**
```
WHATSAPP_PROVIDER="meta_cloud_api"
WHATSAPP_PROVIDER_API_KEY=your_system_user_token
WHATSAPP_PHONE_NUMBER_ID=your_phone_number_id
```

Both providers implement the same `SMSProvider` / `WhatsAppProvider` interface (`server/src/providers/`), so swapping to another official provider (MSG91, Vonage, a WhatsApp BSP, etc.) just means adding one more class and registering it in `providerFactory.ts` — no other code changes needed.

## 8. Import 500 contacts

1. Go to **Contacts → Upload CSV/XLSX** (or drag and drop).
2. Expected columns: `Name, Phone, Email, WhatsApp Opt-in, SMS Opt-in, Tags`. Opt-in columns accept `Yes/No`, `true/false`, or `1/0`.
3. The app parses and validates every row first (normalizes Indian phone numbers, flags invalid/duplicate numbers) and shows you a preview with valid/invalid/duplicate counts **before** anything is saved.
4. Click **Import** to commit the valid rows. Invalid rows are shown with the reason so you can fix and re-upload just those.

## 9. Create a campaign

1. **Create Campaign** in the sidebar → pick recipients (all contacts / a tag / a group / manually selected).
2. Choose channel: SMS or WhatsApp.
3. Write the message yourself, or use the AI panel to generate/improve/shorten/translate it. Use `{{name}}` and `{{phone}}` for personalization — the preview shows a rendered example.
4. **Compliance check** — the app automatically excludes contacts without the right opt-in or who are on the suppression list, and shows you exactly how many recipients are eligible vs. excluded before you can proceed.
5. Review and choose **Send Now**, **Schedule**, or **Save Draft**.

## 10. Test safely with a small number of contacts

- Leave `SMS_PROVIDER=mock` / `WHATSAPP_PROVIDER=mock` while testing — no real messages go out, but the full queue → send → status pipeline runs exactly as it would in production.
- When you're ready for a real test, import just 2–3 of your own numbers with opt-in set to `Yes`, switch the relevant provider to a real one, and send a small campaign to those numbers only (use **Selected contacts** as the recipient source) before sending anything at scale.
- Use **Pause** on a running campaign at any time — the worker checks campaign status before each send and stops picking up new messages.

## 11. Production deployment

- **Backend:** build with `npm run build` (outputs to `server/dist`), run with `node dist/index.js`, and run `node dist/jobs/campaign.worker.js` as a separate long-running process (e.g. two services/containers). Point `DATABASE_URL` and `REDIS_URL` at managed Postgres/Redis instances.
- **Frontend:** `npm run build` in `/client` outputs static files in `client/dist` — deploy to any static host (Vercel, Netlify, S3+CloudFront, etc.) and set `VITE_API_URL` to your deployed API's URL at build time.
- Run `npx prisma migrate deploy` (not `migrate dev`) against your production database.
- Set all secrets (`JWT_SECRET`, AI keys, provider keys) as environment variables in your hosting platform — never commit `.env`.
- Put the API behind HTTPS and restrict `CLIENT_ORIGIN` (CORS) to your real frontend domain.
- Register delivery-status webhooks with your SMS/WhatsApp provider and wire them to a new `/api/webhooks/...` route to move messages from `SENT` to `DELIVERED` automatically (the current build sets `SENT` immediately on provider acceptance and leaves `DELIVERED` for a webhook to fill in, since providers don't confirm delivery synchronously).
- Register a webhook (or poll) for inbound STOP/UNSUBSCRIBE replies and call `handleOptOutKeyword()` in `compliance.service.ts` so opt-outs are honored automatically.

---

## Compliance notes

- Messages are only ever sent to contacts with an explicit opt-in recorded for that channel (`smsOptIn` / `whatsappOptIn` on the `Contact` model), checked fresh at campaign-creation time.
- A `SuppressionList` table blocks sending to any number that has opted out, regardless of the contact record.
- Every contact-import, campaign-creation, launch, and cancellation is written to `AuditLog`.
- The AI Assistant only ever proposes text — sending always requires a separate, explicit user action (Send Now / Schedule), never an automatic step.
