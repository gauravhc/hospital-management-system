/* eslint-disable @next/next/no-img-element */
import React from 'react';
import { API_URL } from '@/services/api';

const IDCard = ({ employee }) => {
    if (!employee) return null;

    return (
        <div className="w-[350px] h-[520px] bg-white rounded-xl shadow-lg overflow-hidden border border-gray-200 font-sans relative">
            {/* Background Pattern */}
            <div className="absolute top-0 left-0 w-full h-[180px] bg-blue-600 rounded-b-[50%] z-0"></div>

            <div className="relative z-10 flex flex-col items-center pt-8">
                {/* Logo / Header */}
                <div className="text-white text-center mb-4">
                    <h2 className="text-xl font-bold tracking-wide">HOSPITAL ERP</h2>
                </div>

                {/* Photo */}
                <div className="w-32 h-32 rounded-full border-4 border-white overflow-hidden shadow-md bg-gray-200">
                    {employee.photo ? (
                        <img
                            src={`${API_URL}${employee.photo}`}
                            alt={employee.name}
                            className="w-full h-full object-cover"
                            onError={(e) => { e.target.src = "https://via.placeholder.com/150?text=No+Image"; }}
                        />
                    ) : (
                        <div className="w-full h-full flex items-center justify-center text-gray-400 font-bold text-3xl">
                            {employee.name?.charAt(0)}
                        </div>
                    )}
                </div>

                {/* Name & Role */}
                <div className="text-center mt-4 px-4">
                    <h3 className="text-2xl font-bold text-gray-800 uppercase">{employee.name}</h3>
                    <p className="text-blue-600 font-semibold text-lg">{employee.role}</p>
                    <p className="text-gray-500 text-sm mt-1">{employee.department}</p>
                </div>

                {/* Details ID */}
                <div className="mt-8 w-full px-8 space-y-3 text-sm">
                    <div className="flex justify-between border-b pb-1">
                        <span className="text-gray-500 font-medium">ID No:</span>
                        <span className="text-gray-900 font-bold">{employee.employee_id || 'N/A'}</span>
                    </div>
                    <div className="flex justify-between border-b pb-1">
                        <span className="text-gray-500 font-medium">Phone:</span>
                        <span className="text-gray-900 font-semibold">{employee.mobile}</span>
                    </div>
                    <div className="flex justify-between border-b pb-1">
                        <span className="text-gray-500 font-medium">Join Date:</span>
                        <span className="text-gray-900 font-semibold">{employee.join_date || 'N/A'}</span>
                    </div>
                    <div className="flex justify-between border-b pb-1">
                        <span className="text-gray-500 font-medium">Blood Group:</span>
                        <span className="text-gray-900 font-semibold">{employee.blood_group || 'N/A'}</span>
                    </div>
                </div>

                {/* Footer Bar */}
                <div className="absolute bottom-0 w-full bg-gray-100 py-3 flex justify-center border-t">
                    <p className="text-xs text-center text-gray-500">
                        If found, please return to Administration.<br />
                        www.hospital-erp.com
                    </p>
                </div>
            </div>
        </div>
    );
};

export default IDCard;
