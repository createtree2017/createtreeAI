import { Switch, Route, useLocation, Link } from "wouter";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "./lib/queryClient";
import { Toaster } from "@/components/ui/toaster";
import { useEffect, useState } from "react";
import NotFound from "@/pages/not-found";
import Home from "@/pages/home";
import Music from "@/pages/music";
import Image from "@/pages/image";
import Chat from "@/pages/chat";
import Gallery from "@/pages/gallery";
import Admin from "@/pages/admin";
import Milestones from "@/pages/milestones";
import AuthPage from "@/pages/auth";
import BottomNavigation from "@/components/BottomNavigation";
import Sidebar from "@/components/Sidebar";
import { useMobile } from "./hooks/use-mobile";
import { Menu, X, ChevronLeft, ChevronRight } from "lucide-react";
import { ThemeProvider } from "@/hooks/use-theme";
import { ThemeToggle } from "@/components/ThemeToggle";
import { AuthProvider } from "@/lib/AuthProvider";

// Main layout component
function Layout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();
  const isMobile = useMobile();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  
  // Check if we're in an iframe
  const [isInIframe, setIsInIframe] = useState(false);
  
  useEffect(() => {
    if (window.self !== window.top) {
      setIsInIframe(true);
      document.documentElement.classList.add('in-iframe');
    }
  }, []);
  
  // Close sidebar when clicking outside on mobile
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (
        isMobile && 
        sidebarOpen && 
        !target.closest('.sidebar') && 
        !target.closest('.sidebar-toggle')
      ) {
        setSidebarOpen(false);
      }
    };
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isMobile, sidebarOpen]);
  
  // Close sidebar when location changes on mobile
  useEffect(() => {
    if (isMobile && sidebarOpen) {
      setSidebarOpen(false);
    }
  }, [location, isMobile]);
  
  // Determine if direct page mode (for iframe embedding of single features)
  const isDirectPage = 
    location === "/music" || 
    location === "/image" || 
    location === "/chat";
  
  // We show the navigation only if not in direct page mode or not in iframe
  const showNavigation = !isInIframe || !isDirectPage;
  
  // Use sidebar on desktop, use bottom navigation on mobile (unless in iframe direct mode)
  const useDesktopLayout = !isMobile && showNavigation;
  const useMobileLayout = isMobile && showNavigation;
  
  const toggleCollapsed = () => {
    setSidebarCollapsed(!sidebarCollapsed);
  };
  
  if (useDesktopLayout) {
    return (
      <div className="flex h-screen bg-background overflow-hidden">
        <div className="sidebar relative">
          <Sidebar collapsed={sidebarCollapsed} />
          <button 
            onClick={toggleCollapsed}
            className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-1/2 z-20 bg-card text-foreground/70 hover:text-foreground
              rounded-full p-1 shadow-md border border-border"
          >
            {sidebarCollapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
          </button>
        </div>

        <div className="flex-1 flex flex-col overflow-hidden">
          {/* 데스크톱 헤더 추가 - 테마 토글 포함 */}
          <header className="bg-card h-14 border-b border-border px-6 flex items-center justify-end">
            <ThemeToggle />
          </header>
          
          <div className="flex-1 overflow-y-auto custom-scrollbar bg-background">
            <div className="max-w-7xl mx-auto w-full p-6 lg:p-8 pb-16">
              {children}
            </div>
          </div>
        </div>
      </div>
    );
  }
  
  return (
    <div className={`flex flex-col ${isInIframe ? "h-full" : "min-h-screen"} bg-background`}>
      {/* 모바일 사이드바 오버레이 */}
      {useMobileLayout && sidebarOpen && (
        <div className="fixed inset-0 bg-black/70 z-40" onClick={() => setSidebarOpen(false)} />
      )}
      
      {/* 모바일 사이드바 */}
      {useMobileLayout && (
        <div className={`sidebar fixed top-0 bottom-0 left-0 z-50 transform transition-transform duration-300 ease-in-out ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
          <Sidebar collapsed={false} />
          <button 
            className="absolute top-4 right-4 text-foreground p-1.5 bg-muted rounded-full"
            onClick={() => setSidebarOpen(false)}
            aria-label="사이드바 닫기"
          >
            <X size={18} />
          </button>
        </div>
      )}
      
      {/* 모바일 헤더 */}
      {useMobileLayout && (
        <header className="sticky top-0 z-30 w-full bg-card safe-area-top border-b border-border">
          <div className="px-4 h-14 flex items-center justify-between">
            {/* 메뉴 버튼 */}
            <button 
              className="sidebar-toggle w-9 h-9 flex items-center justify-center text-foreground/80 hover:text-foreground 
                       rounded-md hover:bg-muted transition-colors"
              onClick={() => setSidebarOpen(!sidebarOpen)}
              aria-label="사이드바 토글"
            >
              <Menu size={22} />
            </button>
            
            {/* 로고 */}
            <div className="flex items-center">
              <h1 className="text-lg font-semibold tracking-tight font-heading">
                <span className="text-foreground">맘스</span> <span className="text-primary">서비스</span>
              </h1>
            </div>
            
            {/* 테마 토글 */}
            <ThemeToggle />
          </div>
        </header>
      )}
      
      {/* 메인 콘텐츠 */}
      <main className={`flex-1 overflow-y-auto custom-scrollbar ${useMobileLayout ? "pb-16" : "pb-4"}`}>
        <div className={`${isInIframe ? "p-0" : "p-4"} mx-auto ${isMobile ? "max-w-xl" : ""}`}>
          {children}
        </div>
      </main>
      
      {/* 모바일용 하단 네비게이션 */}
      {useMobileLayout && <BottomNavigation />}
    </div>
  );
}

function Router() {
  return (
    <Switch>
      <Route path="/" component={() => (
        <Layout>
          <Home />
        </Layout>
      )} />
      <Route path="/music" component={() => (
        <Layout>
          <Music />
        </Layout>
      )} />
      <Route path="/image" component={() => (
        <Layout>
          <Image />
        </Layout>
      )} />
      <Route path="/chat" component={() => (
        <Layout>
          <Chat />
        </Layout>
      )} />
      <Route path="/gallery" component={() => (
        <Layout>
          <Gallery />
        </Layout>
      )} />
      <Route path="/admin" component={() => (
        <div className="w-full max-w-7xl mx-auto">
          <Admin />
        </div>
      )} />
      <Route path="/milestones" component={() => (
        <Layout>
          <Milestones />
        </Layout>
      )} />
      <Route path="/auth" component={AuthPage} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  // 모바일 최적화를 위한 뷰포트 메타 태그 추가
  useEffect(() => {
    // 모바일 기기를 위한 뷰포트 설정
    const metaViewport = document.createElement('meta');
    metaViewport.name = 'viewport';
    metaViewport.content = 'width=device-width, initial-scale=1.0, viewport-fit=cover, maximum-scale=1';
    document.head.appendChild(metaViewport);
    
    return () => {
      document.head.removeChild(metaViewport);
    };
  }, []);
  
  return (
    <ThemeProvider>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <Router />
          <Toaster />
        </AuthProvider>
      </QueryClientProvider>
    </ThemeProvider>
  );
}

export default App;
