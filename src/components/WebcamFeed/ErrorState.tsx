import React from 'react';
import { Camera } from 'lucide-react';

interface ErrorStateProps {
  error: string;
}

export const ErrorState = ({ error }: ErrorStateProps) => (
  <div className="flex items-center justify-center h-96 bg-red-50 rounded-lg">
    <div className="text-center p-6">
      <Camera className="w-12 h-12 mx-auto mb-4 text-red-400" />
      <p className="text-red-600">{error}</p>
    </div>
  </div>
);