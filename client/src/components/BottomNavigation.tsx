import React from 'react';
import { Link, useLocation } from 'wouter';
import { Home, Image, ImagePlus, Music, MessageCircle, User, Award, LogIn } from 'lucide-react';
import { useAuthContext } from '@/lib/AuthProvider';

export default function BottomNavigation() {
  const [location] = useLocation();
  const { user } = useAuthContext();
  
  const navItems = [
    {
      path: '/',
      icon: Home,
      label: '홈',
      ariaLabel: '홈 페이지',
    },
    {
      path: '/image',
      icon: ImagePlus,
      label: '추억 예술',
      ariaLabel: '이미지 변환 페이지',
      new: true,
    },
    {
      path: '/music',
      icon: Music,
      label: '자장가',
      ariaLabel: '음악 생성 페이지',
      new: true,
    },
    {
      path: '/chat',
      icon: MessageCircle,
      label: 'AI 도우미',
      ariaLabel: 'AI 채팅 페이지',
    },
    // 로그인 상태에 따라 갤러리 또는 로그인 버튼 표시
    user ? {
      path: '/gallery',
      icon: Image,
      label: '갤러리',
      ariaLabel: '갤러리 페이지',
    } : {
      path: '/test',
      icon: LogIn,
      label: '테스트',
      ariaLabel: '테스트 페이지',
      highlight: true,
    },
  ];

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 safe-area-bottom">
      <nav className="flex items-center justify-between bg-[#121212] border-t border-neutral-800 px-1 h-16">
        {navItems.map((item) => {
          const isActive = location === item.path;
          return (
            <Link 
              key={item.path} 
              to={item.path}
              aria-label={item.ariaLabel}
              className={`
                flex flex-col items-center justify-center flex-1 py-1 px-1 relative
                ${isActive 
                  ? 'text-primary-lavender'
                  : 'text-neutral-400 hover:text-white'}
                transition-all duration-200
              `}
            >
              <div className={`
                flex items-center justify-center w-8 h-8
                ${isActive 
                  ? 'bg-primary-lavender/10 rounded-lg' 
                  : item.highlight 
                    ? 'bg-primary-lavender/10 rounded-lg'
                    : 'bg-transparent'}
              `}>
                <item.icon 
                  size={20} 
                  strokeWidth={isActive || item.highlight ? 2 : 1.5} 
                  className={item.highlight ? 'text-primary-lavender' : ''} 
                />
              </div>
              <span className={`text-xs font-medium mt-1 ${item.highlight ? 'text-primary-lavender' : ''}`}>{item.label}</span>
              
              {/* 신규 배지 */}
              {item.new && (
                <div className="absolute -top-1 right-0 px-1 py-0.5 text-[8px] rounded-sm bg-primary-lavender/20 text-primary-lavender font-bold">
                  신규
                </div>
              )}
              
              {/* 활성 항목 표시 */}
              {isActive && (
                <div className="absolute -bottom-1 w-6 h-0.5 rounded-full bg-primary-lavender" />
              )}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}