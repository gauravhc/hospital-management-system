# 🏥 Hospital Management System — Backend API

> Node.js + Express + MySQL | Multi-tenant | Role-based Access Control

---

## 📁 Project Structure

```
hospital-backend/
├── src/
│   ├── config/
│   │   └── database.js          # MySQL connection pool
│   ├── controllers/
│   │   ├── authController.js    # Login, logout, token refresh
│   │   ├── superAdminController.js  # Hospital & system management
│   │   ├── adminController.js   # Hospital admin dashboard & staff
│   │   ├── doctorController.js  # Doctor CRUD & scheduling
│   │   ├── nurseController.js   # Nurse CRUD & shift management
│   │   ├── patientController.js # Patient CRUD & search
│   │   └── ambulanceController.js # Ambulance + dispatch management
│   ├── database/
│   │   ├── migrate.js           # Create all tables
│   │   └── seed.js              # Seed default roles & super admin
│   ├── middleware/
│   │   ├── auth.js              # JWT auth + RBAC
│   │   ├── validate.js          # express-validator error handler
│   │   └── errorHandler.js      # Global error handler
│   ├── routes/
│   │   ├── auth.routes.js
│   │   ├── superAdmin.routes.js
│   │   ├── admin.routes.js
│   │   ├── doctor.routes.js
│   │   ├── nurse.routes.js
│   │   ├── patient.routes.js
│   │   └── ambulance.routes.js
│   ├── utils/
│   │   ├── jwt.js               # Token generation/verification
│   │   ├── response.js          # Standardized API responses
│   │   └── auditLog.js          # Action audit trail
│   └── server.js                # Express app entry point
├── uploads/                     # File uploads directory
├── .env.example                 # Environment variable template
└── package.json
```

---

## ⚙️ Setup & Installation

### 1. Clone & Install
```bash
cd hospital-backend
npm install
```

### 2. Configure Environment
```bash
cp .env.example .env
# Edit .env with your MySQL credentials and JWT secrets
```

### 3. Create MySQL Database
```sql
CREATE DATABASE hospital_management CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

### 4. Run Migrations
```bash
npm run migrate
```

### 5. Seed Default Data
```bash
npm run seed
```

### 6. Start the Server
```bash
npm run dev    # development (with nodemon)
npm start      # production
```

---

## 🔐 Authentication

All protected routes require a Bearer token in the Authorization header:
```
Authorization: Bearer <access_token>
```

### Default Credentials (after seeding)
| Role | Email | Password |
|------|-------|----------|
| Super Admin | superadmin@dscape.ai | SuperAdmin@123 |
| Hospital Admin | admin@hds.com | Admin@123 |

---

## 📋 API Reference

### Base URL
```
http://localhost:5000/api
```

### Standard Response Format
```json
{
  "success": true,
  "message": "Success",
  "data": { ... },
  "timestamp": "2024-02-10T12:00:00.000Z"
}
```

### Paginated Response Format
```json
{
  "success": true,
  "data": [...],
  "pagination": {
    "total": 100,
    "page": 1,
    "limit": 10,
    "totalPages": 10,
    "hasNextPage": true,
    "hasPrevPage": false
  }
}
```

---

## 🔑 AUTH ENDPOINTS

| Method | Endpoint | Access | Description |
|--------|----------|--------|-------------|
| POST | `/auth/login` | Public | Login and get tokens |
| POST | `/auth/refresh` | Public | Refresh access token |
| POST | `/auth/logout` | Protected | Logout & invalidate token |
| GET | `/auth/me` | Protected | Get current user profile |
| POST | `/auth/change-password` | Protected | Change password |

#### POST /auth/login
```json
// Request
{ "email": "admin@hds.com", "password": "Admin@123" }

// Response
{
  "accessToken": "eyJ...",
  "refreshToken": "eyJ...",
  "user": {
    "id": "...",
    "role": "hospital_admin",
    "hospital_id": "...",
    "permissions": ["manage_users", "manage_doctors", ...]
  }
}
```

---

## 👑 SUPER ADMIN ENDPOINTS

> Requires role: `super_admin`

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/super-admin/stats` | System-wide statistics |
| GET | `/super-admin/hospitals` | List all hospitals |
| POST | `/super-admin/hospitals` | Create new hospital |
| PUT | `/super-admin/hospitals/:id` | Update hospital |
| DELETE | `/super-admin/hospitals/:id` | Deactivate hospital |
| POST | `/super-admin/hospitals/:id/admins` | Create hospital admin |
| GET | `/super-admin/audit-logs` | View audit trail |

