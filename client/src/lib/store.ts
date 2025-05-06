import { create } from 'zustand';

// 모바일 기기 여부 확인하는 함수
const isMobileDevice = () => {
  return window.innerWidth <= 768;
};

interface SidebarState {
  isOpen: boolean;
  toggleSidebar: () => void;
  openSidebar: () => void;
  closeSidebar: () => void;
}

export const useSidebarStore = create<SidebarState>((set) => ({
  isOpen: false,
  toggleSidebar: () => {
    const isMobile = isMobileDevice();
    
    // DOM에서 직접 사이드바 버튼 클릭
    if (isMobile) {
      const sidebarToggle = document.querySelector('.sidebar-toggle') as HTMLButtonElement;
      if (sidebarToggle) {
        sidebarToggle.click();
      }
    }
    
    set((state) => ({ isOpen: !state.isOpen }));
  },
  openSidebar: () => {
    const isMobile = isMobileDevice();
    
    if (isMobile) {
      const sidebarToggle = document.querySelector('.sidebar-toggle') as HTMLButtonElement;
      if (sidebarToggle) {
        const isCurrentlyOpen = sidebarToggle.getAttribute('aria-expanded') === 'true';
        if (!isCurrentlyOpen) {
          sidebarToggle.click();
        }
      }
    }
    
    set({ isOpen: true });
  },
  closeSidebar: () => {
    const isMobile = isMobileDevice();
    
    if (isMobile) {
      const sidebarToggle = document.querySelector('.sidebar-toggle') as HTMLButtonElement;
      if (sidebarToggle) {
        const isCurrentlyOpen = sidebarToggle.getAttribute('aria-expanded') === 'true';
        if (isCurrentlyOpen) {
          sidebarToggle.click();
        }
      }
    }
    
    set({ isOpen: false });
  },
}));