import React from 'react';
import { Menu } from 'lucide-react';
import { useSidebarStore } from '../lib/store';

interface TopMenuBarProps {
  title?: string;
}

const TopMenuBar: React.FC<TopMenuBarProps> = ({ title = "Mom's Service" }) => {
  // Zustand 스토어에서 토글 함수 가져오기
  const { toggleSidebar } = useSidebarStore();
  
  return (
    <div className="bg-black text-white w-full p-4 flex items-center justify-center relative">
      <button 
        className="absolute left-4 p-1 rounded-md hover:bg-white/10 transition-colors sidebar-toggle"
        onClick={toggleSidebar}
        aria-label="메뉴 열기"
      >
        <Menu size={24} />
      </button>
      <h1 className="font-medium text-lg">{title}</h1>
    </div>
  );
};

export default TopMenuBar;