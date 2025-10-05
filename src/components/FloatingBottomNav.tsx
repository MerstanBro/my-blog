import React from "react";
import { Button } from "./ui/button";
import Link from "next/link";
import { Briefcase, FileText, Linkedin, Video, Gitlab, } from "lucide-react";
import { Separator } from "./ui/separator";

export const FloatingBottomNav = () => {
  return (
    <div className="sticky bottom-4 left-4 right-4 z-50 text-white flex justify-center">
      <div className="mx-3 w-[320px] bg-gradient-to-r from-[#1f1f1f] to-[#2a2a2a] bg-opacity-95 backdrop-blur-lg rounded-full shadow-2xl border border-gray-700/50">
        <div className="flex justify-between items-center px-3 py-3">
          {/* Left Group: Portfolio & Blog */}
          <div className="flex gap-2 px-4">
            <Link href="/">
              <Button 
                variant="ghost" 
                size="icon" 
                className="flex flex-col items-center hover:bg-yellow-500/20 hover:text-yellow-400 transition-all duration-300 rounded-full"
              >
                <Briefcase className="w-5 h-5" />
              </Button>
            </Link>
            <Link href="/blog">
              <Button 
                variant="ghost" 
                size="icon" 
                className="flex flex-col items-center hover:bg-orange-500/20 hover:text-orange-400 transition-all duration-300 rounded-full"
              >
                <FileText className="w-5 h-5" />
              </Button>
            </Link>
          </div>
          <Separator orientation="vertical" className="h-8 bg-gray-600/30"/>
          {/* Right Group: Social Links */}
          <div className="flex gap-2 px-4">
            <a
              href="https://www.linkedin.com/in/anas-merstani-261ba81ab/"
              target="_blank"
              rel="noopener noreferrer"
            >
              <Button 
                variant="ghost" 
                size="icon" 
                className="flex flex-col items-center hover:bg-blue-500/20 hover:text-blue-400 transition-all duration-300 rounded-full"
              >
                <Linkedin className="w-5 h-5" />
              </Button>
            </a>
            <a
              href="https://youpic.com/anasmerstani"
              target="_blank"
              rel="noopener noreferrer"
            >
              <Button 
                variant="ghost" 
                size="icon" 
                className="flex flex-col items-center hover:bg-red-500/20 hover:text-red-400 transition-all duration-300 rounded-full"
              >
                <Video className="w-5 h-5" />
              </Button>
            </a>
            <a
              href="https://gitlab.com/batMerstan"
              target="_blank"
              rel="noopener noreferrer"
            >
              <Button 
                variant="ghost" 
                size="icon" 
                className="flex flex-col items-center hover:bg-orange-500/20 hover:text-orange-400 transition-all duration-300 rounded-full"
              >
                <Gitlab className="w-5 h-5" />
              </Button>
            </a>
          </div>
        </div>
      </div>
    </div>
  );
};
