# Hospital Management System — Video Walkthrough Script (3–6 minutes)

This repo is a monorepo:
- `hds/` = Next.js frontend (port `3000`)
- `backend/` = Node.js + Express API (port `5000`)
- `database/hds_db.sql` = MySQL dump (optional; backend also supports migrate/seed)

The frontend calls the backend via `NEXT_PUBLIC_API_BASE_URL` (defaults to `http://localhost:5000`).
If your backend runs somewhere else, set it in `hds/.env.local`, for example:
```bash
NEXT_PUBLIC_API_BASE_URL=http://localhost:5000
```

---

## 0) Recording setup (10–20s)

**Screen recorder**: OBS / Windows Game Bar / Loom  
**Capture**: 1 browser window + 1 terminal window

Recommended resolution: 1080p, 60fps (or 30fps), mic on.

---

## 1) Start everything (45–70s)

### Terminal: Backend

Narration:
> “First I’m starting the backend API which provides authentication, hospital setup, users, patients, appointments, lab, ambulance, and more.”

On screen (commands):
```bash
cd backend
npm install
cp .env.example .env
# Update DB_* + JWT_SECRET if needed
npm run migrate
npm run seed
npm run dev
```

### Seeded demo logins

- Super Admin: `superadmin@medicorevault.ai` / `SuperAdmin@123`
- Hospital Admin: `admin@hds.com` / `Admin@123`

Mention (quickly):
- Backend entry: `backend/app.js`
- All APIs mount under `/api` in `backend/routes/index.js`

### Terminal: Frontend

Narration:
> “Now I’ll start the Next.js frontend. It talks to the backend using the `NEXT_PUBLIC_API_BASE_URL` env variable.”

On screen:
```bash
cd hds
npm install
# optionally: set NEXT_PUBLIC_API_BASE_URL=http://localhost:5000 in hds/.env.local
npm run dev
```

---

## 2) Architecture overview (20–30s)

Narration:
> “The UI is in `hds/src/app` and reusable UI components are in `hds/src/components`. Requests go through an Axios client that automatically attaches the JWT token from localStorage.”

Show these files briefly:
- Frontend API base: `hds/src/lib/backendUrl.js`
- Axios client + token interceptor: `hds/src/lib/apiClient.js`
- Auth storage + cookie for middleware: `hds/src/context/AuthContext.js`
- Route protection by role: `hds/src/middleware.js`

Optional one-liner:
> “The backend enforces RBAC on APIs, and the frontend middleware protects page routes by role.”

---

## 3) Demo flow (main part, 2–4 minutes)

### A) Login + Role routing (30–45s)

On screen:
- Open `http://localhost:3000/login`
- Login with seeded credentials (from `backend/README.md`)

Narration:
> “Logging in returns a token + user profile. The frontend stores it in localStorage and redirects based on role.”

Show the redirect logic quickly:
- `hds/src/app/login/page.jsx` (switch-case routes to `/super-admin`, `/admin`, `/doctor`, `/nurse`, `/patient`, etc.)

### B) Super Admin: create hospital & admins (45–75s)

On screen:
- Go to `/super-admin`
- Show key sections: dashboard stats, hospitals list, create/edit hospital, manage super admins

Narration:
> “Super Admin is the top-level role. They can create hospitals, upload hospital license documents, and manage administrators.”

If the UI has it, click:
- “Add Hospital” (fill minimal fields)
- “Create Super Admin / Admin”
- Show license preview modal (if available)

### C) Hospital Admin: staff directory + stats + ambulance requests (45–75s)

On screen:
- Logout, login as hospital admin
- Go to `/admin`
- Show: staff stats, directory search, ID card, ambulance requests table, quick action buttons

Narration:
> “Hospital Admin is responsible for day-to-day operations: staff overview, attendance-style stats, directory lookups, and ambulance request handling.”

Tip: demonstrate one “search by ID / phone” in directory search.

### D) Doctor: appointments + manage status (35–60s)

On screen:
- Login as doctor
- Go to `/doctor`
- Show appointment list, status filters, date filter, open one appointment

Narration:
> “Doctors can view and manage appointments, filter by status/date, and open an appointment to update details or proceed with lab-related actions.”

### E) Nurse: tasks + vitals entry (35–60s)

On screen:
- Login as nurse
- Go to `/nurse`
- Show tasks list → open a task → accept/start/complete (if available)
- Enter vitals (BP/HR/Temp/SpO2/Weight) and submit

Narration:
> “Nurses get assigned tasks and can record patient vitals. The dashboard also refreshes tasks periodically so it stays up to date.”

### F) Patient: dashboard + ambulance request (35–60s)

On screen:
- Login as patient
- Go to `/patient`
- Show: upcoming appointments count, documents vault, lab reports, insurance claims
- Go to `/patient/ambulance` (or the “Book Ambulance” card) and submit a request
- Switch back to admin and show it appears under active ambulance requests

Narration:
> “Patients can track appointments, access documents, lab, pharmacy, insurance, and request an ambulance; staff can then manage that request from the admin side.”

---

## 4) What to highlight (10–20s)

Narration:
> “So the project is role-based end to end: login issues a JWT, the UI is protected by middleware, and all modules are served by the backend API under `/api`.”

Show backend module list quickly:
- `backend/app.js` root endpoint returns enabled modules.

---

## 5) Outro (5–10s)

Narration:
> “That’s the quick tour. Next steps are deployment config, production DB setup, and enabling any additional modules you want to ship first.”

---

## Optional: recording checklist (quick)

- [ ] Terminal: start backend (`backend/`) and confirm `http://localhost:5000/` responds
- [ ] Terminal: start frontend (`hds/`) and open `http://localhost:3000/login`
- [ ] Login as each role you want to show (Super Admin, Hospital Admin, Doctor, Nurse, Patient)
- [ ] Demonstrate 1 real end-to-end flow (e.g., patient ambulance request → admin assignment)
