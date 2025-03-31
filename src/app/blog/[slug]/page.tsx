"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import matter from "gray-matter";
import ReactMarkdown from "react-markdown";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { notFound } from "next/navigation";
import { fetchBlog } from "@/services/gitlabServices";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { atomDark } from "react-syntax-highlighter/dist/esm/styles/prism";
import remarkGfm from "remark-gfm";

interface BlogData {
  metadata: {
    tags: string[];
    date: string;
    title: string;
    data: string;
    image: string;
    description: string;
  };
  content: string;
}

const YouTubeEmbed = ({ url }: { url: string }) => {
  const videoId = url.split("v=")[1]?.split("&")[0]; // Extract video ID
  if (!videoId) return <a href={url}>{url}</a>; // Fallback: render as a link

  return (
    <iframe
      width="560"
      height="315"
      src={`https://www.youtube.com/embed/${videoId}`}
      frameBorder="0"
      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
      allowFullScreen
      className="my-4 rounded-lg"
    />
  );
};

export default function BlogPage() {
  const { slug } = useParams() as { slug: string };

  const [blog, setBlog] = useState<BlogData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!slug) return;
    setLoading(true);
    setError(null);
    const originalTitle = slug.replace(/-/g, " ");
    console.log("Fetching blog for:", originalTitle);
    fetchBlog(originalTitle)
      .then((rawContent) => {
        const { data, content } = matter(rawContent);
        setBlog({ metadata: data as BlogData["metadata"], content });
        setLoading(false);
      })
      .catch((err) => {
        console.error("Error fetching blog:", err);
        setError("you need a proxy :)");
        setLoading(false);
      });
  }, [slug]);

  if (loading) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center p-6">
        <span>Loading...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-black text-red-500 flex items-center justify-center p-6">
        <p>{error}</p>
      </div>
    );
  }

  if (!blog) return notFound();

  const { metadata, content } = blog;
  const isArabic = /^[\u0600-\u06FF]/.test(content.trim());

  return (
    <div className="min-h-screen bg-black text-white p-6 w-[99vw] max-w-3xl mx-auto">
      {/* Back Button */}
      <Link href="/blog">
        <Button variant="default" className="mb-4">
          ← Back to Blog
        </Button>
      </Link>

      {/* Title & Meta Info */}
      <div className="flex flex-col md:flex-row gap-6">
        {/* Content Section */}
        <div className="flex flex-col justify-center md:w-1/2">
          <h1 className="text-3xl font-bold text-white">{metadata.title}</h1>
          <p className="text-gray-400">
            {new Date(metadata.date).toDateString()}
          </p>
          <p className="text-lg mt-2 text-gray-300">{metadata.description}</p>
        </div>
        {/* Image Section */}
        {metadata.image && (
          <div className="relative w-full md:w-1/2 h-64 rounded-lg overflow-hidden">
            <img
              src={metadata.image}
              alt={metadata.title}
              className="w-full h-full object-cover rounded-lg"
            />
          </div>
        )}
      </div>

      {/* Tags */}
      <div className="mt-3 flex flex-wrap gap-2">
        {metadata.tags &&
          metadata.tags.map((tag: string, i: number) => (
            <Link key={i} href={`/blog?tag=${encodeURIComponent(tag)}`}>
              <span className="px-3 py-1 bg-yellow-700 text-white rounded-full text-xs cursor-pointer hover:bg-yellow-600 transition">
                {tag}
              </span>
            </Link>
          ))}
      </div>

      <article
        className="mt-6 prose prose-invert"
        dir={isArabic ? "rtl" : "ltr"}
      >
        <ReactMarkdown
          remarkPlugins={[remarkGfm]}
          components={{
            a: ({ href, ...props }) => {
              return href!.includes("youtube.com/watch") ||
                href!.includes("youtu.be") ? (
                <YouTubeEmbed url={`${href}`} />
              ) : (
                <a
                  href={href}
                  className="text-blue-400 hover:underline"
                  {...props}
                />
              );
            },
            h1: ({  ...props }) => (
              <h1 className="text-6xl font-bold" {...props} />
            ),
            h2: ({ ...props }) => (
              <h1 className="text-2xl font-bold py-2" {...props} />
            ),
            p: ({  ...props }) => (
              <p className="text-lg mb-6 text-gray-300" {...props} />
            ),
            blockquote: ({ ...props }) => (
              <blockquote
                className="border-l-4 border-yellow-500 pl-4 italic"
                {...props}
              />
            ),
            ul: ({ ...props }) => (
              <ul
                className="list-disc ml-5 space-y-2 text-gray-300"
                {...props}
              />
            ),
            // Custom component for code blocks and inline code
            code({ className, children, ...props }) {
              const match = /language-(\w+)/.exec(className || "");
              return true && match ? (
                <SyntaxHighlighter
                  style={atomDark}
                  language={match[1].toLowerCase()}
                  PreTag="div"
                  codeTagProps={{ ...props }}
                >
                  {String(children).replace(/\n$/, "")}
                </SyntaxHighlighter>
              ) : (
                <SyntaxHighlighter
                  style={atomDark}
                  language={""}
                  PreTag="div"
                  codeTagProps={{ ...props }}
                >
                  {String(children).replace(/\n$/, "")}
                </SyntaxHighlighter>
              );
            },
          }}
        >
          {content}
        </ReactMarkdown>
      </article>
    </div>
  );
}
