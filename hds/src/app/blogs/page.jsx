
import BlogCard from '@/components/blog/BlogCard';
import { blogs } from '@/data/mockData';

export const metadata = {
    title: 'Blogs | Preclinic',
    description: 'Read the latest health news and articles.',
};

export default function BlogsPage() {
    return (
        <div className="bg-white min-h-screen py-20">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="text-center mb-16">
                    <h1 className="text-4xl font-bold text-gray-900 mb-4">Blogs & News</h1>
                    <p className="text-gray-600 max-w-2xl mx-auto">
                        Stay informed with our latest articles on health and wellness.
                    </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
                    {blogs.map((blog, index) => (
                        <BlogCard key={index} blog={blog} />
                    ))}
                </div>
            </div>
        </div>
    );
}
