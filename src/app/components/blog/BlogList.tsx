"use client";

import React, { useState } from "react";
import { BlogCard } from "../reuseableUI/blogCard";
import ReactPaginate from "react-paginate";
import { ChevronDownIcon } from "@/app/utils/svgs/chevronDownIcon";

interface BlogPost {
  id: string;
  title: string;
  slug: string;
  excerpt?: string;
  date?: string;
  metadata?: Array<{
    key?: string | null;
    value?: string | null;
  } | null>;
}

interface BlogListProps {
  blogs: BlogPost[];
  pageSize?: number;
  pageRoute?: string;
}

export default function BlogList({
  blogs,
  pageSize = 9,
  pageRoute,
}: BlogListProps) {
  const [currentPage, setCurrentPage] = useState(0);
  const totalPages = Math.ceil(blogs.length / pageSize);
  // Get current page blogs
  const startIndex = currentPage * pageSize;
  const endIndex = startIndex + pageSize;
  const currentBlogs = blogs.slice(startIndex, endIndex);

  const handlePageChange = ({ selected }: { selected: number }) => {
    setCurrentPage(selected);
    // Scroll to top of blog grid
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  if (blogs.length === 0) {
    return (
      <div className="w-full rounded-md border border-[var(--color-secondary-800)]/20 bg-[var(--color-secondary-900)]/20 p-6">
        <h2 className="text-xl font-semibold mb-2">No blogs available</h2>
        <p className="text-sm text-[var(--color-secondary-400)]">
          Check back later for new blog posts.
        </p>
      </div>
    );
  }

  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 w-full">
        {currentBlogs.map((blog) => (
          <BlogCard
            pageRoute={pageRoute}
            key={blog.id}
            id={blog.id}
            title={blog.title}
            slug={blog.slug}
            excerpt={blog.excerpt}
            date={blog.date}
            metadata={blog.metadata}
          />
        ))}
      </div>

      {totalPages > 1 && (
        <div className="flex justify-center items-center w-full">
          <ReactPaginate
            pageCount={totalPages}
            forcePage={currentPage}
            onPageChange={handlePageChange}
            marginPagesDisplayed={1}
            pageRangeDisplayed={2}
            previousLabel={
              <p className="flex items-center gap-1">
                <span className="size-5 text-black rotate-90">
                  {ChevronDownIcon}
                </span>
                Prev
              </p>
            }
            nextLabel={
              <p className="flex items-center gap-1 !text-[var(--color-secondary-600)] font-semibold">
                Next
                <span className="size-5 -rotate-90">{ChevronDownIcon}</span>
              </p>
            }
            renderOnZeroPageCount={undefined}
            containerClassName="flex items-center justify-center gap-2 font-secondary"
            pageClassName="list-none"
            pageLinkClassName="px-3 py-2 !text-base cursor-pointer bg-[var(--color-secondary-200)] text-gray-900 hover:opacity-80"
            previousClassName="list-none"
            previousLinkClassName="px-3 py-2 !text-base cursor-pointer bg-[var(--color-secondary-200)] text-gray-700 hover:opacity-80 flex items-center gap-1"
            nextClassName="list-none"
            nextLinkClassName="px-3 py-2 !text-base cursor-pointer bg-[var(--color-secondary-200)] text-gray-700 hover:opacity-80 flex items-center gap-1"
            activeClassName="list-none"
            activeLinkClassName="px-3 py-2 !text-base !bg-[var(--color-primary-600)] text-white border border-[var(--color-primary-600)]"
            disabledClassName="opacity-50 pointer-events-none"
            breakLabel={"..."}
            breakLinkClassName="px-2 !text-base text-gray-500"
          />
        </div>
      )}
    </>
  );
}
