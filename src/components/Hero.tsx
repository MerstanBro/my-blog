import React from "react";

export const Hero = ({
  HERO_SECTION,
}: {
  HERO_SECTION: { title: string; subtitle: string; info: string };
}) => {
  return (
    <section className="text-center py-16 bg-black text-white">
      <div className="max-w-5xl mx-auto flex flex-col items-center justify-center px-6 lg:flex-row lg:space-x-12">
        {/* Your picture */}
        <div className="mb-8 lg:mb-0">
          <img
            src="images/anas.jpg"
            alt="Anas"
            className="w-48 h-48 md:w-56 md:h-56 lg:w-64 lg:h-64 object-cover rounded-3xl border-[2px] border-yellow-500 shadow-xl"
          />
        </div>

        {/* Content */}
        <div className="flex flex-col items-center lg:items-start text-center lg:text-left">
          <h2 className="text-4xl leading-tight tracking-tight mb-4  font-bold text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 to-orange-500">
            {HERO_SECTION.title}
          </h2>
          <p className="text-lg max-w-3xl mb-6 text-gray-300">
            {HERO_SECTION.subtitle}
          </p>

          {/* Info Section */}
          <div className="bg-[#1a1a1a] text-gray-300 p-6 rounded-xl shadow-lg max-w-2xl w-full mt-8">
            <p className="text-lg">{HERO_SECTION.info}</p>
          </div>
        </div>
      </div>
    </section>
  );
};
