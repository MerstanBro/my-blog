import React from "react";
import { Button } from "./ui/button";
import { BookOpen } from "lucide-react";
import Link from "next/link";

type CTASection = {
  title: string;
  description: string;
  buttonText: string;
  subtitle: string;
};

export const BlogCTA = ({ CTA_SECTION }: { CTA_SECTION: CTASection }) => {
  return (
    <section className="py-16 px-6 sm:px-16 text-center bg-black">
      <div className="max-w-4xl mx-auto">
        <h2 className="text-3xl md:text-4xl font-bold mb-6 text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 to-orange-500">
          {CTA_SECTION.title}
        </h2>
        <p className="text-lg text-gray-300 mb-8 max-w-2xl mx-auto">
          {CTA_SECTION.description}
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
          <Link href="/blog">
            <Button 
              size="lg" 
              className="bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-600 hover:to-orange-600 text-black font-semibold px-8 py-3 rounded-full shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-300"
            >
              <BookOpen className="w-5 h-5 mr-2" />
              {CTA_SECTION.buttonText}
            </Button>
          </Link>
          {/* <div className="text-sm text-gray-400">
            {CTA_SECTION.subtitle}
          </div> */}
        </div>
      </div>
    </section>
  );
};
