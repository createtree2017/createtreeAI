import { useLocation, Link } from "wouter";
import { Home, Music, PaintbrushVertical, MessageCircle, Images } from "lucide-react";

export default function BottomNavigation() {
  const [location] = useLocation();
  
  const navItems = [
    { name: "Home", icon: Home, path: "/" },
    { name: "Melody", icon: Music, path: "/music" },
    { name: "Art", icon: PaintbrushVertical, path: "/image" },
    { name: "Chat", icon: MessageCircle, path: "/chat" },
    { name: "Gallery", icon: Images, path: "/gallery" },
  ];

  return (
    <nav className="bg-white border-t border-neutral-light py-2 fixed bottom-0 left-0 right-0 z-10 max-w-md mx-auto">
      <div className="flex justify-around">
        {navItems.map((item) => {
          const isActive = 
            (item.path === "/" && location === "/") || 
            (item.path !== "/" && location.startsWith(item.path));
            
          return (
            <Link key={item.path} href={item.path}>
              <a className={`flex flex-col items-center p-2 ${
                isActive ? "text-primary" : "text-neutral-dark"
              }`}>
                <item.icon className="h-5 w-5" />
                <span className="text-xs mt-1">{item.name}</span>
              </a>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
