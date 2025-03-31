import React from "react";
import { Button } from "./ui/button";
import Link from "next/link";
import { Briefcase, FileText, Linkedin, Video, Gitlab, } from "lucide-react";
import { Separator } from "./ui/separator";

export const FloatingBottomNav = () => {
  return (
    <div className="sticky bottom-4 left-4 right-4 z-50 text-white flex justify-center">
      <div className="mx-3 w-[290px] bg-[#1f1f1f] bg-opacity-90 backdrop-blur-md rounded-full shadow-lg ">
        <div className="flex justify-between items-center px-2 py-2 ">
          {/* Left Group: Portfolio & Blog */}
          <div className="flex gap-1 px-4">
            <Link href="/">
              <Button variant="ghost"  size="icon" className="flex flex-col items-center hover">
                <Briefcase className="w-5 h-3" />
              </Button>
            </Link>
            <Link href="/blog">
              <Button variant="ghost" size="icon" className="flex flex-col items-center">
                <FileText className="w-5 h-5" />
              </Button>
            </Link>
          </div>
          <Separator orientation="vertical"/>
          {/* Right Group: Social Links */}
          <div className="flex gap-1 px-4">
            <a
              href="https://www.linkedin.com/in/anas-merstani-261ba81ab/"
              target="_blank"
              rel="noopener noreferrer"
            >
              <Button variant="ghost" size="icon" className="flex flex-col items-center">
                <Linkedin className="w-5 h-5" />
              </Button>
            </a>
            <a
              href="https://youpic.com/anasmerstani"
              target="_blank"
              rel="noopener noreferrer"
            >
              <Button variant="ghost" size="icon" className="flex flex-col items-center">
                <Video className="w-5 h-5" />
              </Button>
            </a>
            <a
              href="https://gitlab.com/batMerstan"
              target="_blank"
              rel="noopener noreferrer"
            >
              <Button variant="ghost" size="icon" className="flex flex-col items-center">
                <Gitlab className="w-5 h-5" />
              </Button>
            </a>
          </div>
        </div>
      </div>
    </div>
  );
};
