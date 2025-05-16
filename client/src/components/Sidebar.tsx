import React from 'react';
import { Link, useLocation } from 'wouter';
import { useQuery } from '@tanstack/react-query';
import { getMenu } from '@/lib/apiClient';
import { useAuth } from '@/hooks/useAuth';
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
  Heart,
  Layers,
  BarChart3,
  MessageSquare,
  LayoutGrid,
  ClipboardList,
  Building2
} from 'lucide-react';
// LogOut 아이콘 개별 임포트
import { LogOut } from 'lucide-react';

// API에서 반환되는 메뉴 아이템 타입
interface ApiMenuItem {
  id: number;
  title: string;
  path: string;
  iconName: string;  // 아이콘 이름 필드 추가
}

// API에서 반환되는 메뉴 카테고리 타입
interface ApiMenuCategory {
  id: number;
  title: string;
  icon: string;    // 카테고리 아이콘 필드
  items: ApiMenuItem[];
}

// 표시용 메뉴 아이템 타입 정의
interface MenuItem {
  path: string;
  icon: React.ComponentType<any>;
  label: string;
  ariaLabel: string;
  new?: boolean; // optional new flag
}

// 메뉴 그룹 타입 정의
interface MenuGroup {
  id: string;
  title: string;
  items: MenuItem[];
}

