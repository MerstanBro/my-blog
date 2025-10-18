"use client";

import React, { Component, ReactNode } from 'react';
import { Button } from './ui/button';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Error caught by boundary:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="min-h-screen bg-black text-white flex flex-col items-center justify-center p-6">
          <div className="max-w-md text-center">
            <h2 className="text-3xl font-bold mb-4 text-red-500">Oops! Something went wrong</h2>
            <p className="text-gray-400 mb-6">
              We encountered an unexpected error. Please try refreshing the page.
            </p>
            <Button
              onClick={() => window.location.reload()}
              className="bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-600 hover:to-orange-600"
            >
              Refresh Page
            </Button>
            {process.env.NODE_ENV === 'development' && this.state.error && (
              <details className="mt-6 text-left">
                <summary className="cursor-pointer text-gray-500 hover:text-gray-400">
                  Error Details
                </summary>
                <pre className="mt-2 text-xs bg-gray-900 p-4 rounded overflow-auto">
                  {this.state.error.toString()}
                </pre>
              </details>
            )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}


