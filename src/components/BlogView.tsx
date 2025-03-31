"use client";

import React, { useEffect, useState } from "react";
import { useMediaQuery } from "react-responsive";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import Link from "next/link";
import { AppRouterInstance } from "next/dist/shared/lib/app-router-context.shared-runtime";
import { fetchPage, Page } from "@/services/gitlabServices";

type Blog = {
  title: string;
  description: string;
  image: string;
  tags: string[];
  path: string;
  date: string;
};
interface BlogViewProps {
  selectedTag: string | null;
  page: number;
  router: AppRouterInstance;
}

const BlogCard = ({
  blog,
  isMobile,
  handleCardClick,
}: {
  blog: Blog;
  isMobile: boolean;
  handleCardClick: (title: string) => void;
}) => (
  <Card
    className={`flex ${
      isMobile ? "flex-col h-auto" : "flex-row items-center h-[244px]"
    } px-3 bg-[#171717] border border-black shadow-md hover:cursor-pointer transition-transform duration-300 hover:scale-[101.5%] hover:shadow-xl`}
    onClick={() => handleCardClick(blog.path)}
  >
    <div
      className={`${
        isMobile ? "w-full h-40 mt-3" : "w-1/3 min-w-[150px] h-[90%]"
      } flex-shrink-0`}
    >
      <img
        src={blog.image}
        alt={blog.title}
        className="w-full h-full object-cover rounded-sm"
      />
    </div>

    <CardContent className={`w-full ${!isMobile && "md:w-2/3 md:pl-4"}`}>
      <CardHeader className={isMobile ? "px-0 pt-3" : ""}>
        <CardTitle className="text-xl font-bold text-white">
          {blog.title}
        </CardTitle>
        <p className="text-xs text-gray-400">{blog.date}</p>
      </CardHeader>
      <p
        className={`text-gray-300 text-sm line-clamp-2 ${!isMobile && "ml-6"}`}
      >
        {blog.description}
      </p>

      <div className="mt-2 ml-6 flex flex-wrap gap-2">
        {blog.tags.map((tag, i) => (
          <Link
            key={i}
            href={`/blog?tag=${encodeURIComponent(tag)}&page=1`}
            onClick={(e) => e.stopPropagation()}
          >
            <span className="px-2 py-0.5 bg-yellow-700 text-white rounded-full text-xs cursor-pointer hover:bg-yellow-600 transition-colors">
              {tag}
            </span>
          </Link>
        ))}
      </div>
    </CardContent>
  </Card>
);

export default function BlogView({ selectedTag, page, router }: BlogViewProps) {
  const [data, setData] = useState<Page | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const isMobile = useMediaQuery({ maxWidth: 480 });

  const handleCardClick = (title: string) => {
    const formattedTitle = title.replace(/\s+/g, "-");
    router.push(`/blog/${formattedTitle}`);
  };

  useEffect(() => {
    setLoading(true);
    setError(null);
    fetchPage(page, selectedTag)
      .then((res) => {
        setData(res);
        setLoading(false);
      })
      .catch((err) => {
        console.error(err);
        setError("you need a proxy :)");
        setLoading(false);
      });
  }, [selectedTag, page]);

  if (loading) {
    return (
      <div className="grid w-full max-w-[1200px] self-center grid-cols-1 md:grid-cols-2 gap-4 bg-black p-4">
        {Array.from({ length: 6 }).map((_, index) => (
          <div
            key={index}
            className={`animate-pulse flex ${
              isMobile ? "flex-col" : "flex-row"
            } items-center px-3 bg-[#171717] border border-black shadow-md ${
              isMobile ? "h-auto py-3" : "h-[188px]"
            } rounded-md`}
          >
            <div
              className={`${
                isMobile ? "w-full h-40" : "w-1/3 h-[90%]"
              } bg-gray-700 rounded-sm`}
            ></div>
            <div
              className={`w-full ${isMobile ? "mt-4" : "md:pl-4"} space-y-2`}
            >
              <div className="h-6 bg-gray-700 rounded w-3/4"></div>
              <div className="h-4 bg-gray-700 rounded w-1/2"></div>
              <div className="h-4 bg-gray-700 rounded w-full"></div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-red-500 text-center py-8 bg-black">
        <p>{error}</p>
      </div>
    );
  }

  if (!data || data.blogs.length === 0) {
    return (
      <div className="text-gray-500 text-center py-8 bg-black">
        <p>No blogs found.</p>
      </div>
    );
  }

  return (
    <div className="grid w-full max-w-[1200px] self-center grid-cols-1 md:grid-cols-2 gap-4 bg-black p-4">
      {data.blogs.map((blog: Blog, index: number) => (
        <BlogCard
          key={index}
          blog={blog}
          isMobile={isMobile}
          handleCardClick={handleCardClick}
        />
      ))}
    </div>
  );
}
