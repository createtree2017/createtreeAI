import { createContext, useContext, useState, useEffect, ReactNode } from 'react';

interface MusicItem {
  id: number;
  title: string;
  duration: number;
  style: string;
  url: string;
  createdAt: string;
}

interface MusicProcessingState {
  isGenerating: boolean;
  generatedMusic: MusicItem | null;
  formData: {
    babyName: string;
    musicStyle: string;
    duration: string;
  };
  startGeneration: (formData: { babyName: string; musicStyle: string; duration: string }) => void;
  finishGeneration: (music: MusicItem) => void;
  cancelGeneration: () => void;
  setFormData: (data: { babyName: string; musicStyle: string; duration: string }) => void;
}

const MusicProcessingContext = createContext<MusicProcessingState | undefined>(undefined);

export function MusicProcessingProvider({ children }: { children: ReactNode }) {
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedMusic, setGeneratedMusic] = useState<MusicItem | null>(null);
  const [formData, setFormValues] = useState({
    babyName: '',
    musicStyle: 'lullaby',
    duration: '60',
  });

  // 로컬 스토리지에서 초기 상태 가져오기
  useEffect(() => {
    try {
      const savedFormData = localStorage.getItem('music_form_data');
      if (savedFormData) {
        setFormValues(JSON.parse(savedFormData));
      }
      
      const savedMusic = localStorage.getItem('last_generated_music');
      if (savedMusic) {
        setGeneratedMusic(JSON.parse(savedMusic));
      }
      
      const generationStatus = localStorage.getItem('music_generation_status');
      if (generationStatus) {
        setIsGenerating(JSON.parse(generationStatus).isGenerating);
      }
    } catch (error) {
      console.error('로컬 스토리지 데이터 로드 오류:', error);
    }
  });

  const startGeneration = (data: { babyName: string; musicStyle: string; duration: string }) => {
    setIsGenerating(true);
    setFormValues(data);
    
    // 상태를 로컬 스토리지에 저장
    localStorage.setItem('music_form_data', JSON.stringify(data));
    localStorage.setItem('music_generation_status', JSON.stringify({ isGenerating: true }));
  };

  const finishGeneration = (music: MusicItem) => {
    setIsGenerating(false);
    setGeneratedMusic(music);
    
    // 결과를 로컬 스토리지에 저장
    localStorage.setItem('last_generated_music', JSON.stringify(music));
    localStorage.setItem('music_generation_status', JSON.stringify({ isGenerating: false }));
  };

  const cancelGeneration = () => {
    setIsGenerating(false);
    localStorage.setItem('music_generation_status', JSON.stringify({ isGenerating: false }));
  };
  
  const setFormData = (data: { babyName: string; musicStyle: string; duration: string }) => {
    setFormValues(data);
    localStorage.setItem('music_form_data', JSON.stringify(data));
  };

  return (
    <MusicProcessingContext.Provider
      value={{
        isGenerating,
        generatedMusic,
        formData,
        startGeneration,
        finishGeneration,
        cancelGeneration,
        setFormData,
      }}
    >
      {children}
    </MusicProcessingContext.Provider>
  );
}

export function useMusicProcessing() {
  const context = useContext(MusicProcessingContext);
  if (context === undefined) {
    throw new Error('useMusicProcessing must be used within a MusicProcessingProvider');
  }
  return context;
}