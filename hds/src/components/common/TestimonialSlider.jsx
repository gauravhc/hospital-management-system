'use client';
import { useState } from 'react';
import { ChevronLeft, ChevronRight, Quote } from 'lucide-react';

const TestimonialSlider = () => {
    const testimonials = [
        {
            id: 1,
            name: 'Joan Wilson',
            role: 'Patient',
            image: '/images/patient1.jpg', // Replace with valid path
            text: 'I have suffered from a heart condition for a long time, but with the help of the doctors here, I have been able to manage my condition. The care I received was exceptional.',
        },
        {
            id: 2,
            name: 'Robert Davis',
            role: 'Patient',
            image: '/images/patient2.jpg',
            text: 'The facilities at Preclinic are top-notch. The staff is very friendly and professional. I would highly recommend this clinic to anyone looking for quality healthcare.',
        },
        {
            id: 3,
            name: 'Emily Clark',
            role: 'Patient',
            image: '/images/patient3.jpg',
            text: 'Booking an appointment was seamless and the online consultation feature saved me a lot of time. The doctor was very attentive and prescribed the right medication.',
        },
    ];

    const [currentIndex, setCurrentIndex] = useState(0);

    const prevSlide = () => {
        setCurrentIndex((prev) => (prev === 0 ? testimonials.length - 1 : prev - 1));
    };

    const nextSlide = () => {
        setCurrentIndex((prev) => (prev === testimonials.length - 1 ? 0 : prev + 1));
    };

    return (
        <div className="relative bg-white rounded-3xl p-8 md:p-12 shadow-lg border border-gray-100 max-w-4xl mx-auto">
            <div className="absolute top-8 left-8 text-blue-100">
                <Quote size={80} fill="currentColor" />
            </div>

            <div className="relative z-10 text-center px-4 md:px-12">
                <p className="text-xl md:text-2xl text-gray-700 italic mb-8 leading-relaxed">
                    "{testimonials[currentIndex].text}"
                </p>

                <div className="flex flex-col items-center">
                    <div className="w-16 h-16 rounded-full overflow-hidden border-4 border-blue-50 mb-3 shadow-sm">
                        <img
                            src={testimonials[currentIndex].image}
                            alt={testimonials[currentIndex].name}
                            className="w-full h-full object-cover"
                            onError={(e) => {
                                e.target.onerror = null;
                                e.target.src = "https://ui-avatars.com/api/?name=" + testimonials[currentIndex].name + "&background=random";
                            }}
                        />
                    </div>
                    <h4 className="text-lg font-bold text-gray-900">{testimonials[currentIndex].name}</h4>
                    <p className="text-sm text-blue-600 font-medium">{testimonials[currentIndex].role}</p>
                </div>
            </div>

            <div className="flex justify-center gap-4 mt-8">
                <button
                    onClick={prevSlide}
                    className="p-2 rounded-full border border-gray-300 text-gray-500 hover:bg-blue-600 hover:text-white hover:border-blue-600 transition-all focus:outline-none"
                    aria-label="Previous testimonial"
                >
                    <ChevronLeft size={24} />
                </button>
                <button
                    onClick={nextSlide}
                    className="p-2 rounded-full border border-gray-300 text-gray-500 hover:bg-blue-600 hover:text-white hover:border-blue-600 transition-all focus:outline-none"
                    aria-label="Next testimonial"
                >
                    <ChevronRight size={24} />
                </button>
            </div>

            <div className="flex justify-center gap-2 mt-6">
                {testimonials.map((_, index) => (
                    <button
                        key={index}
                        onClick={() => setCurrentIndex(index)}
                        className={`w-2.5 h-2.5 rounded-full transition-all ${index === currentIndex ? 'bg-blue-600 w-6' : 'bg-gray-300 hover:bg-blue-400'
                            }`}
                        aria-label={`Go to slide ${index + 1}`}
                    />
                ))}
            </div>
        </div>
    );
};

export default TestimonialSlider;
