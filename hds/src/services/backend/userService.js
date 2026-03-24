import db from '@/lib/db';
import bcrypt from 'bcryptjs';

const USERS = db.collection('users');

// Seed default users if empty (for demo purposes)
const seedUsers = async () => {
    const allUsers = await USERS.find({});
    if (allUsers.length === 0) {
        // Create some demo users
        const demoUsers = [
            { name: "John Doe", role: "doctor", department: "Cardiology", status: "Active", email: "john@example.com", password: 'password123' },
            { name: "Jane Smith", role: "nurse", department: "Emergency", status: "Active", email: "jane@example.com", password: 'password123' },
            { name: "Mike Johnson", role: "pharmacy", department: "Pharmacy", status: "On Leave", email: "mike@example.com", password: 'password123' },
            { name: "Sarah Williams", role: "doctor", department: "Neurology", status: "Active", email: "sarah@example.com", password: 'password123' },
            { name: "David Brown", role: "lab", department: "Laboratory", status: "Active", email: "david@example.com", password: 'password123' },
        ];

        for (const u of demoUsers) {
            const hashedPassword = await bcrypt.hash(u.password, 10);
            await USERS.create({ ...u, password: hashedPassword });
        }
    }
};

// Auto-seed on import (Safe for this mock DB setup)
seedUsers();

export const userService = {
    async getAllUsers(query = {}) {
        const { role, q } = query;
        let users = await USERS.find({});

        // Filter by Role
        if (role && role !== 'All') {
            users = users.filter(u => u.role.toLowerCase() === role.toLowerCase());
        }

        // Search Query
        if (q) {
            const lowerQ = q.toLowerCase();
            users = users.filter(u =>
                u.name.toLowerCase().includes(lowerQ) ||
                u.email.toLowerCase().includes(lowerQ)
            );
        }

        // Return without sensitive data
        return users.map(user => {
            const { password, ...rest } = user;
            return {
                ...rest,
                // Ensure ID is a string if it isn't
                id: user._id || user.id
            };
        });
    },

    async getUserById(id) {
        const user = await USERS.findOne({ _id: id });
        if (!user) return null;
        const { password, ...rest } = user;
        return rest;
    },

    async createUser(userData) {
        const { email, password, name, role, department } = userData;

        const existing = await USERS.findOne({ email });
        if (existing) {
            throw new Error('User already exists');
        }

        const hashedPassword = await bcrypt.hash(password, 10);
        const newUser = await USERS.create({
            email,
            password: hashedPassword,
            name,
            role: role || 'patient',
            department: department || '',
            status: 'Active',
            profile: {}
        });

        const { password: _, ...userWithoutPassword } = newUser;
        return userWithoutPassword;
    },

    // Add update/delete as needed
};
