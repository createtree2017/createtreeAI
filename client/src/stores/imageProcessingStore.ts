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
  startProcessing: (message = '이미지 생성 중...') => set({ isProcessing: true, message }),
  stopProcessing: () => set({ isProcessing: false, message: null }),
}));