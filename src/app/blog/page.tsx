"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import BlogPageTagsDropdown from "@/components/BlogPageTagsDropdown";
import BlogView from "@/components/BlogView";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { BlogDetails, fetchDetails } from "@/services/gitlabServices";
import React from "react";

export default function BlogPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  // Initialize state from query parameters (if available)
  const initialTag = searchParams.get("tag") || null;
  const initialPage = parseInt(searchParams.get("page") || "1", 10);

  const [selectedTag, setSelectedTag] = useState<string | null>(initialTag);
  const [selectedPage, setSelectedPage] = useState<number>(initialPage);

  // State for blog details
  const [blogDetails, setBlogDetails] = useState<BlogDetails | null>(null);

  // Fetch blog details on mount
  useEffect(() => {
    fetchDetails()
      .then((data) => {
        setBlogDetails(data);
        console.log(data);
      })
      .catch((error) => {
        console.error("Error fetching blog details:", error);
      });
  }, []);

  // Compute total pages based on the fetched blog details
  const totalPages =
    blogDetails &&
    (selectedTag
      ? blogDetails.tags.find((tag) => tag.name === selectedTag)
          ?.number_of_pages || 0
      : blogDetails.number_of_pages);
  const pages = totalPages
    ? Array.from({ length: totalPages }, (_, i) => i + 1)
    : [];
  const visiblePages = pages.filter(
    (pageNumber) =>
      pageNumber === 1 ||
      pageNumber === totalPages ||
      (pageNumber >= selectedPage - 2 && pageNumber <= selectedPage + 2)
  );
  const updateQueryParams = (tag: string | null, page: number) => {
    const queryParams = new URLSearchParams();
    if (tag) queryParams.set("tag", tag);
    queryParams.set("page", page.toString());
    router.push(`?${queryParams.toString()}`);
  };

  // Handle tag selection toggling (reset page to 1 when changed)
  const handleTagClick = (tagName: string) => {
    if (selectedTag === tagName) {
      setSelectedTag(null);
      setSelectedPage(1);
      updateQueryParams(null, 1);
    } else {
      setSelectedTag(tagName);
      setSelectedPage(1);
      updateQueryParams(tagName, 1);
    }
  };

  // Handle page button clicks
  const handlePageClick = (pageNumber: number) => {
    setSelectedPage(pageNumber);
    updateQueryParams(selectedTag, pageNumber);
  };

  return (
    <div className="flex-1 flex flex-col pt-6 pb-2 bg-black text-white max-w-screen overflow-x-hidden">
      {/* Tag and Pagination Section */}
      <div className="flex flex-col gap-2 justify-around self-center items-center">
        {/* Tags Dropdown */}
        <BlogPageTagsDropdown
          blogDetails={blogDetails || { tags: [] }} // Use fallback if details haven't loaded
          selectedTag={selectedTag}
          handleTagClick={handleTagClick}
        />
      </div>

      {/* Blog View Section */}
      <BlogView selectedTag={selectedTag} page={selectedPage} router={router} />

      {/* Duplicate Pagination at Bottom (Optional) */}
      <div className="flex gap-2 mx-auto items-center mt-auto mb-4">
        <Button
          onClick={() => handlePageClick(selectedPage - 1)}
          disabled={selectedPage === 1}
          variant="ghost"
          className="px-3 py-1 hover:bg-[#241405] hover:text-white disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <ChevronLeft className="w-4 h-4" />
        </Button>

        {visiblePages.map((pageNumber, index) => {
          const isSelected = selectedPage === pageNumber;
          const isEllipsis =
            index > 0 && pageNumber !== visiblePages[index - 1] + 1;
          return (
            <React.Fragment key={pageNumber}>
              {isEllipsis && <span className="px-2">...</span>}
              <Button
                onClick={() => handlePageClick(pageNumber)}
                variant="default"
                className={`px-3 py-1 ${
                  isSelected ? "bg-yellow-700" : "hover:bg-[#241405]"
                }`}
              >
                {pageNumber}
              </Button>
            </React.Fragment>
          );
        })}

        <Button
          onClick={() => handlePageClick(selectedPage + 1)}
          disabled={selectedPage === totalPages}
          variant="ghost"
          className="px-3 py-1 hover:bg-[#241405] hover:text-white disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <ChevronRight className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
}
