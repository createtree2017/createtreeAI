import React from 'react';
import { Menu } from 'lucide-react';

interface TopMenuBarProps {
  title?: string;
}

const TopMenuBar: React.FC<TopMenuBarProps> = ({ title = "Mom's Service" }) => {
  // 직접 사이드바 토글 함수 정의
  const handleToggleMenu = () => {
    // 커스텀 이벤트 발생
    const event = new CustomEvent('app:toggle-sidebar');
    window.dispatchEvent(event);
  };
  
  return (
    <div className="bg-black text-white w-full p-4 flex items-center justify-center relative">
      <button 
        className="absolute left-4 p-1 rounded-md hover:bg-white/10 transition-colors sidebar-toggle"
        onClick={handleToggleMenu}
        aria-label="메뉴 열기"
      >
        <Menu size={24} />
      </button>
      <h1 className="font-medium text-lg">{title}</h1>
    </div>
  );
};

export default TopMenuBar;