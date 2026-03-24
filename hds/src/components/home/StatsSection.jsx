'use client';

const StatsSection = () => {
    const stats = [
        { value: '10000+', label: 'Happy People' },
        { value: '8954+', label: 'Appointment Completed' },
        { value: '1000+', label: 'Expert Doctors & Team' },
        { value: '9658+', label: 'Total Patients Enrolled' },
    ];

    return (
        <section className="py-20 bg-[#0E82FD]">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center divide-x divide-blue-400/30">
                    {stats.map((stat, index) => (
                        <div key={index} className="p-4">
                            <h3 className="text-4xl md:text-5xl font-bold text-white mb-2">{stat.value}</h3>
                            <p className="text-blue-100 font-medium text-lg">{stat.label}</p>
                        </div>
                    ))}
                </div>
            </div>
        </section>
    );
};

export default StatsSection;
