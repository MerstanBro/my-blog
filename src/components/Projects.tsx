import { ArrowUpRight } from "lucide-react";
import React from "react";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "./ui/carousel";
import Autoplay from "embla-carousel-autoplay";

type Project = {
  id: string;
  title: string;
  description: string;
  link: string;
  image: string;
};

export const Projects = ({ projects }: { projects: Project[] }) => {
  return (
    <section id="projects" className="py-16 px-4 md:px-6 relative bg-black">
      <div className="max-w-6xl mx-auto">
        <div className="flex justify-between items-end mb-12">
          <h2 className="text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 to-orange-500">
            Projects
          </h2>
        </div>

        <Carousel
          opts={{
            loop: true,
            align: "start",
          }}
          plugins={[
            Autoplay({
              delay: 5000,
            }),
          ]}
          className="p-1 relative"
        >
          <div className="flex items-center gap-4 w-full">
            {/* Left Arrow */}
            <CarouselPrevious className="static translate-y-0 border-yellow-500/30 bg-[#1a1a1a] aspect-square text-yellow-500 hover:bg-yellow-500/10 hover:text-yellow-400 -ml-2" />

            {/* Carousel Content */}
            <CarouselContent className="flex-1">
              {projects.map((project: Project) => (
                <CarouselItem
                  key={project.id}
                  className="md:basis-1/2 lg:basis-1/3 xl:basis-1/4"
                >
                  <article className="group relative h-[98%] bg-gradient-to-br from-[#1a1a1a] to-[#101010] rounded-2xl p-6 shadow-2xl  transition-all duration-300">
                    <div className="relative overflow-hidden rounded-xl mb-6 aspect-video">
                      <img
                        src={project.image}
                        alt={project.title}
                        className="w-full h-full object-cover"
                      />
                    </div>

                    <div className="flex flex-col gap-4">
                      <div className="flex items-start justify-between">
                        <h3 className="text-xl font-semibold text-white">
                          {project.title}
                        </h3>
                        <a
                          href={project.link}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-2 hover:bg-yellow-500/10 rounded-full transition-colors"
                          aria-label={`Visit ${project.title} project`}
                        >
                          <ArrowUpRight className="w-5 h-5 text-yellow-500" />
                        </a>
                      </div>

                      <p className="text-gray-400 text-sm leading-relaxed">
                        {project.description}
                      </p>
                    </div>
                  </article>
                </CarouselItem>
              ))}
            </CarouselContent>

            {/* Right Arrow */}
            <CarouselNext className="static translate-y-0 bg-[#1a1a1a] aspect-square border-yellow-500/30 text-yellow-500 hover:bg-yellow-500/10 hover:text-yellow-400 -mr-2" />
          </div>
        </Carousel>
      </div>
    </section>
  );
};
