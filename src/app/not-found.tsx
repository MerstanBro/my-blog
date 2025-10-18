import Link from 'next/link';
import { Button } from '@/components/ui/button';

export default function NotFound() {
  return (
    <div className="min-h-screen bg-black text-white flex flex-col items-center justify-center p-6">
      <div className="max-w-md text-center">
        <h1 className="text-9xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 to-orange-500 mb-4">
          404
        </h1>
        <h2 className="text-3xl font-bold mb-4">Page Not Found</h2>
        <p className="text-gray-400 mb-6">
          The page you&apos;re looking for doesn&apos;t exist or has been moved.
        </p>
        <Link href="/">
          <Button className="bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-600 hover:to-orange-600">
            Go Home
          </Button>
        </Link>
      </div>
    </div>
  );
}


