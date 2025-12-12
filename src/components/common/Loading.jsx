import React from 'react';
import { Loader } from 'lucide-react';

/**
 * A simple, centered loading component.
 */
function Loading({ text = "Loading..." }) {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center text-gray-400">
      <Loader className="animate-spin h-10 w-10 mb-4" />
      <p className="text-2xl">{text}</p>
    </div>
  );
}

export default Loading;