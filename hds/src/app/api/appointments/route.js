import { NextResponse } from 'next/server';
import { appointmentService } from '@/services/backend/appointmentService';

export const dynamic = 'force-dynamic';

export async function GET(request) {
    try {
        const { searchParams } = new URL(request.url);
        const headers = request.headers;

        // Priority: SearchParams > Headers (for overrides/admin) > Null
        // In real app, trust headers from middleware for own data
        const role = headers.get('x-user-role') || searchParams.get('role');
        const userId = headers.get('x-user-id') || searchParams.get('userId');
        const status = searchParams.get('status');

        const appointments = await appointmentService.getAppointments({ role, userId, status });

        return NextResponse.json({ success: true, appointments });
    } catch (error) {
        return NextResponse.json(
            { success: false, message: 'Failed to fetch appointments' },
            { status: 500 }
        );
    }
}

export async function POST(request) {
    try {
        const body = await request.json();
        const newAppt = await appointmentService.createAppointment(body);

        return NextResponse.json({ success: true, appointment: newAppt });
    } catch (error) {
        return NextResponse.json(
            { success: false, message: 'Failed to create appointment' },
            { status: 500 }
        );
    }
}

export async function PUT(request) {
    try {
        const body = await request.json();
        const { id, status } = body;

        const updated = await appointmentService.updateStatus(id, status);

        return NextResponse.json({ success: true, appointment: updated });
    } catch (error) {
        return NextResponse.json(
            { success: false, message: 'Failed to update appointment' },
            { status: 500 }
        );
    }
}
