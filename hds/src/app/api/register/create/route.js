import { NextResponse } from 'next/server';

export async function POST(request) {
    const body = await request.json();
    return NextResponse.json({
        success: true,
        message: "Patient registered successfully",
        data: {
            id: "p" + Math.random().toString(36).substr(2, 9),
            ...body
        }
    });
}
