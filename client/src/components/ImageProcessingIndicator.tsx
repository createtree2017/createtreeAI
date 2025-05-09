import React from 'react';
import { Loader2 } from 'lucide-react';
import { useImageProcessingStore } from '@/stores/imageProcessingStore';

export function ImageProcessingIndicator() {
  const { isProcessing, message } = useImageProcessingStore();

  if (!isProcessing) return null;

  return (
    <div className="flex items-center text-primary gap-1.5 bg-primary/5 px-2.5 py-1 rounded-full">
      <Loader2 className="animate-spin h-3.5 w-3.5" />
      <span className="text-xs font-medium whitespace-nowrap">{message}</span>
    </div>
  );
}