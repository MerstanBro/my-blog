"use client";

import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Github, Gitlab, Linkedin } from "lucide-react";
import Experience from "@/components/Experiences";
import TypingTest from "@/components/test";
import { Projects } from "@/components/Projects";
import { Hero } from "@/components/Hero";
import { useEffect, useState } from "react";
import { BlogContent, fetchContent } from "@/services/gitlabServices";

export default function Portfolio() {
  const [content, setContent] = useState<BlogContent | null>(null);

  useEffect(() => {
    fetchContent()
      .then((data) => {
        setContent(data);
        console.log(data);
      })
      .catch((error) => {
        console.error("Error fetching blog details:", error);
      });
  }, []);

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
      <Projects projects={content.projects} />
      <Experience experiences={content.experiences} />
      <TypingTest
        targetWpm={77}
        leaderBoardEntries={content.leaderboardEntries}
      />
      <Separator />
      {/* Social Links */}
      <section className="py-12 px-6 sm:px-16 text-center">
        <h2 className="text-2xl font-semibold">Connect with Me</h2>
        <div className="mt-6 flex justify-center gap-6 flex-col sm:flex-row">
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
              >
                <Button variant="ghost">
                  <Icon className="w-5 h-5 mr-2" /> {social.name}
                </Button>
              </a>
            );
          })}
        </div>
      </section>
    </div>
  );
}