#### POST /super-admin/hospitals
```json
{
  "name": "City General Hospital",
  "email": "admin@citygeneral.com",
  "phone": "+1234567890",
  "address": "123 Medical Street",
  "license_no": "HOSP-2024-002",
  "bed_capacity": 300,
  "settings": {
    "theme": "blue",
    "currency": "USD",
    "timezone": "America/New_York"
  }
}
```

---

## 🏥 HOSPITAL ADMIN ENDPOINTS

> Requires role: `hospital_admin`

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/admin/dashboard` | Dashboard stats + dept overview |
| GET | `/admin/staff` | List all hospital staff |
| PUT | `/admin/staff/:id/status` | Activate/suspend staff |
| GET | `/admin/departments` | List departments |
| POST | `/admin/departments` | Create department |
| GET | `/admin/settings` | Get hospital settings |
| PUT | `/admin/settings` | Update hospital settings |

#### GET /admin/dashboard — Response
```json
{
  "departmentOverview": [
    { "department": "Cardiology", "total_staff": 12, "present": 10, "absent": 2 }
  ],
  "appointments": { "total": 45, "scheduled": 20, "completed": 20, "cancelled": 5 },
  "patients": { "total": 1250, "new_today": 8 },
  "staff": { "total": 195 },
  "ambulances": { "total": 8, "available": 6 }
}
```

---

## 👨‍⚕️ DOCTOR ENDPOINTS

| Method | Endpoint | Access | Description |
|--------|----------|--------|-------------|
| GET | `/doctors` | All staff | List doctors (filterable) |
| GET | `/doctors/:id` | All staff | Get doctor details |
| GET | `/doctors/:id/schedule` | All staff | Get availability for a date |
| POST | `/doctors` | Admin | Create doctor account |
| PUT | `/doctors/:id` | Admin | Update doctor |
| DELETE | `/doctors/:id` | Admin | Deactivate doctor |

#### Query Params for GET /doctors
```
?page=1&limit=10&search=john&department_id=xxx&specialization=cardio&is_available=true
```

#### POST /doctors
```json
{
  "first_name": "Dr. John",
  "last_name": "Smith",
  "email": "john.smith@hospital.com",
  "phone": "+1234567890",
  "gender": "male",
  "date_of_birth": "1985-05-15",
  "password": "Doctor@123",
  "department_id": "dept-uuid-here",
  "specialization": "Cardiology",
  "qualification": "MBBS, MD",
  "license_number": "MED-2024-001",
  "experience_years": 10,
  "consultation_fee": 500,
  "available_days": ["monday", "tuesday", "wednesday", "thursday", "friday"],
  "available_time_from": "09:00:00",
  "available_time_to": "17:00:00",
  "max_patients_per_day": 25
}
```

#### GET /doctors/:id/schedule?date=2024-02-15
```json
{
  "available_from": "09:00:00",
  "available_to": "17:00:00",
  "max_patients": 25,
  "booked_slots": [
    { "appointment_time": "09:30:00", "token_number": 1, "status": "confirmed" }
  ],
  "available_slots": 24
}
```

---

## 👩‍⚕️ NURSE ENDPOINTS

| Method | Endpoint | Access | Description |
|--------|----------|--------|-------------|
| GET | `/nurses` | All staff | List nurses |
| GET | `/nurses/:id` | All staff | Get nurse details |
| GET | `/nurses/shift-schedule` | All staff | Today's nurses by shift |
| POST | `/nurses` | Admin | Create nurse account |
| PUT | `/nurses/:id` | Admin | Update nurse |
| DELETE | `/nurses/:id` | Admin | Deactivate nurse |

#### POST /nurses
```json
{
  "first_name": "Sarah",
  "last_name": "Johnson",
  "email": "sarah.j@hospital.com",
  "phone": "+1234567890",
  "gender": "female",
  "department_id": "dept-uuid-here",
  "qualification": "BSc Nursing",
  "license_number": "NRS-2024-001",
  "shift": "morning",
  "ward_assigned": "Ward A - Cardiology",
  "experience_years": 5,
  "is_head_nurse": false
}
```

---

## 🤒 PATIENT ENDPOINTS

| Method | Endpoint | Access | Description |
|--------|----------|--------|-------------|
| GET | `/patients` | All staff | List patients (paginated) |
| GET | `/patients/search?q=john` | All staff | Quick search |
| GET | `/patients/:id` | All staff | Patient details + history |
| POST | `/patients` | All staff | Register new patient |
| PUT | `/patients/:id` | All staff | Update patient |
| DELETE | `/patients/:id` | Admin | Deactivate patient |

#### POST /patients
```json
{
  "first_name": "Alice",
  "last_name": "Brown",
  "phone": "+1234567890",
  "email": "alice@example.com",
  "gender": "female",
  "date_of_birth": "1990-08-20",
  "blood_group": "B+",
  "address": "456 Oak Avenue",
  "emergency_contact_name": "Bob Brown",
  "emergency_contact_phone": "+0987654321",
  "emergency_contact_relation": "Spouse",
  "allergies": "Penicillin, Aspirin",
  "chronic_conditions": "Hypertension",
  "insurance_provider": "HealthCare Plus",
  "insurance_policy_no": "HCP-12345"
}
```

---

## 🚑 AMBULANCE ENDPOINTS

| Method | Endpoint | Access | Description |
|--------|----------|--------|-------------|
| GET | `/ambulances` | All staff | List ambulances (with status) |
| GET | `/ambulances/:id` | All staff | Ambulance detail + dispatches |
| GET | `/ambulances/dispatches` | All staff | Dispatch history |
| POST | `/ambulances` | Admin | Add ambulance |
| PUT | `/ambulances/:id` | Admin | Update ambulance |
| DELETE | `/ambulances/:id` | Admin | Mark out of service |
| POST | `/ambulances/dispatch` | All staff | Dispatch ambulance |
| PUT | `/ambulances/dispatch/:id/status` | All staff | Update dispatch status |

#### POST /ambulances
```json
{
  "vehicle_no": "AMB-001",
  "type": "advanced",
  "model": "Mercedes Sprinter",
  "year": 2023,
  "driver_name": "Mike Wilson",
  "driver_phone": "+1234567890",
  "equipment": ["defibrillator", "oxygen_tank", "stretcher", "ECG_monitor"],
  "last_service_date": "2024-01-15",
  "next_service_date": "2024-07-15"
}
```

#### POST /ambulances/dispatch
```json
{
  "ambulance_id": "amb-uuid-here",
  "patient_id": "patient-uuid-here",
  "caller_name": "John Doe",
  "caller_phone": "+1234567890",
  "pickup_location": "123 Main Street, City",
  "pickup_lat": 12.9716,
  "pickup_lng": 77.5946,
  "destination": "Dscape AI Medical Center",
  "emergency_type": "Cardiac Arrest",
  "priority": "critical"
}
```

---

## 🗄️ Database Schema Overview

```
hospitals           → Multi-tenant hospital records
roles               → super_admin, hospital_admin, doctor, nurse, etc.
departments         → Cardiology, Neurology, etc. (per hospital)
users               → All staff accounts (one table, role-based)
doctors             → Doctor profile (extends users)
nurses              → Nurse profile (extends users)
patients            → Patient records
appointments        → Doctor-patient appointments
ambulances          → Fleet management
ambulance_dispatches → Dispatch records
attendance          → Staff daily attendance
audit_logs          → Full audit trail of all actions
```

---

## 🔒 Role Permissions

| Permission | super_admin | hospital_admin | doctor | nurse |
|------------|:-----------:|:--------------:|:------:|:-----:|
| Manage hospitals | ✅ | ❌ | ❌ | ❌ |
| Create hospital admins | ✅ | ❌ | ❌ | ❌ |
| Manage staff | ✅ | ✅ | ❌ | ❌ |
| View patients | ✅ | ✅ | ✅ | ✅ |
| Create/edit patients | ✅ | ✅ | ✅ | ✅ |
| Manage appointments | ✅ | ✅ | ✅* | ✅* |
| Dispatch ambulance | ✅ | ✅ | ✅ | ✅ |
| View audit logs | ✅ | ❌ | ❌ | ❌ |

*With restrictions

---

## 🔧 Customization Guide

### Adding a New Module (for your teammates)

1. **Create controller**: `src/controllers/yourModule.js`
2. **Create routes**: `src/routes/yourModule.routes.js`
3. **Add table**: Add `CREATE TABLE` SQL in `migrate.js`
4. **Register route**: Add `app.use('/api/your-module', routes)` in `server.js`

### Adding Hospital-Specific Settings
Use the `settings` JSON column in the `hospitals` table:
```json
{
  "theme": "blue",
  "currency": "INR",
  "timezone": "Asia/Kolkata",
  "working_hours": { "start": "08:00", "end": "22:00" },
  "modules_enabled": ["appointments", "lab", "pharmacy"]
}
```

### Environment-Based Config
All configurable values are in `.env`. No hardcoded values in source code.

---

## 🧑‍💻 Your Teammates' Modules

These follow the exact same pattern. They need to create:
- Controller in `src/controllers/`
- Routes in `src/routes/`
- Tables in `src/database/migrate.js`
- Register in `src/server.js`

**Modules to build:**
1. Appointments (scheduling, tokens)
2. Laboratory (tests, reports)
3. Pharmacy (inventory, prescriptions)
4. Inventory (equipment tracking)
5. Accounts/Billing (invoices, payments)
6. Attendance (check-in/check-out)
7. Reports (analytics, exports)
