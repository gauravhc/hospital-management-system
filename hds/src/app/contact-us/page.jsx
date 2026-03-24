
import ContactForm from '@/components/contact/ContactForm';
import { MapPin, Phone, Mail } from 'lucide-react';

export const metadata = {
    title: 'Contact Us | Preclinic',
    description: 'Get in touch with us.',
};

export default function ContactUsPage() {
    return (
        <div className="bg-gray-50 min-h-screen py-20">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="text-center mb-16">
                    <h1 className="text-4xl font-bold text-gray-900 mb-4">Contact Us</h1>
                    <p className="text-gray-600 max-w-2xl mx-auto">
                        Have questions? We are here to help. Send us a message or visit us.
                    </p>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
                    <div className="lg:col-span-1 space-y-8">
                        <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100 flex items-start gap-4">
                            <div className="bg-blue-100 p-3 rounded-lg text-blue-600">
                                <MapPin size={24} />
                            </div>
                            <div>
                                <h3 className="font-bold text-gray-900 mb-2">Our Location</h3>
                                <p className="text-gray-600 leading-relaxed">
                                    3556 Beech Street, San Francisco,<br /> California, CA 94108
                                </p>
                            </div>
                        </div>

                        <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100 flex items-start gap-4">
                            <div className="bg-blue-100 p-3 rounded-lg text-blue-600">
                                <Phone size={24} />
                            </div>
                            <div>
                                <h3 className="font-bold text-gray-900 mb-2">Phone Number</h3>
                                <p className="text-gray-600">
                                    +1 315 369 5943
                                </p>
                            </div>
                        </div>

                        <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100 flex items-start gap-4">
                            <div className="bg-blue-100 p-3 rounded-lg text-blue-600">
                                <Mail size={24} />
                            </div>
                            <div>
                                <h3 className="font-bold text-gray-900 mb-2">Email Address</h3>
                                <p className="text-gray-600">
                                    preclinic@example.com
                                </p>
                            </div>
                        </div>
                    </div>

                    <div className="lg:col-span-2">
                        <ContactForm />
                    </div>
                </div>
            </div>
        </div>
    );
}
