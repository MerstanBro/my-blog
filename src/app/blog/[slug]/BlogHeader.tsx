import Link from "next/link";

interface BlogHeaderProps {
  metadata: {
    title: string;
    date: string;
    description: string;
    tags: string[];
  };
}

export default function BlogHeader({ metadata }: BlogHeaderProps) {
  return (
    <header className="p-6 sm:p-8 lg:p-10 border-b border-white/10">
      <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-white mb-4 leading-tight">
        {metadata.title}
      </h1>
      <time
        dateTime={metadata.date}
        className="text-gray-300 text-sm sm:text-base mb-3 block"
      >
        {new Date(metadata.date).toDateString()}
      </time>
      <p className="text-base sm:text-lg text-gray-200 leading-relaxed">
        {metadata.description}
      </p>

      {/* Tags */}
      <nav aria-label="Post tags" className="mt-6 flex flex-wrap gap-2">
        {metadata.tags &&
          metadata.tags.map((tag: string, i: number) => (
            <Link
              key={i}
              href={`/blog?tag=${encodeURIComponent(tag)}`}
              prefetch={false}
            >
              <span className="px-4 py-2 bg-yellow-600/80 backdrop-blur-sm text-white rounded-full text-xs sm:text-sm cursor-pointer hover:bg-yellow-500/90 transition-all shadow-md hover:shadow-lg hover:scale-105 transform duration-200">
                {tag}
              </span>
            </Link>
          ))}
      </nav>
    </header>
  );
}


