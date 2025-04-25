import { Switch, Route, useLocation } from "wouter";
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
import Header from "@/components/Header";
import BottomNavigation from "@/components/BottomNavigation";
import { useMobile } from "./hooks/use-mobile";

// Main layout component
function Layout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();
  const isMobile = useMobile();
  
  // Check if we're in an iframe
  const [isInIframe, setIsInIframe] = useState(false);
  
  useEffect(() => {
    if (window.self !== window.top) {
      setIsInIframe(true);
      document.documentElement.classList.add('in-iframe');
    }
  }, []);
  
  // Determine if direct page mode (for iframe embedding of single features)
  const isDirectPage = 
    location === "/music" || 
    location === "/image" || 
    location === "/chat";
  
  // We show the header and bottom navigation only if not in direct page mode or not in iframe
  const showNavigation = !isInIframe || !isDirectPage;
  
  return (
    <div className={`flex flex-col ${isInIframe ? "h-full" : "min-h-screen"} max-w-md mx-auto bg-white shadow-soft overflow-hidden`}>
      {showNavigation && <Header />}
      <main className={`flex-1 overflow-y-auto custom-scrollbar ${showNavigation ? "pb-16" : "pb-4"}`}>
        {children}
      </main>
      {showNavigation && <BottomNavigation />}
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
