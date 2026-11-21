# EventLink

Discover opportunities. Connect with technology.

EventLink is a web platform for students and organizers. Seekers build a private profile, browse internships, scholarships, events, hackathons and workshops, and see why a listing matched. Organizers publish opportunities after verification.

## Stack

- Frontend: React, Vite, React Router, Tailwind, TanStack Query
- Backend: Node.js, Express, REST under `/api/v1`
- Database: PostgreSQL with Prisma

The product requirements document mentioned MongoDB. This build uses PostgreSQL, as requested.

## Run locally

The app uses its own PostgreSQL 18 cluster in `.pgdata`, on port `5433`. The database user is `eventlink`. The password is in `server/.env` and is not committed.

1. Install dependencies from the repo root, then inside `client` and `server`.
2. Start the database if it is not running: `pg_ctl -D .pgdata -l .pgdata/server.log -o "-p 5433" start`
3. From `server`: `npx prisma db push` then `npm run db:seed`.
4. From the repo root: `npm run dev`.

The web app is at http://localhost:5173 and the API at http://localhost:4000.

## Demo accounts

Every demo password is `EventLink1`.

- Seeker: `hana.testaye@example.com`
- Verified organizer: `nova@eventlink.test`
- Unverified organizer: `kite@eventlink.test`
- Admin: `admin@eventlink.test`

## What this slice includes

Registration and login with seeker and organizer roles, refresh-token cookies, opportunity search and filters, detail pages with a separate match score and eligibility check, rule-based profile suggestions that are saved only after confirmation, saved items with application tracking, and an organizer workspace for drafts, publishing, applications and opted-in talent.

Ads, in-app notifications, and the admin verification queue are the next slice.
