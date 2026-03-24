'use client';
import Link from 'next/link';
import { Calendar, User } from 'lucide-react';

const BlogCard = ({ blog }) => {
    const { title, summary, image, date, author, category, slug } = blog;

    return (
        <article className="bg-white rounded-2xl overflow-hidden border border-gray-100 shadow-sm hover:shadow-xl transition-all duration-300 group flex flex-col h-full">
            <div className="relative h-56 overflow-hidden bg-gray-100">
                <img
                    src={image || "/images/blog-placeholder.jpg"}
                    alt={title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    onError={(e) => {
                        e.target.onerror = null;
                        e.target.parentElement.innerHTML = '<div class="w-full h-full bg-gray-200 flex items-center justify-center text-gray-400">Blog Image</div>';
                    }}
                />
                <div className="absolute top-4 left-4 bg-blue-600 text-white text-xs font-bold px-3 py-1.5 rounded-full uppercase tracking-wide">
                    {category}
                </div>
            </div>

            <div className="p-6 flex flex-col flex-grow">
                <div className="flex items-center gap-4 text-xs text-gray-500 mb-4">
                    <div className="flex items-center gap-1">
                        <User size={14} className="text-blue-500" />
                        <span>{author}</span>
                    </div>
                    <div className="flex items-center gap-1">
                        <Calendar size={14} className="text-blue-500" />
                        <span>{date}</span>
                    </div>
                </div>

                <h3 className="text-xl font-bold text-gray-900 mb-3 leading-snug group-hover:text-blue-600 transition-colors">
                    <Link href={`/blogs/${slug}`}>
                        {title}
                    </Link>
                </h3>

                <p className="text-gray-600 text-sm leading-relaxed mb-6 flex-grow line-clamp-3">
                    {summary}
                </p>

                <div className="mt-auto">
                    <Link
                        href={`/blogs/${slug}`}
                        className="inline-flex items-center text-blue-600 font-semibold text-sm hover:gap-2 transition-all"
                    >
                        Read More <span className="text-lg ml-1">→</span>
                    </Link>
                </div>
            </div>
        </article>
    );
};

export default BlogCard;
