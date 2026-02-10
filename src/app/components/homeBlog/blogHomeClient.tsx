"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import PrimaryButton from "../reuseableUI/primaryButton";

interface BlogPost {
  id: string;
  title: string;
  slug: string;
  excerpt: string;
  date: string;
  metadata?: Array<{
    key?: string | null;
    value?: string | null;
  } | null>;
}

export const BlogClientSection = ({ blogs }: { blogs: BlogPost[] }) => {
  const [activeFilter, setActiveFilter] = useState("All News");
  const [imageErrors, setImageErrors] = useState<Record<string, boolean>>({});
  const [imageLoaded, setImageLoaded] = useState<Record<string, boolean>>({});

  // Extract topic from metadata
  const getTopic = (blog: BlogPost): string => {
    const topicMeta = blog.metadata?.find((m) => m?.key === "topic");
    return topicMeta?.value || "News";
  };

  // Extract image URL from metadata
  const getImageUrl = (blog: BlogPost): string => {
    const imageMeta = blog.metadata?.find((m) => m?.key === "image-url");
    return imageMeta?.value || "/no-image-avail-large.png";
  };

  // Handle image error
  const handleImageError = (blogId: string) => {
    setImageErrors((prev) => ({ ...prev, [blogId]: true }));
  };

  // Handle image load
  const handleImageLoad = (blogId: string) => {
    setImageLoaded((prev) => ({ ...prev, [blogId]: true }));
  };

  // Get unique topics for filters
  const topics = ["All News", ...new Set(blogs.map(getTopic))];

  // Filter blogs based on active filter
  const filteredBlogs =
    activeFilter === "All News"
      ? blogs
      : blogs.filter((blog) => getTopic(blog) === activeFilter);

  return (
    <div className="max-w-7xl mx-auto px-4 py-6 lg:pt-12 col-span-2 2xl:col-span-1">
      {/* Header */}
      <div className="text-center mb-8 border border-black w-fit px-6 py-1 rounded transform-[skew(172deg)]">
        <h1 className="text-xl font-secondary font-normal text-gray-900">
          Latest <span className="font-semibold">News & Events</span>
        </h1>
      </div>

      {/* Blog Posts Grid */}
      <div className="space-y-4">
        {filteredBlogs.slice(0, 3).map((blog) => (
          <div
            key={blog.id}
            className="flex flex-col md:flex-row gap-3 bg-white border-b border-gray-300 "
          >
            {/* Image */}
            {/* <div className="flex-shrink-0 relative w-fit">
              {!imageLoaded[blog.id] && (
                <div className="absolute inset-0 bg-gray-200 animate-pulse flex items-center justify-center">
                  <span className="size-10 border-t border-zinc-600 animate-spin rounded-full" />
                </div>
              )}
              <Image
                width={0}
                height={0}
                quality={85}
                sizes="100vw"
                src={
                  imageErrors[blog.id]
                    ? "/no-image-avail-large.png"
                    : getImageUrl(blog)
                }
                alt={blog.title}
                className={`w-10 h-12 object-cover transition-opacity duration-300 ${
                  imageLoaded[blog.id] ? "opacity-100" : "opacity-0"
                }`}
                onError={() => handleImageError(blog.id)}
                onLoad={() => handleImageLoad(blog.id)}
              />
            </div> */}
            <div className="w-10 h-14 bg-black text-white font-medium text-center text-xs rounded flex items-center">{blog.date}</div>

            {/* Content */}
            <div className="flex-1space-y-3 flex flex-col justify-between">
              <div className="space-y-1">
                {/* Title */}
                <h2 className="text-xl font-bold text-gray-900">
                  {blog.title}
                </h2>

                {/* Excerpt */}
                <p className="text-gray-600 mb-6 line-clamp-3 text-sm">
                  {blog.excerpt}{" "}
                  <Link href={`/blog/${blog.slug}`}>
                    <span className="font-secondary text-xs text-blue-500 hover:underline">Read More</span>
                  </Link>
                </p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
