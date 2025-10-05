import React from "react";
import Image from "next/image";

export const Hero = ({
  HERO_SECTION,
}: {
  HERO_SECTION: { title: string; subtitle: string; info: string };
}) => {
  return (
    <section className="text-center py-20 bg-black text-white relative overflow-hidden">
      {/* Background decoration */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-yellow-500/5 via-transparent to-transparent"></div>
      
      <div className="max-w-6xl mx-auto flex flex-col items-center justify-center px-6 lg:flex-row lg:space-x-16 relative z-10">
        {/* Your picture */}
        <div className="mb-8 lg:mb-0 relative group">
          <div className="absolute -inset-4 bg-gradient-to-r from-yellow-500 to-orange-500 rounded-3xl blur opacity-30 group-hover:opacity-50 transition duration-300"></div>
          <Image
            src="/images/anas.jpg"
            alt="Anas"
            width={256}
            height={256}
            className="relative w-48 h-48 md:w-56 md:h-56 lg:w-64 lg:h-64 object-cover rounded-3xl border-[3px] border-yellow-500 shadow-2xl transform group-hover:scale-105 transition duration-300"
            priority
          />
        </div>

        {/* Content */}
        <div className="flex flex-col items-center lg:items-start text-center lg:text-left">
          <h2 className="text-5xl md:text-6xl leading-tight tracking-tight mb-6 font-bold text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 via-orange-400 to-yellow-500 animate-pulse">
            {HERO_SECTION.title}
          </h2>
          <p className="text-xl max-w-3xl mb-8 text-gray-300 leading-relaxed">
            {HERO_SECTION.subtitle}
          </p>

          {/* Info Section */}
          <div className="bg-gradient-to-br from-[#1a1a1a] to-[#2a2a2a] text-gray-300 p-8 rounded-2xl shadow-2xl max-w-2xl w-full mt-8 border border-gray-700 hover:border-yellow-500/50 transition duration-300">
            <p className="text-lg leading-relaxed">{HERO_SECTION.info}</p>
          </div>
        </div>
      </div>
    </section>
  );
};
