import React from 'react';
import { Link, useLocation } from 'wouter';
import { 
  Home, 
  Image, 
  Music, 
  MessageCircle, 
  User, 
  Award, 
  ImagePlus, 
  Settings,
  LogIn,
  PaintBucket,
  Music2,
  Users,
  Heart
} from 'lucide-react';

// 메뉴 아이템 타입 정의 추가
interface MenuItem {
  path: string;
  icon: React.ComponentType<any>;
  label: string;
  ariaLabel: string;
  new?: boolean; // optional new flag
}

// 메뉴 그룹 타입 정의 추가
interface MenuGroup {
  id: string;
  title: string;
  categoryId?: string; // optional for non-AI service categories
  items: MenuItem[];
}

export default function Sidebar({ collapsed = false }) {
  const [location] = useLocation();
  
  // 메뉴 그룹 정의 - 요청에 따라 재구성
  const groups: MenuGroup[] = [
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
      id: 'imageTools',
      title: 'AI 이미지 만들기',
      categoryId: 'image', // 관리자 공개/비공개 관리를 위한 카테고리 ID
      items: [
        {
          path: '/image',
          icon: ImagePlus,
          label: '만삭사진만들기',
          ariaLabel: '만삭사진만들기 페이지',
          new: true
        },
        {
          path: '/family-photo',
          icon: Image,
          label: '가족사진',
          ariaLabel: '가족사진 생성 페이지',
          new: true
        },
        {
          path: '/sticker',
          icon: PaintBucket,
          label: '스티커만들기',
          ariaLabel: '스티커 만들기 페이지',
        },
      ]
    },
    {
      id: 'musicTools',
      title: 'AI 노래 만들기',
      categoryId: 'music', // 관리자 공개/비공개 관리를 위한 카테고리 ID
      items: [
        {
          path: '/music',
          icon: Music2,
          label: '아기 주제가 만들기',
          ariaLabel: '아기 주제가 만들기 페이지',
          new: true
        },
      ]
    },
    {
      id: 'chatTools',
      title: 'AI 친구 만들기',
      categoryId: 'chat', // 관리자 공개/비공개 관리를 위한 카테고리 ID
      items: [
        {
          path: '/chat',
          icon: MessageCircle,
          label: '컨셉채팅 챗베프티',
          ariaLabel: '컨셉채팅 챗베프티 페이지',
        },
      ]
    },
    {
      id: 'personal',
      title: '내 메뉴',
      items: [
        {
          path: '/gallery',
          icon: Heart,
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
    },
    {
      id: 'admin',
      title: '관리자',
      items: [
        {
          path: '/admin',
          icon: Settings,
          label: '관리자 도구',
          ariaLabel: '관리자 도구 페이지',
        },
      ]
    }
  ];
  
  return (
    <aside className={`h-full flex-shrink-0 bg-[#121212] text-white flex flex-col border-r border-neutral-800 overflow-y-auto custom-scrollbar transition-all duration-300 ${
      collapsed ? "w-16" : "w-60"
    }`}>
      {/* 로고 */}
      <div className="p-4 mb-4">
        <Link href="/" className="flex items-center">
          {collapsed ? (
            <div className="w-8 h-8 rounded-full bg-primary-lavender/20 flex items-center justify-center">
              <span className="text-primary-lavender font-bold">M</span>
            </div>
          ) : (
            <h1 className="text-xl font-semibold tracking-tight font-heading">
              <span className="text-white">Mom's</span> <span className="text-primary-lavender">Service</span>
            </h1>
          )}
        </Link>
      </div>

      {/* 메뉴 그룹 */}
      <div className="flex-1 flex flex-col gap-5">
        {groups.map((group) => (
          <div key={group.id} className={`${collapsed ? "px-1" : "px-2"}`}>
            {!collapsed && (
              <div className="text-xs text-neutral-400 uppercase tracking-wider px-3 mb-2">
                {group.title}
              </div>
            )}
            <div className="space-y-1">
              {group.items.map((item) => {
                const isActive = location === item.path;
                return (
                  <Link
                    key={item.path}
                    href={item.path}
                    aria-label={item.ariaLabel}
                    className={`
                      flex items-center ${collapsed ? "justify-center" : "justify-between"} 
                      ${collapsed ? "px-2" : "px-3"} py-2.5 rounded-md transition-colors
                      ${isActive 
                        ? 'bg-primary-lavender/20 text-primary-lavender' 
                        : 'text-neutral-300 hover:bg-white/10 hover:text-white'}
                      relative
                    `}
                  >
                    <div className="flex items-center gap-3">
                      <item.icon size={20} strokeWidth={1.5} />
                      {!collapsed && (
                        <span className="text-sm font-medium">{item.label}</span>
                      )}
                    </div>
                    
                    {!collapsed && 'new' in item && item.new && (
                      <div className="flex-shrink-0 px-1.5 py-0.5 text-[10px] rounded bg-primary-lavender/20 text-primary-lavender font-semibold">
                        NEW
                      </div>
                    )}
                    
                    {collapsed && 'new' in item && item.new && (
                      <div className="absolute top-0 right-0 w-2 h-2 rounded-full bg-primary-lavender"></div>
                    )}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </div>
      
      {/* 상태 - 로그인/로그아웃 */}
      <div className={`p-4 ${collapsed ? "flex justify-center" : "flex items-center justify-between"} border-t border-neutral-800`}>
        {!collapsed && (
          <div className="text-xs text-neutral-400">
            상태
          </div>
        )}
        <Link 
          href="/login" 
          className="text-neutral-400 hover:text-primary-lavender transition-colors flex items-center gap-2" 
          aria-label="로그인"
        >
          {!collapsed && <span className="text-sm">로그인</span>}
          <LogIn size={collapsed ? 20 : 18} strokeWidth={1.5} />
        </Link>
      </div>
    </aside>
  );
}