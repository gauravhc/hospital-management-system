
import SpecialityCard from '@/components/specialities/SpecialityCard';
import { specialities } from '@/data/mockData';

export const metadata = {
    title: 'Specialities | Preclinic',
    description: 'Explore our wide range of medical specialities.',
};

export default function SpecialitiesPage() {
    return (
        <div className="bg-gray-50 min-h-screen py-20">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="text-center mb-16">
                    <h1 className="text-4xl font-bold text-gray-900 mb-4">Our Specialities</h1>
                    <p className="text-gray-600 max-w-2xl mx-auto">
                        We offer a comprehensive list of medical specialities to cater to all your healthcare needs.
                    </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-6">
                    {specialities.map((spec, index) => (
                        <SpecialityCard key={index} {...spec} />
                    ))}
                </div>
            </div>
        </div>
    );
}
