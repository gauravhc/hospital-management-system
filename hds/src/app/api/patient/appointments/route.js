import { NextResponse } from 'next/server';

export async function GET() {
    return NextResponse.json([
        {
            id: 1,
            doctorName: "Dr. Sarah Smith",
            specialty: "Cardiology",
            date: "2024-12-25",
            time: "10:00 AM",
            status: "Complete",
            symptoms: "Chest pain",
            location: "Main Branch"
        },
        {
            id: 2,
            doctorName: "Dr. James Wilson",
            specialty: "Dermatology",
            date: "2024-12-28",
            time: "02:30 PM",
            status: "Scheduled",
            symptoms: "Skin rash",
            location: "City Clinic"
        }
    ]);
}
