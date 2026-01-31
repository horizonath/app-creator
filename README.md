# Creator Hub (Komik & Novel) — MVP

Features included:
- Email login (magic link) via Resend + Auth.js/NextAuth
- Series (COMIC / NOVEL)
- Episodes (novel body text; comic pages via image URLs — MVP)
- Credits faucet (daily claim, Asia/Jakarta day boundary)
- Locked episodes: unlock with credits (24h) or premium membership bypass
- Tip creator with credits
- Like + comment
- Leaderboards (Top Readers / Top Creators) via daily aggregation
- Vercel-ready

## 1) Setup

### Requirements
- Node 18+ (recommended 20+)
- Postgres database (Neon / Supabase / Vercel Postgres)
- Resend account for email sending

### Install
```bash
npm install
cp .env.example .env
```

Fill `.env`.

### Prisma
```bash
npx prisma generate
npx prisma migrate dev
```

### Run
```bash
npm run dev
```

Open: http://localhost:3000

## 2) Deploy to Vercel
- Push this repo to GitHub
- Import to Vercel
- Set env vars from `.env.example` in Vercel Project Settings
- Deploy

## 3) Vercel Cron (Leaderboards)
Create a Vercel Cron job that calls:
- POST https://YOUR_DOMAIN/api/cron/aggregate
- Header: `x-cron-secret: <CRON_SECRET>`

Schedule: daily (recommended at 00:10 Asia/Jakarta or any time).

## 4) Notes / Next Upgrades
- Comic image upload: integrate Cloudflare R2 / S3 + pre-signed uploads
- Better view de-duplication (1 view per user per episode per X hours)
- Admin dashboard + moderation
- Stripe membership payments
