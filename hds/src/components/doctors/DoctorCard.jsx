'use client';
import Link from 'next/link';
import { Star, MapPin } from 'lucide-react';

const DoctorCard = ({ doctor }) => {
    return (
        <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden hover:shadow-xl transition-all duration-300 group">
            <div className="relative h-64 overflow-hidden bg-gray-100">
                <img
                    src={doctor.image}
                    alt={doctor.name}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    onError={(e) => {
                        e.target.onerror = null;
                        e.target.src = "https://images.unsplash.com/photo-1612349317150-e413f6a5b16d?q=80&w=2070&auto=format&fit=crop";
                    }}
                />
                <div className="absolute top-4 right-4 bg-white px-2 py-1 rounded-lg text-sm font-bold text-gray-900 flex items-center gap-1 shadow-sm">
                    <Star className="w-4 h-4 text-yellow-400 fill-current" />
                    <span>{doctor.rating}</span>
                </div>
            </div>

            <div className="p-6">
                <div className="text-sm text-blue-600 font-semibold mb-2">{doctor.speciality}</div>
                <h3 className="text-xl font-bold text-gray-900 mb-2 group-hover:text-blue-600 transition-colors">
                    {doctor.name}
                </h3>
                <div className="flex items-center gap-2 text-gray-500 mb-4">
                    <MapPin className="w-4 h-4" />
                    <span className="text-sm">{doctor.location}</span>
                </div>

                <div className="flex items-center justify-between border-t border-gray-100 pt-4">
                    <div>
                        <p className="text-sm text-gray-500">Consultation</p>
                        <p className="text-lg font-bold text-gray-900">${doctor.price}</p>
                    </div>
                    <Link
                        href={`/doctors/${doctor.id}`}
                        className="px-4 py-2 bg-blue-50 text-blue-600 font-bold rounded-lg hover:bg-blue-600 hover:text-white transition-colors text-sm"
                    >
                        Book Now
                    </Link>
                </div>
            </div>
        </div>
    );
};

export default DoctorCard;
