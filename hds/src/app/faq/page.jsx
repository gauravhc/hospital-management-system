'use client';
import { useState } from 'react';
import FAQItem from '@/components/common/FAQItem';
import { faqs } from '@/data/mockData';

// Metadata can't be exported from client component, so we omit or separate it.
// Ideally for SEO page.jsx should be server, but FAQItem interaction needs client wrapper or the page itself client.
// We'll keep page client for simplicity here as we manage state for opening items.
// Alternative: Move state to a wrapper component.

export default function FAQPage() {
    const [openFAQ, setOpenFAQ] = useState(0);

    return (
        <div className="bg-white min-h-screen py-20">
            <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="text-center mb-16">
                    <h1 className="text-4xl font-bold text-gray-900 mb-4">Frequency Asked Questions</h1>
                    <p className="text-gray-600 max-w-2xl mx-auto">
                        Find answers to common questions about our services and policies.
                    </p>
                </div>

                <div className="space-y-4">
                    {faqs.map((faq, index) => (
                        <FAQItem
                            key={index}
                            question={faq.question}
                            answer={faq.answer}
                            isOpen={openFAQ === index}
                            onClick={() => setOpenFAQ(index === openFAQ ? -1 : index)}
                        />
                    ))}
                </div>
            </div>
        </div>
    );
}
