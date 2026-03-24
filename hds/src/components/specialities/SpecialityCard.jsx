import Link from 'next/link';
import { HeartPulse } from 'lucide-react'; // Default icon if none provided

const SpecialityCard = ({ title, count, icon, href = '/specialities' }) => {
    return (
        <Link
            href={href}
            className="group block bg-white rounded-2xl p-6 shadow-sm border border-gray-100 hover:shadow-xl hover:border-blue-100 transition-all duration-300 text-center"
        >
            <div className="w-20 h-20 mx-auto bg-blue-50 rounded-full flex items-center justify-center mb-6 group-hover:bg-blue-600 transition-colors duration-300 overflow-hidden">
                {icon ? (
                    typeof icon === 'string' ? (
                        <img src={icon} alt={title} className="w-10 h-10 object-contain" />
                    ) : (
                        <div className="text-blue-600 group-hover:text-white transition-colors duration-300">
                            {icon}
                        </div>
                    )
                ) : (
                    <HeartPulse className="w-10 h-10 text-blue-600 group-hover:text-white transition-colors duration-300" />
                )}
            </div>
            <h3 className="text-lg font-bold text-gray-900 mb-2 group-hover:text-blue-600 transition-colors">
                {title}
            </h3>
            <p className="text-sm text-gray-500 font-medium">
                {count} Doctors Available
            </p>
        </Link>
    );
};

export default SpecialityCard;
