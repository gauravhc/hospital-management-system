import Link from 'next/link';
import { Facebook, Twitter, Instagram, Linkedin, Mail, Phone, MapPin, Send } from 'lucide-react';

const Footer = () => {
    return (
        <footer className="bg-[#1B2559] text-white pt-20 pb-8">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12 mb-16">
                    {/* Brand Info */}
                    <div>
                        <Link href="/" className="flex items-center gap-2 mb-6">
                            <div className="w-10 h-10 bg-[#0E82FD] rounded-full flex items-center justify-center text-white">
                                <span className="font-bold text-xl">+</span>
                            </div>
                            <span className="font-bold text-2xl text-white">Dscape.AI</span>
                        </Link>
                        <p className="text-gray-400 mb-8 leading-relaxed">
                            Accessible & Reliable Healthcare Simplified. We provide the best medical services with top-notch facilities and expert doctors.
                        </p>
                        <div className="flex space-x-3">
                            {[Facebook, Twitter, Instagram, Linkedin].map((Icon, index) => (
                                <a
                                    key={index}
                                    href="#"
                                    className="w-10 h-10 rounded-full border border-gray-700 flex items-center justify-center text-gray-400 hover:bg-[#0E82FD] hover:border-[#0E82FD] hover:text-white transition-all duration-300"
                                >
                                    <Icon size={18} />
                                </a>
                            ))}
                        </div>
                    </div>

                    {/* Explore Pages */}
                    <div>
                        <h3 className="text-lg font-bold mb-6 text-white">Explore Pages</h3>
                        <ul className="space-y-4">
                            {[
                                { name: 'Home', href: '/' },
                                { name: 'Specialities', href: '/specialities' },
                                { name: 'Doctors', href: '/doctors' },
                                { name: 'Services', href: '/services' },
                                { name: 'Blogs', href: '/blogs' },
                                { name: 'Contact Us', href: '/contact-us' },
                            ].map((link) => (
                                <li key={link.name}>
                                    <Link
                                        href={link.href}
                                        className="text-gray-400 hover:text-[#0E82FD] transition-colors flex items-center gap-2 group"
                                    >
                                        <span className="w-1.5 h-1.5 bg-[#0E82FD] rounded-full opacity-0 group-hover:opacity-100 transition-opacity"></span>
                                        {link.name}
                                    </Link>
                                </li>
                            ))}
                        </ul>
                    </div>

                    {/* Contact Info */}
                    <div>
                        <h3 className="text-lg font-bold mb-6 text-white">Contact Info</h3>
                        <ul className="space-y-6">
                            <li className="flex items-start gap-4">
                                <div className="mt-1 w-10 h-10 rounded-full bg-gray-800 flex items-center justify-center flex-shrink-0 text-[#0E82FD]">
                                    <MapPin size={18} />
                                </div>
                                <div>
                                    <p className="font-medium text-white mb-1">Address</p>
                                    <p className="text-gray-400 text-sm">
                                        3556 Beech Street, San Francisco,<br /> California, CA 94108
                                    </p>
                                </div>
                            </li>
                            <li className="flex items-start gap-4">
                                <div className="mt-1 w-10 h-10 rounded-full bg-gray-800 flex items-center justify-center flex-shrink-0 text-[#0E82FD]">
                                    <Phone size={18} />
                                </div>
                                <div>
                                    <p className="font-medium text-white mb-1">Phone</p>
                                    <p className="text-gray-400 text-sm">+1 315 369 5943</p>
                                </div>
                            </li>
                            <li className="flex items-start gap-4">
                                <div className="mt-1 w-10 h-10 rounded-full bg-gray-800 flex items-center justify-center flex-shrink-0 text-[#0E82FD]">
                                    <Mail size={18} />
                                </div>
                                <div>
                                    <p className="font-medium text-white mb-1">Email</p>
                                    <p className="text-gray-400 text-sm">preclinic@example.com</p>
                                </div>
                            </li>
                        </ul>
                    </div>

                    {/* Newsletter - New column from reference */}
                    <div>
                        <h3 className="text-lg font-bold mb-6 text-white">Subscribe For Newsletter</h3>
                        <div className="bg-gray-800 p-1 rounded-lg flex items-center mb-4 border border-gray-700 focus-within:border-[#0E82FD] transition-colors">
                            <input type="email" placeholder="Enter Email Address" className="bg-transparent text-sm w-full px-4 text-white outline-none placeholder-gray-500" />
                            <button className="bg-[#0E82FD] w-10 h-10 rounded-md flex items-center justify-center text-white hover:bg-blue-600 transition-colors">
                                <Send size={18} />
                            </button>
                        </div>
                        <p className="text-gray-500 text-xs mb-4">You can unsubscribe any time you want.</p>

                        <h4 className="text-white font-bold mb-3">Accepted Payment Method</h4>
                        <div className="flex gap-2 opacity-70">
                            {/* Payment placeholders */}
                            <div className="w-10 h-6 bg-white rounded"></div>
                            <div className="w-10 h-6 bg-white rounded"></div>
                            <div className="w-10 h-6 bg-white rounded"></div>
                            <div className="w-10 h-6 bg-white rounded"></div>
                        </div>
                    </div>
                </div>

                <div className="border-t border-gray-800 pt-8 flex flex-col md:flex-row justify-between items-center gap-4">
                    <p className="text-gray-500 text-sm">
                        Copyright © {new Date().getFullYear()} Dscape.AI. All rights reserved.
                    </p>
                    <div className="flex space-x-6 text-sm text-gray-500">
                        <Link href="#" className="hover:text-white transition-colors">Privacy Policy</Link>
                        <Link href="#" className="hover:text-white transition-colors">Terms & Conditions</Link>
                        <Link href="#" className="hover:text-white transition-colors">Refund Policy</Link>
                    </div>
                </div>
            </div>
        </footer>
    );
};

export default Footer;
