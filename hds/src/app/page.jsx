'use client';
import { useState } from 'react';
import Hero from '@/components/home/Hero';
import TrendingSpecialities from '@/components/home/TrendingSpecialities';
import AboutUs from '@/components/home/AboutUs';
import StatsSection from '@/components/home/StatsSection';
import ServicesSection from '@/components/home/ServicesSection';
import DoctorCard from '@/components/doctors/DoctorCard';
import BlogCard from '@/components/blog/BlogCard';
import TestimonialSlider from '@/components/common/TestimonialSlider';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { doctors, blogs, specialities } from '@/data/mockData';

export default function Home() {
    return (
        <main>
            <Hero />

            <TrendingSpecialities />

            <AboutUs />

            {/* Doctors Section */}
            <section className="py-20 bg-gray-50">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex justify-between items-end mb-12">
                        <div>
                            <h2 className="text-3xl md:text-4xl font-bold text-[#1B2559] mb-4">Book Our Best Doctor</h2>
                            <p className="text-gray-500 max-w-2xl">Access to expert physicians and surgeons, advanced technologies and top-quality surgery facilities right here.</p>
                        </div>
                        <Link href="/doctors" className="hidden md:flex items-center gap-2 text-[#0E82FD] font-bold hover:gap-3 transition-all">
                            View All Doctors <ArrowRight size={20} />
                        </Link>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                        {doctors.slice(0, 4).map((doctor) => (
                            <DoctorCard key={doctor.id} doctor={doctor} />
                        ))}
                    </div>

                    <div className="mt-8 text-center md:hidden">
                        <Link href="/doctors" className="inline-flex items-center gap-2 text-[#0E82FD] font-bold">
                            View All Doctors <ArrowRight size={20} />
                        </Link>
                    </div>
                </div>
            </section>

            <StatsSection />

            <ServicesSection />

            <TestimonialSlider />

            {/* Blog Section */}
            <section className="py-20 bg-white">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="text-center mb-16">
                        <p className="text-[#0E82FD] font-bold mb-2">OUR BLOG</p>
                        <h2 className="text-3xl md:text-4xl font-bold text-[#1B2559]">From Our Blog News</h2>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
                        {blogs.map((blog, index) => (
                            <BlogCard key={index} blog={blog} />
                        ))}
                    </div>

                    <div className="mt-12 text-center">
                        <Link href="/blogs" className="inline-flex items-center px-8 py-3 border-2 border-[#1B2559] text-[#1B2559] font-bold rounded-lg hover:bg-[#1B2559] hover:text-white transition-colors">
                            View All Blog <ArrowRight className="ml-2 w-5 h-5" />
                        </Link>
                    </div>
                </div>
            </section>
        </main>
    );
}
