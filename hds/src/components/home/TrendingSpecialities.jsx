'use client';
import Link from 'next/link';
import { Stethoscope, Heart, Brain, Baby, Activity, User } from 'lucide-react';

const TrendingSpecialities = () => {
    const specialities = [
        { name: 'Cardiology', count: '20 Doctors Available', icon: <Heart className="w-6 h-6 text-white" />, color: 'bg-red-500' },
        { name: 'Dental Care', count: '15 Doctors Available', icon: <Stethoscope className="w-6 h-6 text-white" />, color: 'bg-blue-500' },
        { name: 'Neurology', count: '12 Doctors Available', icon: <Brain className="w-6 h-6 text-white" />, color: 'bg-purple-500' },
        { name: 'Pediatrics', count: '10 Doctors Available', icon: <Baby className="w-6 h-6 text-white" />, color: 'bg-green-500' },
        { name: 'Urology', count: '14 Doctors Available', icon: <User className="w-6 h-6 text-white" />, color: 'bg-orange-500' },
        { name: 'Oncology', count: '17 Doctors Available', icon: <Activity className="w-6 h-6 text-white" />, color: 'bg-pink-500' },
    ];

    return (
        <section className="py-20 bg-white">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex flex-col md:flex-row justify-between items-end mb-12">
                    <div>
                        <h2 className="text-3xl md:text-4xl font-bold text-[#1B2559] mb-3">Trending Specialities</h2>
                        <p className="text-gray-500">Explore a Wide Range of Specialities</p>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    {/* 25+ Experience Block */}
                    <div className="lg:row-span-2 bg-[#0E82FD] rounded-[24px] p-8 text-white flex flex-col justify-center relative overflow-hidden group">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-white opacity-10 rounded-bl-[100px] transition-all duration-500 group-hover:scale-150"></div>
                        <div className="relative z-10 text-center">
                            <div className="text-[80px] font-bold leading-none mb-4">25+</div>
                            <h3 className="text-2xl font-bold mb-2">Years of experience</h3>
                            <p className="text-blue-100">in Healthcare</p>
                        </div>
                    </div>

                    {/* Speciality Cards */}
                    {specialities.map((spec, index) => (
                        <div key={index} className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm hover:shadow-lg transition-all duration-300 group cursor-pointer">
                            <div className="flex items-center gap-4">
                                <div className={`${spec.color} w-12 h-12 rounded-xl flex items-center justify-center shadow-md group-hover:scale-110 transition-transform`}>
                                    {spec.icon}
                                </div>
                                <div>
                                    <h4 className="text-lg font-bold text-[#1B2559] group-hover:text-[#0E82FD] transition-colors">{spec.name}</h4>
                                    <p className="text-sm text-gray-500">{spec.count}</p>
                                </div>
                            </div>
                        </div>
                    ))}

                    {/* Add more filler cards if needed to fill grid or match reference exact count if I view again, but 6 + 1 big block is standard layout */}
                </div>
            </div>
        </section>
    );
};

export default TrendingSpecialities;
