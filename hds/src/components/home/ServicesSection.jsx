'use client';
import Link from 'next/link';
import { ArrowRight, Stethoscope, Scissors, Microscope, Baby } from 'lucide-react';

const ServicesSection = () => {
    const services = [
        {
            title: "General Medicine",
            description: "Our General Medicine department offers a wide range of primary care services to patients of all ages.",
            icon: <Stethoscope className="w-8 h-8 text-white" />,
            color: "bg-blue-500"
        },
        {
            title: "Surgery",
            description: "Our Surgery department offers a range of surgical procedures, from minor outpatient surgeries.",
            icon: <Scissors className="w-8 h-8 text-white" />,
            color: "bg-green-500"
        },
        {
            title: "Laboratory Services",
            description: "Our Laboratory Services department ensures fast and accurate testing for a variety.",
            icon: <Microscope className="w-8 h-8 text-white" />,
            color: "bg-purple-500"
        },
        {
            title: "Pediatrics",
            description: "The Pediatrics department is focused on the healthcare needs of children from infancy.",
            icon: <Baby className="w-8 h-8 text-white" />,
            color: "bg-orange-500"
        }
    ];

    return (
        <section className="py-20 bg-gray-50">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex flex-col md:flex-row justify-between items-end mb-16">
                    <div>
                        <p className="text-[#0E82FD] font-bold mb-2">OUR SERVICES</p>
                        <h2 className="text-3xl md:text-4xl font-bold text-[#1B2559] max-w-xl leading-tight">
                            Your Reliable Route to Improved Health
                        </h2>
                    </div>
                    <Link href="/services" className="hidden md:inline-flex items-center text-[#0E82FD] font-bold hover:underline">
                        View All Services <ArrowRight className="ml-2 w-5 h-5" />
                    </Link>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
                    {services.map((service, index) => (
                        <div key={index} className="bg-white p-8 rounded-2xl shadow-sm hover:shadow-xl transition-all duration-300 group border border-gray-100">
                            <div className={`${service.color} w-16 h-16 rounded-2xl flex items-center justify-center mb-6 shadow-md group-hover:scale-110 transition-transform`}>
                                {service.icon}
                            </div>
                            <h3 className="text-xl font-bold text-[#1B2559] mb-4 group-hover:text-[#0E82FD] transition-colors">{service.title}</h3>
                            <p className="text-gray-500 leading-relaxed mb-6">
                                {service.description}
                            </p>
                            <Link href="/services" className="inline-flex items-center text-[#0E82FD] font-semibold hover:gap-2 transition-all">
                                Read More <ArrowRight className="ml-1 w-4 h-4" />
                            </Link>
                        </div>
                    ))}
                </div>
            </div>
        </section>
    );
};

export default ServicesSection;
