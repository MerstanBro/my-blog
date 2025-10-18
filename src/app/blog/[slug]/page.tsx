import { Metadata } from "next";
import matter from "gray-matter";
import { notFound } from "next/navigation";
import { fetchBlog } from "@/services/gitlabServices";
import { Suspense, cache } from "react";
import BlogContent from "./BlogContent";
import BlogHeader from "./BlogHeader";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import Image from "next/image";

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

interface PageProps {
  params: Promise<{ slug: string }>;
}

// ============================================
// CACHING LAYER - Deduplicated fetch requests
// ============================================
const getCachedBlogPost = cache(async (slug: string): Promise<BlogData | null> => {
  try {
    const originalTitle = slug.replace(/-/g, " ");
    const rawContent = await fetchBlog(originalTitle);
    const { data, content } = matter(rawContent);
    
    return {
      metadata: data as BlogData["metadata"],
      content,
    };
  } catch (error) {
    console.error(`Failed to fetch blog post: ${slug}`, error);
    return null;
  }
});

// ============================================
// STATIC PARAMS GENERATION - Pre-render popular posts
// ============================================
export async function generateStaticParams() {
  try {
    // const details = await fetchDetails();
    // You can implement logic here to fetch popular/recent posts
    // For now, returning empty array to generate on-demand
    return [];
  } catch (error) {
    console.error("Failed to generate static params:", error);
    return [];
  }
}

// ============================================
// DYNAMIC METADATA - SEO Optimization
// ============================================
export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const blog = await getCachedBlogPost(slug);

  if (!blog) {
    return {
      title: "Post Not Found",
      description: "The requested blog post could not be found.",
    };
  }

  const { metadata } = blog;
  const url = `https://anasmerstani.com/blog/${slug}`;

  return {
    title: metadata.title,
    description: metadata.description,
    keywords: metadata.tags,
    authors: [{ name: "Anas Al-Merstani" }],
    openGraph: {
      title: metadata.title,
      description: metadata.description,
      url,
      type: "article",
      publishedTime: metadata.date,
      authors: ["Anas Al-Merstani"],
      tags: metadata.tags,
      images: [
        {
          url: metadata.image,
          width: 1200,
          height: 630,
          alt: metadata.title,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: metadata.title,
      description: metadata.description,
      images: [metadata.image],
    },
    alternates: {
      canonical: url,
    },
  };
}

// ============================================
// REVALIDATION - ISR with 1 hour cache
// ============================================
// Note: Next.js requires static values for revalidate (no conditionals)
// To test loading states in dev: temporarily change to 0 or 10
export const revalidate = 3600; // Revalidate every hour
export const dynamic = 'auto'; // Auto detect (allows loading.tsx to show)
export const dynamicParams = true; // Allow dynamic params

// ============================================
// MAIN PAGE COMPONENT - Server Component
// ============================================
export default async function BlogPage({ params }: PageProps) {
  const { slug } = await params;
  const blog = await getCachedBlogPost(slug);

  if (!blog) {
    notFound();
  }

  const { metadata, content } = blog;
  const isArabic = /^[\u0600-\u06FF]/.test(content.trim());

  // Structured Data for SEO
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    headline: metadata.title,
    description: metadata.description,
    image: metadata.image,
    datePublished: metadata.date,
    author: {
      "@type": "Person",
      name: "Anas Al-Merstani",
      url: "https://anasmerstani.com",
    },
    publisher: {
      "@type": "Person",
      name: "Anas Al-Merstani",
    },
    mainEntityOfPage: {
      "@type": "WebPage",
      "@id": `https://anasmerstani.com/blog/${slug}`,
    },
    keywords: metadata.tags.join(", "),
  };

  return (
    <>
      {/* Structured Data */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <div className="min-h-screen relative w-full overflow-x-hidden">
        {/* Background Image with Overlay */}
        {metadata.image && (
          <div className="fixed inset-0 z-0">
            <Image
              src={metadata.image}
              alt={metadata.title}
              fill
              className="object-cover"
              priority
              quality={85}
              sizes="100vw"
            />
            {/* Dark overlay for better text readability */}
            <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />
          </div>
        )}

        {/* Content Container with Glass Effect */}
        <div className="relative z-10 min-h-screen p-4 sm:p-6 lg:p-8">
          <div className="max-w-4xl mx-auto">
            {/* Back Button */}
            <Link href="/blog" prefetch={true}>
              <Button
                variant="default"
                className="mb-6 bg-white/10 backdrop-blur-md border border-white/20 hover:bg-white/20 transition-all shadow-lg"
              >
                ← Back to Blog
              </Button>
            </Link>

            {/* Main Content Card */}
            <div
              className="bg-black/40 backdrop-blur-md rounded-2xl shadow-2xl border border-white/10 overflow-hidden"
              dir={isArabic ? "rtl" : "ltr"}
            >
              {/* Header Section - Render immediately */}
              <BlogHeader metadata={metadata} />

              {/* Article Content - Stream with Suspense */}
              <Suspense
                fallback={
                  <div className="p-6 sm:p-8 lg:p-10 flex justify-center items-center min-h-[400px]">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-yellow-500"></div>
                  </div>
                }
              >
                <BlogContent content={content} />
              </Suspense>
            </div>

            {/* Bottom Spacing */}
            <div className="h-12" />
          </div>
        </div>
      </div>
    </>
  );
}
