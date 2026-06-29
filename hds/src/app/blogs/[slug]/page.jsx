import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import { Calendar, User } from "lucide-react";
import { blogs } from "@/data/mockData";

export async function generateMetadata({ params }) {
  const { slug } = await params;
  const blog = blogs.find((item) => item.slug === slug);

  if (!blog) {
    return {
      title: "Blog Not Found | Preclinic",
    };
  }

  return {
    title: `${blog.title} | Preclinic`,
    description: blog.summary,
  };
}

export default async function BlogDetailPage({ params }) {
  const { slug } = await params;
  const blog = blogs.find((item) => item.slug === slug);

  if (!blog) notFound();

  return (
    <main className="min-h-screen bg-white py-20">
      <article className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
        <Link href="/blogs" className="mb-8 inline-flex font-semibold text-blue-600 hover:underline">
          Back to Blogs
        </Link>

        <div className="mb-8 overflow-hidden rounded-2xl bg-gray-100">
          <Image
            src={blog.image}
            alt={blog.title}
            width={900}
            height={500}
            className="h-72 w-full object-cover md:h-96"
            priority
          />
        </div>

        <div className="mb-5 flex flex-wrap items-center gap-4 text-sm text-gray-500">
          <span className="rounded-full bg-blue-600 px-3 py-1 text-xs font-bold uppercase tracking-wide text-white">
            {blog.category}
          </span>
          <span className="inline-flex items-center gap-2">
            <User className="h-4 w-4 text-blue-500" />
            {blog.author}
          </span>
          <span className="inline-flex items-center gap-2">
            <Calendar className="h-4 w-4 text-blue-500" />
            {blog.date}
          </span>
        </div>

        <h1 className="mb-6 text-4xl font-bold leading-tight text-[#1B2559]">{blog.title}</h1>
        <div className="space-y-5 text-lg leading-relaxed text-gray-600">
          <p>{blog.summary}</p>
          <p>
            Healthcare teams work best when patients can access care, records, and
            updates without confusion. Medicore Vault keeps the appointment journey,
            clinical notes, lab reports, pharmacy requests, and billing workflows connected.
          </p>
          <p>
            This helps patients receive clearer communication while care teams spend
            less time switching between disconnected tools.
          </p>
        </div>
      </article>
    </main>
  );
}
