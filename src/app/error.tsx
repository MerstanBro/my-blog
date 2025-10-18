"use client";

import { useEffect } from 'react';
import { Button } from '@/components/ui/button';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('Global error:', error);
  }, [error]);

  return (
    <div className="min-h-screen bg-black text-white flex flex-col items-center justify-center p-6">
      <div className="max-w-md text-center">
        <h2 className="text-3xl font-bold mb-4 text-red-500">
          Something went wrong!
        </h2>
        <p className="text-gray-400 mb-6">
          We encountered an unexpected error. Please try again.
        </p>
        <Button
          onClick={reset}
          className="bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-600 hover:to-orange-600"
        >
          Try again
        </Button>
      </div>
    </div>
  );
}