export default function Sidebar({ collapsed = false }) {
  const [location] = useLocation();
  const { user } = useAuth();
  
  // API 메뉴 데이터 가져오기
  const { data: apiMenu = [], isLoading } = useQuery({
    queryKey: ['menu'],
    queryFn: getMenu
  });
  
  // 정적 메뉴 그룹 정의 (관리자용, 개인용 메뉴 등)
  const staticGroups: MenuGroup[] = [
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
          path: '/suno-music',
          icon: Music,
          label: 'Suno AI 음악',
          ariaLabel: 'Suno AI 음악 생성 페이지',
          new: true,
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
      id: 'hospital',
      title: '병원 관리',
      items: [
        {
          path: '/hospital/campaigns',
          icon: ClipboardList,
          label: '병원 캠페인 관리',
          ariaLabel: '병원 캠페인 관리 페이지',
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
  
  // 경로 기반으로 적절한 아이콘 결정
  const getIconByPath = (path: string) => {
    if (path.includes('image')) return ImagePlus;
    if (path.includes('family')) return Users;
    if (path.includes('sticker')) return PaintBucket;
    if (path.includes('music')) return Music2;
    if (path.includes('chat')) return MessageCircle;
    return Layers; // 기본 아이콘
  };
  
  // 아이콘 컴포넌트 맵핑 함수
  const getIconComponent = (iconName: string) => {
    const iconMap: {[key: string]: React.ComponentType<any>} = {
      'image': Image,
      'music': Music2,
      'message-circle': MessageCircle,
      'message-square': MessageSquare,
      'layers': Layers,
      'bar-chart': BarChart3,
      'heart': Heart,
      'user': User,
      'home': Home,
      'award': Award,
      'settings': Settings,
      'image-plus': ImagePlus,
      'paint-bucket': PaintBucket,
      'baby': ImagePlus,
      'users': Users,
      'sticker': PaintBucket,
      'heart-pulse': Heart,
      'stethoscope': MessageSquare,
      'layout': LayoutGrid
    };
    
    return iconMap[iconName] || Layers; // 기본값으로 Layers 아이콘 사용
  };
  
  // API에서 동적으로 받아온 카테고리 그룹 변환
  const dynamicGroups = React.useMemo(() => {
    if (!apiMenu || apiMenu.length === 0) return [];
    
    // 각 API 카테고리를 MenuGroup 형태로 변환
    return apiMenu.map((category: ApiMenuCategory, index: number) => {
      // 카테고리 ID 생성 (고유 식별자)
      const categoryId = `dynamic-${index}`;
      
      // 카테고리 아이템을 MenuItem 형태로 변환
      const items: MenuItem[] = category.items.map((item: ApiMenuItem) => {
        console.log('아이템 디버깅:', item);
        return {
          path: item.path,
          icon: item.iconName ? getIconComponent(item.iconName) : getIconByPath(item.path),  // 아이콘 이름이 있으면 사용, 아니면 경로로 추정
          label: item.title,
          ariaLabel: `${item.title} 페이지`,
        };
      });
      
      return {
        id: categoryId,
        title: category.title,
        items: items
      };
    });
  }, [apiMenu]);
  
  // 정적 그룹과 동적 그룹 결합 (메인 메뉴가 항상 위에 오도록 정렬)
  const allGroups = React.useMemo(() => {
    // 메인 메뉴 항목을 찾아 맨 앞에 배치
    const mainGroup = staticGroups.find(group => group.id === 'main');
    
    // 정적 그룹 중 권한에 맞는 그룹만 필터링
    const filteredStaticGroups = staticGroups.filter(group => {
      // main과 personal 그룹은 항상 표시
      if (group.id === 'main' || group.id === 'personal') return true;
      
      // hospital 그룹은 병원 관리자와 슈퍼관리자에게만 표시
      if (group.id === 'hospital') {
        return user?.memberType === 'hospital_admin' || user?.memberType === 'superadmin';
      }
      
      // admin 그룹은 슈퍼관리자에게만 표시
      if (group.id === 'admin') {
        return user?.memberType === 'superadmin';
      }
      
      return false;
    });
    
    const otherFilteredGroups = filteredStaticGroups.filter(group => group.id !== 'main');
    
    // 메인 -> 동적 메뉴(서비스 메뉴) -> 기타 정적 메뉴 순서로 배치
    return mainGroup 
      ? [mainGroup, ...dynamicGroups, ...otherFilteredGroups] 
      : [...dynamicGroups, ...filteredStaticGroups];
  }, [dynamicGroups, staticGroups, user?.memberType]);

  return (
    <aside 
      className={`h-full flex-shrink-0 bg-[#121212] text-white flex flex-col border-r border-neutral-800 overflow-y-auto custom-scrollbar transition-all duration-300 ${
        collapsed ? "w-16" : "w-60"
      }`}
    >
      {/* 로고 */}
      <div className="p-4 mb-4">
        <Link href="/" className="flex items-center">
          {collapsed ? (
            <div className="w-8 h-8 rounded-full bg-primary-lavender/20 flex items-center justify-center">
              <span className="text-primary-lavender font-bold">M</span>
            </div>
          ) : (
            <h1 className="text-xl font-semibold tracking-tight font-heading">
              <span className="text-white">맘스</span> <span className="text-primary-lavender">서비스</span>
            </h1>
          )}
        </Link>
      </div>

      {/* 메뉴 그룹 */}
      <div className="flex-1 flex flex-col gap-5">
        {allGroups.map((group) => (
          <div key={group.id} className={`${collapsed ? "px-1" : "px-2"}`}>
            {!collapsed && (
              <div className="text-xs text-neutral-400 uppercase tracking-wider px-3 mb-2">
                {group.title}
              </div>
            )}
            <div className="space-y-1">
              {group.items.map((item: MenuItem) => {
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
                    
                    {!collapsed && item.new && (
                      <div className="flex-shrink-0 px-1.5 py-0.5 text-[10px] rounded bg-primary-lavender/20 text-primary-lavender font-semibold">
                        신규
                      </div>
                    )}
                    
                    {collapsed && item.new && (
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
        <button 
          onClick={() => {
            // 단순화된 로그아웃 처리 - 직접 API 호출 (인증 정보 포함)
            fetch("/api/auth/logout", {
              method: "POST",
              credentials: 'include' // 쿠키 전송을 위해 필수
            }).then(() => {
              // 로컬 스토리지 토큰 삭제
              localStorage.removeItem("accessToken");
              // 로그아웃 성공 알림
              alert("로그아웃 되었습니다.");
              // 홈페이지로 리디렉션
              window.location.href = "/";
            }).catch(err => {
              console.error("로그아웃 실패:", err);
              alert("로그아웃에 실패했습니다.");
            });
          }}
          className="text-neutral-400 hover:text-primary-lavender transition-colors flex items-center gap-2 cursor-pointer" 
          aria-label="로그아웃"
        >
          {!collapsed && <span className="text-sm">로그아웃</span>}
          <LogIn size={collapsed ? 20 : 18} strokeWidth={1.5} />
        </button>
      </div>
    </aside>
  );
}