'use client';
import Link from 'next/link';
import Image from "next/image";
import { usePathname } from 'next/navigation';
import { useState, useEffect } from 'react';
import { Menu, X, Phone, Mail, Clock, Lock, User, LogOut, ArrowRight } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';

const Header = () => {
    const [isOpen, setIsOpen] = useState(false);
    const pathname = usePathname();
    const [isScrolled, setIsScrolled] = useState(false);
    const [isMobile, setIsMobile] = useState(false);
    const { user, logout } = useAuth();

    const LOGO_SRC = "/logo.png";
    const isDashboardRoute =
        pathname?.startsWith("/patient") ||
        pathname?.startsWith("/doctor") ||
        pathname?.startsWith("/admin") ||
        pathname?.startsWith("/super-admin") ||
        pathname?.startsWith("/inventory") ||
        pathname?.startsWith("/register") ||
        pathname?.startsWith("/lab") ||
        pathname?.startsWith("/nurse") ||
        pathname?.startsWith("/pharmacy") ||
        pathname?.startsWith("/accountant") ||
        pathname?.startsWith("/hr") ||
        pathname?.startsWith("/insurance");

    useEffect(() => {
        const media = window.matchMedia("(max-width: 767px)");
        const sync = () => setIsMobile(Boolean(media.matches));
        sync();
        if (typeof media.addEventListener === "function") {
            media.addEventListener("change", sync);
            return () => media.removeEventListener("change", sync);
        }
        media.addListener(sync);
        return () => media.removeListener(sync);
    }, []);

    if (isDashboardRoute && isMobile) {
        return null;
    }

    useEffect(() => {
        const handleScroll = () => {
            if (window.scrollY > 0) {
                setIsScrolled(true);
            } else {
                setIsScrolled(false);
            }
        };

        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    const navItems = [
        { name: 'Home', href: '/' },
        { name: 'Specialities', href: '/specialities' },
        { name: 'Doctors', href: '/doctors' },
        { name: 'Blogs', href: '/blogs' },
        { name: 'Testimonials', href: '/testimonials' },
        { name: 'FAQ', href: '/faq' },
        { name: 'Contact Us', href: '/contact-us' },
    ];

    const isActive = (path) => pathname === path;

    const getDashboardPath = (role) => {
        if (!role) return '/';
        const roleLower = role.toLowerCase();

        switch (roleLower) {
            case 'super_admin':
            case 'superadmin':
            case 'super-admin':
                return '/super-admin';
            case 'doctor':
                return '/doctor';
            case 'admin':
            case 'hospital_admin':
            case 'administrator':
                return '/admin';
            case 'inventory':
            case 'inventory_manager':
            case 'inventorymanager':
                return '/inventory';
            case 'patient':
                return '/patient';
            case 'register':
            case 'receptionist':
                return '/register';
            case 'lab':
            case 'labtechnician':
                return '/lab';
            case 'nurse':
                return '/nurse';
            case 'pharmacy':
            case 'pharmacist':
                return '/pharmacy';
            default:
                return `/${roleLower}`;
        }
    };

    return (
        <header className="relative w-full z-50 sticky top-0 sm:top-[-70px] md:top-[-46px]">
            {/* Top Bar - Black background as per image */}
            <div className={`bg-black text-white py-2.5 transition-all duration-300 h-auto sm:h-[46px] ${isDashboardRoute ? "hidden md:block" : "block"}`}>
                <div className="w-full px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row justify-between items-start sm:items-center text-xs sm:text-sm font-medium gap-2 sm:gap-0">
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 sm:gap-6">
                        <div className="flex items-center gap-2 text-gray-300 hover:text-white transition-colors min-w-0">
                            <Mail size={14} className="text-[#0E82FD]" />
                            <span className="truncate max-w-[70vw] sm:max-w-none">info@example.com</span>
                        </div>
                        <div className="flex items-center gap-2 text-gray-300 hover:text-white transition-colors min-w-0">
                            <Phone size={14} className="text-[#0E82FD]" />
                            <span className="truncate max-w-[60vw] sm:max-w-none">+1 56654 65656</span>
                        </div>
                    </div>
                    <div className="flex items-center gap-2 text-gray-300 min-w-0">
                        <Clock size={14} className="text-[#0E82FD]" />
                        <span className="truncate max-w-[80vw] sm:max-w-none">Monday - Friday, 8 AM to 10 PM</span>
                    </div>
                </div>
            </div>

            {/* Main Navigation */}
            <div className={`bg-white border-b border-gray-100 transition-all duration-300 ${isScrolled ? 'shadow-md' : ''}`}>
                <div className="w-full px-4 sm:px-6 lg:px-8">
                    <div className="flex justify-between items-center h-16 sm:h-20 gap-3">
                        {/* Logo */}
                        <div className="flex-shrink-0 flex items-center min-w-0">
                            <Link href="/" className="flex items-center h-full min-w-0">
                                {isDashboardRoute ? (
                                    <span className="font-bold text-lg sm:text-2xl text-[#1B2559] flex items-center gap-2 min-w-0">
                                        <Image
                                            src={LOGO_SRC}
                                            alt="Medicore Vault"
                                            width={64}
                                            height={64}
                                            className="w-10 h-10 sm:w-[64px] sm:h-[64px] object-contain shrink-0"
                                            priority
                                            sizes="(max-width: 640px) 40px, 64px"
                                            unoptimized
                                        />
                                        <span className="truncate">Medicore vault</span>
                                    </span>
                                ) : (
                                    <Image
                                        src={LOGO_SRC}
                                        alt="Medicore Vault - Secure Care, Limitless Trust"
                                        width={180}
                                        height={70}
                                        className="block w-auto h-10 sm:h-[4.5rem] max-w-[62vw] sm:max-w-none object-contain object-left"
                                        priority
                                        sizes="(max-width: 640px) 185px, (max-width: 1024px) 210px, 235px"
                                        unoptimized
                                    />
                                )}
                            </Link>
                        </div>

                        {/* Desktop Navigation - Centered */}
                        <nav className="hidden lg:flex space-x-8">
                            {navItems.map((item) => (
                                <Link
                                    key={item.name}
                                    href={item.href}
                                    className={`text-[15px] font-semibold transition-colors duration-200 ${isActive(item.href)
                                        ? 'text-[#0E82FD]'
                                        : 'text-[#1B2559] hover:text-[#0E82FD]'
                                        }`}
                                >
                                    {item.name}
                                </Link>
                            ))}
                        </nav>

                        {/* Action Buttons */}
                        <div className="hidden lg:flex items-center space-x-4" suppressHydrationWarning>
                            {user ? (
                                <>
                                    <Link
                                        href={getDashboardPath(user.role)}
                                        className="flex items-center gap-2 px-5 py-2.5 text-[#1B2559] font-bold hover:text-[#0E82FD] transition-colors text-sm"
                                    >
                                        Go to Dashboard <ArrowRight size={16} />
                                    </Link>
                                    <button
                                        onClick={logout}
                                        className="flex items-center gap-2 px-5 py-2.5 bg-[#0E82FD] text-white font-bold rounded-[4px] hover:bg-blue-700 transition-colors text-sm"
                                    >
                                        <LogOut size={14} />
                                        Logout
                                    </button>
                                </>
                            ) : (
                                <>
                                    <Link
                                        href="/login"
                                        className="flex items-center gap-2 px-5 py-2.5 bg-[#1B2559] text-white font-bold rounded-[4px] hover:bg-[#2c3b8a] transition-colors text-sm"
                                        style={{ backgroundColor: '#1B2559' }}
                                    >
                                        <Lock size={14} />
                                        Sign In
                                    </Link>
                                    <Link
                                        href="/signup"
                                        className="flex items-center gap-2 px-5 py-2.5 bg-black text-white font-bold rounded-[4px] hover:bg-gray-800 transition-colors text-sm"
                                    >
                                        <User size={14} />
                                        Sign Up
                                    </Link>
                                </>
                            )}
                        </div>

                        {/* Mobile menu button */}
                        <div className="lg:hidden flex items-center shrink-0">
                            <button
                                onClick={() => setIsOpen(!isOpen)}
                                className="p-2 -mr-2 text-gray-600 hover:text-gray-900 focus:outline-none"
                            >
                                {isOpen ? <X size={24} /> : <Menu size={24} />}
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Mobile Navigation */}
            {isOpen && (
                <div className="lg:hidden bg-white border-t border-gray-100 relative w-full max-w-full shadow-xl overflow-x-hidden">
                    <div className="px-4 pt-2 pb-6 space-y-1">
                        {navItems.map((item) => (
                            <Link
                                key={item.name}
                                href={item.href}
                                onClick={() => setIsOpen(false)}
                                className={`block px-3 py-3 rounded-md text-base font-medium border-b border-gray-50 last:border-0 ${isActive(item.href)
                                    ? 'text-[#0E82FD] bg-blue-50'
                                    : 'text-gray-700 hover:text-[#0E82FD] hover:bg-gray-50'
                                    }`}
                            >
                                {item.name}
                            </Link>
                        ))}
                        <div className="mt-4 flex flex-col gap-3" suppressHydrationWarning>
                            {user ? (
                                <>
                                    <Link
                                        href={getDashboardPath(user.role)}
                                        onClick={() => setIsOpen(false)}
                                        className="flex items-center justify-center gap-2 w-full px-4 py-3 text-center text-[#1B2559] font-bold hover:text-[#0E82FD]"
                                    >
                                        Go to Dashboard
                                    </Link>
                                    <button
                                        onClick={() => {
                                            logout();
                                            setIsOpen(false);
                                        }}
                                        className="flex items-center justify-center gap-2 w-full px-4 py-3 text-center bg-[#0E82FD] text-white font-bold rounded-[4px] hover:bg-blue-700"
                                    >
                                        <LogOut size={14} />
                                        Logout
                                    </button>
                                </>
                            ) : (
                                <>
                                    <Link
                                        href="/login"
                                        onClick={() => setIsOpen(false)}
                                        className="flex items-center justify-center gap-2 w-full px-4 py-3 text-center bg-[#2e37a4] text-white font-bold rounded-[4px] hover:bg-blue-800"
                                    >
                                        <Lock size={14} />
                                        Sign In
                                    </Link>
                                    <Link
                                        href="/signup"
                                        onClick={() => setIsOpen(false)}
                                        className="flex items-center justify-center gap-2 w-full px-4 py-3 text-center bg-black text-white font-bold rounded-[4px] hover:bg-gray-800"
                                    >
                                        <User size={14} />
                                        Sign Up
                                    </Link>
                                </>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </header>
    );
};

export default Header;
