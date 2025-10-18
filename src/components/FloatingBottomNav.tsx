import React from "react";
import { Button } from "./ui/button";
import Link from "next/link";
import { Briefcase, FileText, Linkedin, Video, Gitlab, } from "lucide-react";
import { Separator } from "./ui/separator";

export const FloatingBottomNav = () => {
  return (
    <nav aria-label="Main navigation" className="sticky bottom-4 left-4 right-4 z-50 text-white flex justify-center">
      <div className="mx-3 w-[320px] bg-gradient-to-r from-[#1f1f1f] to-[#2a2a2a] bg-opacity-95 backdrop-blur-lg rounded-full shadow-2xl border border-gray-700/50">
        <div className="flex justify-between items-center px-3 py-3">
          {/* Left Group: Portfolio & Blog */}
          <div className="flex gap-2 px-4">
            <Link href="/" aria-label="Go to Portfolio">
              <Button 
                variant="ghost" 
                size="icon" 
                className="flex flex-col items-center hover:bg-yellow-500/20 hover:text-yellow-400 transition-all duration-300 rounded-full"
                aria-label="Portfolio"
              >
                <Briefcase className="w-5 h-5" aria-hidden="true" />
              </Button>
            </Link>
            <Link href="/blog" aria-label="Go to Blog">
              <Button 
                variant="ghost" 
                size="icon" 
                className="flex flex-col items-center hover:bg-orange-500/20 hover:text-orange-400 transition-all duration-300 rounded-full"
                aria-label="Blog"
              >
                <FileText className="w-5 h-5" aria-hidden="true" />
              </Button>
            </Link>
          </div>
          <Separator orientation="vertical" className="h-8 bg-gray-600/30" aria-hidden="true" />
          {/* Right Group: Social Links */}
          <div className="flex gap-2 px-4" role="group" aria-label="Social media links">
            <a
              href="https://www.linkedin.com/in/anas-merstani-261ba81ab/"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Visit LinkedIn profile"
            >
              <Button 
                variant="ghost" 
                size="icon" 
                className="flex flex-col items-center hover:bg-blue-500/20 hover:text-blue-400 transition-all duration-300 rounded-full"
                aria-label="LinkedIn"
              >
                <Linkedin className="w-5 h-5" aria-hidden="true" />
              </Button>
            </a>
            <a
              href="https://youpic.com/anasmerstani"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Visit Youpic profile"
            >
              <Button 
                variant="ghost" 
                size="icon" 
                className="flex flex-col items-center hover:bg-red-500/20 hover:text-red-400 transition-all duration-300 rounded-full"
                aria-label="Youpic"
              >
                <Video className="w-5 h-5" aria-hidden="true" />
              </Button>
            </a>
            <a
              href="https://gitlab.com/batMerstan"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Visit GitLab profile"
            >
              <Button 
                variant="ghost" 
                size="icon" 
                className="flex flex-col items-center hover:bg-orange-500/20 hover:text-orange-400 transition-all duration-300 rounded-full"
                aria-label="GitLab"
              >
                <Gitlab className="w-5 h-5" aria-hidden="true" />
              </Button>
            </a>
          </div>
        </div>
      </div>
    </nav>
  );
};
