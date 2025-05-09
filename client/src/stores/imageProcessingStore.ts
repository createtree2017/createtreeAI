import { create } from 'zustand';

interface ImageProcessingState {
  isProcessing: boolean;
  message: string | null;
  startProcessing: (message?: string) => void;
  stopProcessing: () => void;
}

export const useImageProcessingStore = create<ImageProcessingState>((set) => ({
  isProcessing: false,
  message: null,
  startProcessing: (message?: string) => set({ 
    isProcessing: true, 
    message: message || '이미지 처리 중...' 
  }),
  stopProcessing: () => set({ 
    isProcessing: false, 
    message: null 
  }),
}));