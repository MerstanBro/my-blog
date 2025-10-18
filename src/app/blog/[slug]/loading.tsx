export default function Loading() {
  return (
    <div className="min-h-screen relative w-full overflow-x-hidden bg-black">
      <div className="relative z-10 min-h-screen p-4 sm:p-6 lg:p-8">
        <div className="max-w-4xl mx-auto">
          {/* Back Button Skeleton */}
          <div className="mb-6 h-10 w-40 bg-white/10 rounded-md animate-pulse" />

          {/* Main Content Card */}
          <div className="bg-black/40 backdrop-blur-md rounded-2xl shadow-2xl border border-white/10 overflow-hidden">
            {/* Header Section Skeleton */}
            <div className="p-6 sm:p-8 lg:p-10 border-b border-white/10">
              {/* Title */}
              <div className="h-12 bg-white/10 rounded-md mb-4 animate-pulse" />
              {/* Date */}
              <div className="h-4 w-32 bg-white/10 rounded-md mb-3 animate-pulse" />
              {/* Description */}
              <div className="space-y-2">
                <div className="h-4 bg-white/10 rounded-md animate-pulse" />
                <div className="h-4 w-3/4 bg-white/10 rounded-md animate-pulse" />
              </div>
              {/* Tags */}
              <div className="mt-6 flex gap-2">
                <div className="h-8 w-20 bg-yellow-600/30 rounded-full animate-pulse" />
                <div className="h-8 w-24 bg-yellow-600/30 rounded-full animate-pulse" />
                <div className="h-8 w-16 bg-yellow-600/30 rounded-full animate-pulse" />
              </div>
            </div>

            {/* Article Content Skeleton */}
            <div className="p-6 sm:p-8 lg:p-10 space-y-4">
              <div className="h-4 bg-white/10 rounded-md animate-pulse" />
              <div className="h-4 bg-white/10 rounded-md animate-pulse" />
              <div className="h-4 w-5/6 bg-white/10 rounded-md animate-pulse" />
              <div className="h-32 bg-white/10 rounded-md mt-6 animate-pulse" />
              <div className="h-4 bg-white/10 rounded-md animate-pulse" />
              <div className="h-4 w-4/5 bg-white/10 rounded-md animate-pulse" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}


