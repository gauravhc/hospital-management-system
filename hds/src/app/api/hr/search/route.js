import { NextResponse } from 'next/server';

export async function GET(request) {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get('q');

    // Simulating delay
    await new Promise(resolve => setTimeout(resolve, 600));

    if (!query || query === 'notfound') {
        return NextResponse.json(
            { message: 'User not found' },
            { status: 404 }
        );
    }

    // Mock user data
    const mockUser = {
        username: 'EMP12345',
        name: 'Dr. Sarah Wilson',
        role: 'Doctor',
        department: 'Cardiology',
        mobile: '9876543210',
        join_date: '2023-01-15',
        blood_group: 'O+',
        photo: 'https://cdn-icons-png.flaticon.com/512/3774/3774299.png' // Placeholder
    };

    return NextResponse.json({ success: true, user: mockUser });
}
