import { useEffect } from 'react';
import { useLocation } from 'wouter';

export default function StickersPage() {
  const [, setLocation] = useLocation();
  
  // 메인 이미지 페이지로 리디렉션하면서 스티커 컨셉을 자동 선택하도록 쿼리 파라미터 전달
  useEffect(() => {
    // `/image` 페이지로 리디렉션하면서 스타일 미리 선택
    setLocation('/image?preset=sticker');
  }, [setLocation]);
  
  // 리디렉션 중 표시할 로딩 UI
  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="flex flex-col items-center">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mb-4"></div>
        <p className="text-muted-foreground">스티커 만들기 페이지로 이동 중...</p>
      </div>
    </div>
  );
}