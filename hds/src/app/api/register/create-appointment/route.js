import { NextResponse } from 'next/server';

export async function POST(request) {
    const body = await request.json();
    return NextResponse.json({
        success: true,
        message: "Appointment created successfully",
        data: {
            id: "apt" + Math.random().toString(36).substr(2, 9),
            ...body
        }
    });
}
