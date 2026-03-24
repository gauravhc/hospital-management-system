'use client';
import Link from 'next/link';
import { CheckCircle } from 'lucide-react';

const AboutUs = () => {
    const features = [
        "Routine check-ups",
        "State-of-the-Art Facilities",
        "Convenient Location",
        "Comprehensive Care",
        "Minor outpatient procedures",
        "Experienced Healthcare Providers"
    ];

    return (
        <section className="py-20 bg-white overflow-hidden">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
                    {/* Content */}
                    <div>
                        <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-[#1B2559] mb-6 leading-tight">
                            Accessible & Reliable <br />
                            <span className="text-[#0E82FD]">Healthcare</span> Simplified
                        </h2>
                        <p className="text-lg text-gray-600 mb-8 leading-relaxed">
                            We provide comprehensive, high-quality healthcare for patients of all ages. Our clinic is home to a range of specialized departments, ensuring that all your medical needs are met under one roof. Whether you need a routine checkup or specialized treatment, our experienced team is here to help.
                        </p>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
                            {features.map((feature, index) => (
                                <div key={index} className="flex items-center gap-3">
                                    <CheckCircle className="w-5 h-5 text-[#0E82FD] flex-shrink-0" />
                                    <span className="text-gray-700 font-medium">{feature}</span>
                                </div>
                            ))}
                        </div>

                        <Link href="/about" className="inline-flex items-center px-8 py-3 bg-[#0E82FD] text-white font-bold rounded-xl hover:bg-blue-700 transition-colors shadow-lg hover:shadow-xl">
                            Know More
                        </Link>
                    </div>

                    {/* Images */}
                    <div className="relative">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-4 pt-12">
                                <img
                                    src="https://images.unsplash.com/photo-1579684385136-137af18db00aa?q=80&w=2070&auto=format&fit=crop"
                                    alt="Medical Facility"
                                    className="rounded-2xl shadow-lg w-full h-48 object-cover"
                                />
                                <img
                                    src="https://images.unsplash.com/photo-1581594693702-fbdc51b2763b?q=80&w=2070&auto=format&fit=crop"
                                    alt="Doctor Consultation"
                                    className="rounded-2xl shadow-lg w-full h-64 object-cover"
                                />
                            </div>
                            <div className="space-y-4">
                                <img
                                    src="https://images.unsplash.com/photo-1631217868264-e5b90bb7e133?q=80&w=2091&auto=format&fit=crop"
                                    alt="Surgery"
                                    className="rounded-2xl shadow-lg w-full h-64 object-cover"
                                />
                                <img
                                    src="https://images.unsplash.com/photo-1551076805-e1869033e561?q=80&w=2070&auto=format&fit=crop"
                                    alt="Laboratory"
                                    className="rounded-2xl shadow-lg w-full h-48 object-cover"
                                />
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </section>
    );
};

export default AboutUs;
