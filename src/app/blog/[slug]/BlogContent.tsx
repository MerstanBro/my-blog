"use client";

import ReactMarkdown from "react-markdown";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { atomDark } from "react-syntax-highlighter/dist/esm/styles/prism";
import remarkGfm from "remark-gfm";
import { memo } from "react";

interface BlogContentProps {
  content: string;
}

const YouTubeEmbed = memo(({ url }: { url: string }) => {
  const videoId = url.split("v=")[1]?.split("&")[0];
  if (!videoId) return <a href={url}>{url}</a>;

  return (
    <div className="relative w-full aspect-video my-4">
      <iframe
        src={`https://www.youtube.com/embed/${videoId}`}
        title="YouTube video player"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
        allowFullScreen
        className="absolute inset-0 w-full h-full rounded-lg"
        loading="lazy"
      />
    </div>
  );
});

YouTubeEmbed.displayName = "YouTubeEmbed";

// Memoize the entire BlogContent component to prevent unnecessary re-renders
export default memo(function BlogContent({ content }: BlogContentProps) {
  return (
    <article
      className="p-6 sm:p-8 lg:p-10 prose prose-invert prose-lg max-w-none
        prose-headings:text-white 
        prose-p:text-gray-200 
        prose-a:text-blue-400 
        prose-strong:text-white
        prose-em:text-gray-200
        prose-code:text-yellow-300
        prose-pre:bg-black/50
        prose-pre:backdrop-blur-sm
        prose-pre:border
        prose-pre:border-white/10
        prose-blockquote:text-gray-200
        prose-li:text-gray-200
        [&_*]:text-gray-200"
    >
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          a: ({ href, ...props }) => {
            const isYoutube = href?.includes("youtube.com/watch") || href?.includes("youtu.be");
            
            if (isYoutube && href) {
              return <YouTubeEmbed url={href} />;
            }
            
            return (
              <a
                href={href}
                className="text-blue-400 hover:text-blue-300 hover:underline transition-colors"
                target={href?.startsWith("http") ? "_blank" : undefined}
                rel={href?.startsWith("http") ? "noopener noreferrer" : undefined}
                {...props}
              />
            );
          },
          h1: ({ ...props }) => (
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold mt-8 mb-4" {...props} />
          ),
          h2: ({ ...props }) => (
            <h2 className="text-2xl sm:text-3xl font-bold py-2 mt-6 mb-3" {...props} />
          ),
          h3: ({ ...props }) => (
            <h3 className="text-xl sm:text-2xl font-semibold mt-4 mb-2" {...props} />
          ),
          p: ({ ...props }) => (
            <p className="text-base sm:text-lg mb-6 text-gray-200 leading-relaxed" {...props} />
          ),
          blockquote: ({ ...props }) => (
            <blockquote
              className="border-l-4 border-yellow-500 pl-4 sm:pl-6 py-2 italic bg-white/5 rounded-r-lg my-6"
              {...props}
            />
          ),
          ul: ({ ...props }) => (
            <ul className="list-disc ml-5 sm:ml-6 space-y-2 text-gray-200" {...props} />
          ),
          ol: ({ ...props }) => (
            <ol className="list-decimal ml-5 sm:ml-6 space-y-2 text-gray-200" {...props} />
          ),
          li: ({ ...props }) => <li className="text-base sm:text-lg" {...props} />,
          code({ className, children, ...props }) {
            const match = /language-(\w+)/.exec(className || "");
            
            if (match) {
              return (
                <div className="my-6 rounded-xl overflow-hidden shadow-lg border border-white/10">
                  <SyntaxHighlighter
                    style={atomDark}
                    language={match[1].toLowerCase()}
                    PreTag="div"
                    customStyle={{
                      margin: 0,
                      padding: "1.5rem",
                      background: "rgba(0, 0, 0, 0.5)",
                    }}
                    showLineNumbers
                    wrapLines
                  >
                    {String(children).replace(/\n$/, "")}
                  </SyntaxHighlighter>
                </div>
              );
            }
            
            return (
              <code className="px-2 py-1 bg-white/10 rounded text-yellow-300 text-sm" {...props}>
                {children}
              </code>
            );
          },
        }}
      >
        {content}
      </ReactMarkdown>
    </article>
  );
});

