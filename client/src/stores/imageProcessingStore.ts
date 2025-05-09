import { create } from 'zustand';

interface ImageProcessingState {
  isProcessing: boolean;
  message: string | null;
  count: number;
  startProcessing: (message?: string) => void;
  stopProcessing: () => void;
  incrementCount: () => void;
  decrementCount: () => void;
  resetCount: () => void;
}

export const useImageProcessingStore = create<ImageProcessingState>((set) => ({
  isProcessing: false,
  message: null,
  count: 0,
  startProcessing: (message?: string) => set((state) => ({ 
    isProcessing: true,
    count: state.count + 1,
    message: `${state.count + 1}개 이미지 생성 중` 
  })),
  stopProcessing: () => set((state) => {
    const newCount = Math.max(0, state.count - 1);
    return { 
      isProcessing: newCount > 0,
      count: newCount,
      message: newCount > 0 ? `${newCount}개 이미지 생성 중` : null
    };
  }),
  incrementCount: () => set((state) => ({
    count: state.count + 1,
    message: `${state.count + 1}개 이미지 생성 중`
  })),
  decrementCount: () => set((state) => {
    const newCount = Math.max(0, state.count - 1);
    return { 
      isProcessing: newCount > 0,
      count: newCount,
      message: newCount > 0 ? `${newCount}개 이미지 생성 중` : null
    };
  }),
  resetCount: () => set({ count: 0, isProcessing: false, message: null }),
}));