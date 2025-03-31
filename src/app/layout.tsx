import type { Metadata } from "next";
import "./globals.css";
import { FloatingBottomNav } from "@/components/FloatingBottomNav";
import { Suspense } from "react";

export const metadata: Metadata = {
  title: "Anas Al-Merstani",
  description: "Portfolio and blog",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <meta property="og:title" content="Anas Al-Merstani" />
        <meta property="og:description" content="Portfolio and blog" />
        <meta property="og:image" content="/square.png" />
        <meta property="og:type" content="website" />
      </head>
      <body className="bg-black font-almarai min-h-screen flex flex-col">
      <Suspense fallback={<div>Loading...</div>}>
        {children}
        <FloatingBottomNav />
      </Suspense>
      </body>
    </html>
  );
}
