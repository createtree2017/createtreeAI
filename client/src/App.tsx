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
import Header from "@/components/Header";
import BottomNavigation from "@/components/BottomNavigation";
import Sidebar from "@/components/Sidebar";
import { useMobile } from "./hooks/use-mobile";
import { Menu } from "lucide-react";

// Main layout component
function Layout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();
  const isMobile = useMobile();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  
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
  
  if (useDesktopLayout) {
    return (
      <div className="flex h-screen bg-neutral-50 overflow-hidden">
        <div className="sidebar">
          <Sidebar />
        </div>
        <div className="flex-1 flex flex-col overflow-hidden">
          <div className="flex-1 overflow-y-auto custom-scrollbar bg-white">
            <div className="max-w-4xl mx-auto w-full p-6">
              {children}
            </div>
          </div>
        </div>
      </div>
    );
  }
  
  return (
    <div className={`flex flex-col ${isInIframe ? "h-full" : "min-h-screen"} bg-white`}>
      {/* Mobile sidebar overlay */}
      {useMobileLayout && sidebarOpen && (
        <div className="fixed inset-0 bg-black/50 z-40" onClick={() => setSidebarOpen(false)} />
      )}
      
      {/* Mobile sidebar */}
      {useMobileLayout && (
        <div className={`sidebar fixed top-0 bottom-0 left-0 w-64 z-50 transform transition-transform duration-300 ease-in-out ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
          <Sidebar />
        </div>
      )}
      
      {/* Mobile header with menu button */}
      {useMobileLayout && (
        <header className="sticky top-0 z-30 w-full bg-gradient-to-r from-primary-lavender to-primary-mint safe-area-top shadow-md">
          <div className="mx-auto px-4 h-16 flex items-center justify-between">
            {/* Menu button */}
            <button 
              className="sidebar-toggle w-10 h-10 flex items-center justify-center text-white rounded-full bg-white/20"
              onClick={() => setSidebarOpen(!sidebarOpen)}
              aria-label="Toggle sidebar"
            >
              <Menu size={24} />
            </button>
            
            {/* Logo */}
            <div className="flex items-center">
              <h1 className="text-xl font-semibold tracking-tight text-neutral-darkest font-heading">
                <span className="text-white">Mom's</span> <span className="text-neutral-darkest">Service</span>
              </h1>
            </div>
            
            {/* Spacer for alignment */}
            <div className="w-10"></div>
          </div>
        </header>
      )}
      
      {/* Main content */}
      <main className={`flex-1 overflow-y-auto custom-scrollbar ${useMobileLayout ? "pb-16" : "pb-4"}`}>
        <div className={`${isInIframe ? "p-0" : "p-4"} mx-auto ${isMobile ? "max-w-md" : ""}`}>
          {children}
        </div>
      </main>
      
      {/* Bottom navigation for mobile */}
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
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  // Add viewport meta tag for mobile optimization
  useEffect(() => {
    // Ensure the viewport is properly set for mobile devices
    const metaViewport = document.createElement('meta');
    metaViewport.name = 'viewport';
    metaViewport.content = 'width=device-width, initial-scale=1.0, viewport-fit=cover, maximum-scale=1';
    document.head.appendChild(metaViewport);
    
    return () => {
      document.head.removeChild(metaViewport);
    };
  }, []);
  
  return (
    <QueryClientProvider client={queryClient}>
      <Router />
      <Toaster />
    </QueryClientProvider>
  );
}

export default App;
