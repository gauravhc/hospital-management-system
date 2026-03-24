# Hospital Management System

Monorepo containing:

- `hds/` — Next.js frontend
- `backend/` — Node.js + Express backend
- `database/hds_db.sql` — MySQL dump of `hds_db` (generated via `mysqldump`)

## Quick start (dev)

Frontend:

- `cd hds`
- `npm install`
- `npm run dev`

Backend:

- `cd backend`
- `npm install`
- `npm start` (or your configured dev script)

## Database

To generate the dump file:

- `mysqldump -u root -p hds_db > database/hds_db.sql`

