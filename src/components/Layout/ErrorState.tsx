import React from 'react';
import { AlertCircle } from 'lucide-react';

interface ErrorStateProps {
  message: string;
  retry?: () => void;
}

export function ErrorState({ message, retry }: ErrorStateProps) {
  return (
    <div className="flex flex-col items-center justify-center p-8 bg-red-50 rounded-lg">
      <AlertCircle className="w-12 h-12 text-red-500 mb-4" />
      <p className="text-red-700 text-center mb-4">{message}</p>
      {retry && (
        <button 
          onClick={retry}
          className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
        >
          Try Again
        </button>
      )}
    </div>
  );
}