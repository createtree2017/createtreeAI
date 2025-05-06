import { create } from 'zustand';

// 사이드바 상태 관리를 위한 커스텀 이벤트
const toggleSidebarEvent = 'app:toggle-sidebar';

interface SidebarState {
  isOpen: boolean;
  toggleSidebar: () => void;
  openSidebar: () => void;
  closeSidebar: () => void;
}

export const useSidebarStore = create<SidebarState>((set) => ({
  isOpen: false,
  toggleSidebar: () => {
    set((state) => ({ isOpen: !state.isOpen }));
    // 사이드바 토글 이벤트 발생
    window.dispatchEvent(new CustomEvent(toggleSidebarEvent));
  },
  openSidebar: () => set({ isOpen: true }),
  closeSidebar: () => set({ isOpen: false }),
}));