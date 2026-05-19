import backendUrl, { API_BASE_URL } from "@/lib/backendUrl";

const getEnv = (key, defaultValue) => {
    const value = process.env[key] || defaultValue;
    if (value === undefined) {
        throw new Error(`Environment variable ${key} is missing`);
    }
    return value;
};

export const config = {
    app: {
        env: getEnv('NODE_ENV', 'development'),
        url: getEnv('NEXT_PUBLIC_APP_URL', 'http://localhost:3000'),
    },
    api: {
        baseUrl: getEnv('NEXT_PUBLIC_API_URL', API_BASE_URL),
        timeout: 10000,
    },
    endpoints: {
        patient: {
            profile: backendUrl('/api/patients/profile'),
            appointments: backendUrl('/api/patients/appointments'),
        },
        doctor: {
            appointments: backendUrl('/api/appointments'),
        },
        // ... add others as needed
    },
    auth: {
        secret: getEnv('JWT_SECRET', 'super-secret-key-hds-2025'), // Fallback for dev only
    },
    roles: {
        ADMIN: 'admin',
        DOCTOR: 'doctor',
        PATIENT: 'patient',
        NURSE: 'nurse',
        LAB: 'lab',
        REGISTER: 'register',
    },
    
};

export default config;
