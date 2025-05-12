import React from 'react';
import { Loader2 } from 'lucide-react';

interface LoadingStateProps {
  message?: string;
}

export function LoadingState({ message = 'Loading...' }: LoadingStateProps) {
  return (
    <div className="flex flex-col items-center justify-center p-8">
      <Loader2 className="w-12 h-12 text-blue-500 animate-spin mb-4" />
      <p className="text-gray-600 text-center">{message}</p>
    </div>
  );
}