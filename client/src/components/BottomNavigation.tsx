import { useLocation, Link } from "wouter";
import { Home, Music, PaintbrushVertical, MessageCircle, Images } from "lucide-react";

export default function BottomNavigation() {
  const [location] = useLocation();
  
  const navItems = [
    { name: "Home", icon: Home, path: "/" },
    { name: "Lullaby", icon: Music, path: "/music" },
    { name: "Memory", icon: PaintbrushVertical, path: "/image" },
    { name: "Support", icon: MessageCircle, path: "/chat" },
    { name: "Gallery", icon: Images, path: "/gallery" },
  ];

  return (
    <nav className="bg-white border-t border-neutral-light py-2 fixed bottom-0 left-0 right-0 z-10 shadow-soft safe-area-bottom">
      <div className="flex justify-around max-w-md mx-auto px-1">
        {navItems.map((item) => {
          const isActive = 
            (item.path === "/" && location === "/") || 
            (item.path !== "/" && location.startsWith(item.path));
            
          return (
            <Link 
              key={item.path} 
              href={item.path}
              className={`flex flex-col items-center p-2 rounded-lg transition-colors ${
                isActive 
                  ? "text-primary bg-primary-light/10" 
                  : "text-neutral-dark hover:bg-neutral-lightest"
              }`}
            >
              <item.icon className={`h-5 w-5 ${isActive ? "text-primary" : "text-neutral-dark"}`} />
              <span className="text-xs font-medium mt-1">{item.name}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
