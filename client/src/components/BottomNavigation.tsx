import React from 'react';
import { Link, useLocation } from 'wouter';
import { Home, Image, MessageCircle, Grid, User } from 'lucide-react';

export default function BottomNavigation() {
  const [location] = useLocation();
  
  const navItems = [
    {
      path: '/',
      icon: Home,
      label: 'Home',
    },
    {
      path: '/programs',
      icon: Grid,
      label: 'Programs',
    },
    {
      path: '/chat',
      icon: MessageCircle,
      label: 'AI Chat',
    },
    {
      path: '/gallery',
      icon: Image,
      label: 'Gallery',
    },
    {
      path: '/profile',
      icon: User,
      label: 'My Page',
    },
  ];

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 safe-area-bottom">
      <nav className="flex items-center justify-between bg-white border-t border-gray-100 px-2 h-16 shadow-lg">
        {navItems.map((item) => {
          const isActive = location === item.path;
          return (
            <Link 
              key={item.path} 
              href={item.path}
              className={`
                flex flex-col items-center justify-center flex-1 py-1 px-2 
                ${isActive 
                  ? 'text-primary-lavender bg-gradient-to-t from-transparent to-primary-lavender/10'
                  : 'text-gray-500 hover:text-primary-lavender'}
                transition-colors duration-200 rounded-lg
              `}
            >
              <item.icon size={20} className={isActive ? 'mb-1' : 'mb-1'} />
              <span className="text-xs font-medium">{item.label}</span>
              {isActive && (
                <div className="absolute bottom-0 w-6 h-1 rounded-t-full bg-primary-lavender" />
              )}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}