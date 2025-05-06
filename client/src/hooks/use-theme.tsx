import React, { createContext, useState, useContext, useEffect } from 'react';

// 테마 타입 정의: 다크모드, 라이트모드, 파스텔모드
type Theme = 'dark' | 'light' | 'pastel';

// 테마 컨텍스트 타입 정의
type ThemeContextType = {
  theme: Theme;
  setTheme: (theme: Theme) => void;
};

// 테마 컨텍스트 생성
const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

// 테마 프로바이더 컴포넌트
export function ThemeProvider({ children }: { children: React.ReactNode }) {
  // 로컬 스토리지에서 테마 가져오기 (없으면 'light'를 기본값으로 사용)
  const [theme, setTheme] = useState<Theme>(() => {
    if (typeof window !== 'undefined') {
      const savedTheme = localStorage.getItem('theme') as Theme;
      return savedTheme || 'light';
    }
    return 'light';
  });

  // 테마 변경 시 로컬 스토리지에 저장하고 HTML 클래스 업데이트
  useEffect(() => {
    const root = window.document.documentElement;
    
    // 기존 테마 클래스 제거
    root.classList.remove('light', 'dark', 'pastel');
    
    // 새 테마 클래스 추가
    root.classList.add(theme);
    
    // 로컬 스토리지에 테마 저장
    localStorage.setItem('theme', theme);
  }, [theme]);

  // 시스템 테마 감지 (초기 로드 시에만)
  useEffect(() => {
    // 저장된 테마가 없는 경우에만 시스템 테마를 감지
    const savedTheme = localStorage.getItem('theme');
    if (!savedTheme) {
      // 시스템이 다크 모드인지 확인
      const isDarkMode = window.matchMedia('(prefers-color-scheme: dark)').matches;
      setTheme(isDarkMode ? 'dark' : 'light');
    }
  }, []);

  return (
    <ThemeContext.Provider value={{ theme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

// 테마 훅 생성
export function useTheme() {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}