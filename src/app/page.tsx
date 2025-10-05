"use client";

import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Github, Gitlab, Linkedin } from "lucide-react";
// import Experience from "@/components/Experiences";
import TypingTest from "@/components/test";
import { Projects } from "@/components/Projects";
import { Hero } from "@/components/Hero";
import { BlogCTA } from "@/components/BlogCTA";
import { useEffect, useState } from "react";
import { BlogContent, fetchContent } from "@/services/gitlabServices";

export default function Portfolio() {
  const [content, setContent] = useState<BlogContent | null>(null);
  const [error, setError] = useState<boolean>(false);
  useEffect(() => {
    fetchContent()
      .then((data) => {
        setContent(data);
        console.log(data);
      })
      .catch((error) => {
        console.error("Error fetching blog details:", error);
        setError(true);
      });
  }, []);

  if (error) {
    return (
      <div className="min-h-screen bg-black text-red-500 flex items-center justify-center p-6">
        <p>You need a proxy :)<br/>there is an Easter Egg here somewhere;)
        </p>
      </div>
    );
  }
  if (!content) {
    return (
      <div className="min-h-screen flex justify-center items-center bg-black">
        <div className="animate-spin rounded-full h-16 w-16  border-b-[1px] border-yellow-500"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-black text-white overflow-x-hidden ">
      {/* Hero Section */}
      <Hero HERO_SECTION={content.HERO_SECTION} />
      
      {/* Blog CTA Section */}
      <BlogCTA CTA_SECTION={content.CTA_SECTION} />
      
      <Projects projects={content.projects} />
      {/* <Experience experiences={content.experiences} /> */}
      <TypingTest
        targetWpm={77}
        leaderBoardEntries={content.leaderboardEntries}
      />
      <Separator className="bg-gradient-to-r from-transparent via-yellow-500/30 to-transparent" />
      {/* Social Links */}
      <section className="py-16 px-6 sm:px-16 text-center bg-black">
        <h2 className="text-3xl md:text-4xl font-bold mb-4 text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 to-orange-500">
          Let&apos;s Connect
        </h2>
        <p className="text-gray-400 mb-8 max-w-2xl mx-auto">
          Follow my journey and connect with me on social platforms
        </p>
        <div className="mt-8 flex justify-center gap-4 flex-col sm:flex-row max-w-4xl mx-auto">
          {content.SOCIAL_LINKS.map((social, index) => {
            const Icon =
              social.icon === "Github"
                ? Github
                : social.icon === "Gitlab"
                ? Gitlab
                : Linkedin;
            return (
              <a
                key={index}
                href={social.href}
                target="_blank"
                rel="noopener noreferrer"
                className="group"
              >
                <Button 
                  variant="ghost" 
                  className="bg-gradient-to-r from-[#1a1a1a] to-[#2a2a2a] hover:from-yellow-500/20 hover:to-orange-500/20 border border-gray-700 hover:border-yellow-500/50 px-6 py-3 rounded-full transition-all duration-300 transform hover:scale-105 hover:shadow-lg"
                >
                  <Icon className="w-5 h-5 mr-3 group-hover:text-yellow-400 transition-colors duration-300" /> 
                  <span className="group-hover:text-yellow-400 transition-colors duration-300">{social.name}</span>
                </Button>
              </a>
            );
          })}
        </div>
      </section>
    </div>
  );
}
