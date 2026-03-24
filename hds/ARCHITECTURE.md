# HDS Architecture & Refactoring Plan

## Overview
This document outlines the architectural overhaul of the HDS project to address critical faults regarding scalability, security, and maintainability.

## 1. Architecture Design (Fault 1 & 9)
**Philosophy**: Separation of Concerns (SoC).
- **Frontend**: `src/app`, `src/components`. Pure UI. No business logic.
- **Backend Layer**: `src/app/api`. RESTful routes.
- **Service Layer**: `src/services/backend`. Business logic independent of HTTP (reusable).
- **Data Access Layer**: `src/models` / `src/db`. Database interaction abstraction.
- **Shared Utils**: `src/lib`, `src/utils`. Common helpers.

### Data Flow
`UI Component` -> `Frontend Service (Axios)` -> `Next.js API Route` -> `Backend Controller` -> `Backend Service` -> `Database`

## 2. Directory Structure (Fault 7 & 11)
Refactored `src` structure:
```
src/
├── app/                  # Next.js App Router (Pages & API)
│   ├── (dashboard)/      # Grouped routes for dashboards (doctor, patient, etc.)
│   ├── (auth)/           # Grouped routes for auth (login, signup)
│   ├── api/              # API Routes
│   ├── layout.jsx        # Root Layout
│   └── page.jsx          # Landing Page
├── components/           # Reusable UI Components
│   ├── ui/               # Atomic Design: buttons, inputs (Atomic)
│   ├── features/         # Feature-specific components (e.g., PatientList)
│   ├── layout/           # Sidebar, Navbar, Footer
│   └── shared/           # Generic shared components
├── config/               # Central configuration (env vars)
├── lib/                  # Third-party lib wrappers (Auth, DB, Logger)
├── services/             # Application Logic
│   ├── frontend/         # Client-side API wrappers
│   └── backend/          # Server-side Business Logic
├── models/               # Data Models / Schemas
├── hooks/                # Custom React Hooks
├── utils/                # Pure utility functions
└── middleware.js         # Edge Middleware for Auth/RBAC
```

## 3. Configuration (Fault 8)
Centralized `src/config/env.js` to validate and export environment variables. ensuring fail-fast behavior if config is missing.

## 4. Authentication & RBAC (Fault 3 & 4)
- **Auth**: JWT-based stateless authentication (for now) or NextAuth implementation.
- **RBAC**: Middleware to protect routes based on `role` (Admin, Doctor, Patient, etc.).

## 5. UI/UX & Layouts (Fault 5 & 6)
- **Global Layout**: A main `layout.jsx` handling the shell.
- **Dashboard Layout**: A shared `(dashboard)/layout.jsx` for all authenticated users containing the Sidebar/Header.

## 6. Backend Structure (Fault 2)
- API Routes should be generic: `/api/users`, `/api/appointments` with method handlers.
- **Controllers**: Logic extracted from `route.js` into controllers.

---
## Implementation Roadmap
1. **Scaffold Structure**: Create missing directories.
2. **Centralize Config**: Create `src/config/env.js`.
3. **Refactor Layouts**: Unify Sidebar/Header logic.
4. **Implement Mock DB/Service Layer**: Create specific service files.
5. **Update Auth**: Implement JWT handling and Middleware.
