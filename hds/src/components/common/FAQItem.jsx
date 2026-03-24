'use client';
import { useState } from 'react';
import { Minus, Plus } from 'lucide-react';

const FAQItem = ({ question, answer, isOpen, onClick }) => {
    return (
        <div className="border border-gray-200 rounded-xl overflow-hidden mb-4 transition-all duration-300 hover:border-blue-200 hover:shadow-sm bg-white">
            <button
                onClick={onClick}
                className="w-full flex items-center justify-between p-5 text-left bg-white focus:outline-none"
            >
                <span className={`font-bold text-lg ${isOpen ? 'text-blue-600' : 'text-gray-900'}`}>
                    {question}
                </span>
                <span className={`p-2 rounded-full transition-colors ${isOpen ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-500'}`}>
                    {isOpen ? <Minus size={18} /> : <Plus size={18} />}
                </span>
            </button>
            <div
                className={`transition-all duration-300 ease-in-out overflow-hidden ${isOpen ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'
                    }`}
            >
                <div className="p-5 pt-0 text-gray-600 leading-relaxed">
                    {answer}
                </div>
            </div>
        </div>
    );
};

export default FAQItem;
