
import DoctorCard from '@/components/doctors/DoctorCard';
import { doctors } from '@/data/mockData';

export const metadata = {
    title: 'Doctors | Preclinic',
    description: 'Find optimal care from our experienced doctors.',
};

export default function DoctorsPage() {
    return (
        <div className="bg-gray-50 min-h-screen py-20">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="text-center mb-16">
                    <h1 className="text-4xl font-bold text-gray-900 mb-4">Meet Our Doctors</h1>
                    <p className="text-gray-600 max-w-2xl mx-auto">
                        Our team of dedicated doctors is here to provide you with the best medical care.
                    </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
                    {doctors.map((doctor) => (
                        <DoctorCard key={doctor.id} doctor={doctor} />
                    ))}
                </div>
            </div>
        </div>
    );
}
