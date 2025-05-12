import React from 'react';
import { Camera } from 'lucide-react';

export const LoadingState = () => (
  <div className="flex items-center justify-center h-96 bg-gray-100 rounded-lg">
    <div className="text-center">
      <Camera className="w-12 h-12 mx-auto mb-4 text-gray-400 animate-pulse" />
      <p className="text-gray-500">Loading object detection model...</p>
    </div>
  </div>
);