import { useState, useEffect } from 'react';

/**
 * 기기가 모바일인지 여부를 감지하는 훅
 * @returns {boolean} 모바일 기기 여부
 */
export function useMobile(): boolean {
  // 기본값은 서버사이드 렌더링 또는 초기 상태를 위한 것입니다
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    // 최초 실행 시 확인
    checkIfMobile();
    
    // 화면 크기 변경 시 리스너 등록
    const handleResize = () => {
      checkIfMobile();
    };
    
    // 화면 크기 변경 감지를 위한 이벤트 리스너
    window.addEventListener('resize', handleResize);
    
    // 컴포넌트 언마운트 시 이벤트 리스너 제거
    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  // 모바일 체크 함수
  const checkIfMobile = () => {
    // 768px 이하를 모바일로 간주 (md 중단점)
    const mobileBreakpoint = 768;
    setIsMobile(window.innerWidth < mobileBreakpoint);
  };

  return isMobile;
}