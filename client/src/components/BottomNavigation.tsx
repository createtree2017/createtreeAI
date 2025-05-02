import React from 'react';
import { Link, useLocation } from 'wouter';
import { Home, Image, MessageCircle, Grid, User, Award } from 'lucide-react';

export default function BottomNavigation() {
  const [location] = useLocation();
  
  const navItems = [
    {
      path: '/',
      icon: Home,
      label: '홈',
      ariaLabel: '홈 페이지',
    },
    {
      path: '/milestones',
      icon: Award,
      label: '마일스톤',
      ariaLabel: '임신 마일스톤 페이지',
    },
    {
      path: '/chat',
      icon: MessageCircle,
      label: 'AI 채팅',
      ariaLabel: 'AI 채팅 페이지',
    },
    {
      path: '/gallery',
      icon: Image,
      label: '갤러리',
      ariaLabel: '갤러리 페이지',
    },
    {
      path: '/profile',
      icon: User,
      label: '마이페이지',
      ariaLabel: '내 프로필 페이지',
    },
  ];

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 safe-area-bottom">
      <nav className="flex items-center justify-between bg-white border-t border-neutral-light px-1 h-16 shadow-md">
        {navItems.map((item) => {
          const isActive = location === item.path;
          return (
            <Link 
              key={item.path} 
              href={item.path}
              aria-label={item.ariaLabel}
              className={`
                flex flex-col items-center justify-center flex-1 py-1.5 px-2
                ${isActive 
                  ? 'text-primary-lavender'
                  : 'text-neutral-dark hover:text-primary-lavender'}
                transition-all duration-200 rounded-xl
                ${isActive ? 'scale-110' : ''}
              `}
            >
              <div className={`
                flex items-center justify-center rounded-full w-10 h-10
                ${isActive 
                  ? 'bg-gradient-to-r from-primary-lavender/20 to-primary-mint/20' 
                  : 'bg-transparent'}
              `}>
                <item.icon size={20} strokeWidth={isActive ? 2.5 : 2} />
              </div>
              <span className="text-xs font-medium font-body mt-0.5">{item.label}</span>
              {isActive && (
                <div className="absolute bottom-0 w-8 h-1 rounded-t-full bg-primary-lavender" />
              )}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}