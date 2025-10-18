import type { Metadata } from "next";
import { Almarai } from 'next/font/google';
import "./globals.css";
import { FloatingBottomNav } from "@/components/FloatingBottomNav";
import { Suspense } from "react";
import { Analytics } from '@vercel/analytics/next';

// Optimize font loading
const almarai = Almarai({
  weight: ['300', '400', '700', '800'],
  subsets: ['arabic'],
  display: 'swap',
  variable: '--font-almarai',
});
 
export const metadata: Metadata = {
  metadataBase: new URL('https://anasmerstani.com'),
  title: {
    default: 'Anas Al-Merstani | Software Engineer & Tech Blogger',
    template: '%s | Anas Al-Merstani'
  },
  description: "Full-stack developer sharing insights on web development, programming, and technology. Explore my projects, blog posts, and professional journey.",
  keywords: ['Anas Al-Merstani', 'Software Engineer', 'Web Development', 'Portfolio', 'Blog', 'Programming', 'Tech Blog'],
  authors: [{ name: 'Anas Al-Merstani' }],
  creator: 'Anas Al-Merstani',
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: 'https://anasmerstani.com',
    title: 'Anas Al-Merstani | Software Engineer & Tech Blogger',
    description: 'Full-stack developer sharing insights on web development, programming, and technology.',
    siteName: 'Anas Al-Merstani',
    images: [{
      url: '/square.png',
      width: 1200,
      height: 630,
      alt: 'Anas Al-Merstani'
    }]
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Anas Al-Merstani | Software Engineer & Tech Blogger',
    description: 'Full-stack developer sharing insights on web development, programming, and technology.',
    images: ['/square.png'],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Person',
    name: 'Anas Al-Merstani',
    url: 'https://anasmerstani.com',
    jobTitle: 'Software Engineer',
    description: 'Full-stack developer sharing insights on web development, programming, and technology.',
    sameAs: [
      'https://www.linkedin.com/in/anas-merstani-261ba81ab/',
      'https://gitlab.com/batMerstan',
    ],
  };

  return (
    <html lang="en" className={almarai.variable}>
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      </head>
      <body className={`bg-black min-h-screen flex flex-col ${almarai.className}`}>
      <Suspense fallback={
        <div className="min-h-screen flex justify-center items-center bg-black">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-yellow-500"></div>
        </div>
      }>
        {children}
        <Analytics />
        <FloatingBottomNav />
      </Suspense>
      </body>
    </html>
  );
}
