export default function Loading() {
  return (
    <div className="min-h-screen flex justify-center items-center bg-black">
      <div className="flex flex-col items-center gap-4">
        <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-yellow-500"></div>
        <p className="text-gray-400 text-sm">Loading...</p>
      </div>
    </div>
  );
}


