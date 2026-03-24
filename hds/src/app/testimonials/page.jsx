
import TestimonialSlider from '@/components/common/TestimonialSlider';

export const metadata = {
    title: 'Testimonials | Preclinic',
    description: 'See what our patients have to say about us.',
};

export default function TestimonialsPage() {
    return (
        <div className="bg-gray-50 min-h-screen py-20">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="text-center mb-16">
                    <h1 className="text-4xl font-bold text-gray-900 mb-4">Patient Testimonials</h1>
                    <p className="text-gray-600 max-w-2xl mx-auto">
                        Read real stories from our patients about their experiences with Preclinic.
                    </p>
                </div>

                <div className="mt-12">
                    <TestimonialSlider />
                </div>
            </div>
        </div>
    );
}
