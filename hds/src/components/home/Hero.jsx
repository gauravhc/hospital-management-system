import { Search, MapPin, ArrowRight, Heart } from 'lucide-react';
import AppointmentForm from './AppointmentForm';
import Link from 'next/link';

const Hero = () => {
  return (
    <section className="relative pt-10 pb-20 lg:pt-16 lg:pb-32 overflow-hidden bg-gradient-to-br from-[#F2F6F9] to-white">
      {/* Background decoration */}
      <div className="absolute top-0 right-0 w-1/2 h-full bg-blue-50/50 -skew-x-12 transform origin-top-right z-0"></div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          {/* Text Content */}
          <div>
            <div className="inline-flex items-center gap-2 bg-white px-4 py-2 rounded-full shadow-sm mb-6 border border-gray-100">
              <Heart className="w-4 h-4 text-red-500 fill-current" />
              <span className="text-sm font-semibold text-gray-600">#1 Medical Clinic in your Location</span>
            </div>

            <h1 className="text-4xl md:text-5xl lg:text-[64px] font-bold text-[#1B2559] leading-[1.1] mb-6">
              Bringing Quality <br />
              <span className="text-[#0E82FD]">Healthcare</span> Services <br />
              To You
            </h1>

            <p className="text-gray-500 text-lg mb-10 max-w-lg leading-relaxed">
              Delivering Comprehensive Health Support through our innovative platform that Seamlessly Connects your terms.
            </p>

            <div className="flex flex-col sm:flex-row gap-4">
              <Link
                href="/doctors"
                className="px-8 py-4 bg-[#1B2559] text-white font-bold rounded-lg hover:bg-[#2a377d] transition-colors flex items-center justify-center gap-2"
              >
                View All Doctors <ArrowRight size={18} />
              </Link>
              <Link
                href="/signup"
                className="px-8 py-4 bg-white text-[#1B2559] border border-gray-200 font-bold rounded-lg hover:bg-gray-50 transition-colors flex items-center justify-center gap-2"
              >
                Get Started <ArrowRight size={18} />
              </Link>
            </div>
          </div>

          {/* Right Content - Appointment Form */}
          <div className="relative flex justify-center lg:justify-end">
            <AppointmentForm />
          </div>
        </div>
      </div>
    </section>
  );
};

export default Hero;
