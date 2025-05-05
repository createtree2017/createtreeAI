import React from 'react';
import { Link, useLocation } from 'wouter';
import { Home, Image, Music, MessageCircle, User, Award, ImagePlus, PencilLine } from 'lucide-react';

export default function Sidebar() {
  const [location] = useLocation();
  
  // 메뉴 그룹 정의
  const groups = [
    {
      id: 'main',
      title: '메인',
      items: [
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
      ]
    },
    {
      id: 'tools',
      title: 'AI 도구',
      items: [
        {
          path: '/image',
          icon: ImagePlus,
          label: '추억 예술',
          ariaLabel: '이미지 변환 페이지',
        },
        {
          path: '/music',
          icon: Music,
          label: '자장가',
          ariaLabel: '음악 생성 페이지',
        },
        {
          path: '/chat',
          icon: MessageCircle,
          label: 'AI 도우미',
          ariaLabel: 'AI 채팅 페이지',
        },
      ]
    },
    {
      id: 'personal',
      title: '개인',
      items: [
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
      ]
    }
  ];
  
  return (
    <aside className="h-full w-60 flex-shrink-0 bg-[#121212] text-white flex flex-col border-r border-neutral-800 overflow-y-auto custom-scrollbar">
      {/* 로고 */}
      <div className="p-4 mb-2">
        <Link href="/" className="flex items-center">
          <h1 className="text-xl font-semibold tracking-tight font-heading">
            <span className="text-white">Mom's</span> <span className="text-primary-lavender">Service</span>
          </h1>
        </Link>
      </div>

      {/* 메뉴 그룹 */}
      <div className="flex-1 flex flex-col gap-4">
        {groups.map((group) => (
          <div key={group.id} className="px-2">
            <div className="text-xs text-neutral-400 uppercase tracking-wider px-3 mb-1.5">
              {group.title}
            </div>
            <div className="space-y-0.5">
              {group.items.map((item) => {
                const isActive = location === item.path;
                return (
                  <Link
                    key={item.path}
                    href={item.path}
                    aria-label={item.ariaLabel}
                    className={`
                      flex items-center gap-3 px-3 py-2.5 rounded-md transition-colors
                      ${isActive 
                        ? 'bg-primary-lavender/20 text-primary-lavender' 
                        : 'text-neutral-300 hover:bg-white/5 hover:text-white'}
                    `}
                  >
                    <item.icon size={18} />
                    <span className="text-sm font-medium">{item.label}</span>
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </div>
      
      {/* 하단 버전 정보 */}
      <div className="p-4 text-xs text-neutral-500">
        Mom's Service v1.0
      </div>
    </aside>
  );
}