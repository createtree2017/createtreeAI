import { useState, useEffect } from 'react';
import { Link, useLocation } from 'wouter';
import { cn } from '@/lib/utils';
import { useHospital, Hospital } from '@/lib/HospitalContext';
import { useQuery } from '@tanstack/react-query';
import {
  HospitalIcon, UsersIcon, CalendarIcon, TagIcon, StarIcon, GiftIcon, 
  Settings, Building2Icon
} from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

// 슈퍼관리자 네비게이션 항목
const navItems = [
  { 
    href: '/super/dashboard', 
    label: '대시보드', 
    icon: <Building2Icon className="w-5 h-5" /> 
  },
  { 
    href: '/super/hospitals', 
    label: '병원 관리', 
    icon: <HospitalIcon className="w-5 h-5" /> 
  },
  { 
    href: '/super/users', 
    label: '회원 관리', 
    icon: <UsersIcon className="w-5 h-5" />,
    requiresHospital: false
  },
  { 
    href: '/super/campaigns', 
    label: '캠페인 관리', 
    icon: <CalendarIcon className="w-5 h-5" />,
    requiresHospital: true
  },
  { 
    href: '/super/dreambook-styles', 
    label: '태몽동화 스타일', 
    icon: <StarIcon className="w-5 h-5" />,
    requiresHospital: false
  },
  { 
    href: '/super/promos', 
    label: '프로모션 코드', 
    icon: <TagIcon className="w-5 h-5" />,
    requiresHospital: true
  },
  { 
    href: '/super/reviews', 
    label: '후기 관리', 
    icon: <StarIcon className="w-5 h-5" />,
    requiresHospital: true
  },
  { 
    href: '/super/rewards', 
    label: '리워드 관리', 
    icon: <GiftIcon className="w-5 h-5" />,
    requiresHospital: true
  },
  { 
    href: '/super/settings', 
    label: '설정', 
    icon: <Settings className="w-5 h-5" /> 
  }
];

export function SuperAdminLayout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();
  const { selectedHospital, selectHospital, clearSelectedHospital } = useHospital();
  
  // 전체 병원 목록 가져오기
  const { data: hospitals = [], isLoading: isHospitalsLoading } = useQuery<Hospital[]>({
    queryKey: ['/api/super/hospitals'],
    queryFn: async () => {
      const response = await fetch('/api/super/hospitals', {
        credentials: 'include'
      });
      if (!response.ok) {
        throw new Error('병원 목록을 불러오는데 실패했습니다');
      }
      return response.json();
    }
  });
  
  // 선택된 병원 ID 변경 처리
  const handleHospitalChange = (hospitalId: string) => {
    if (hospitalId === "all") {
      // 전체 병원 선택 시 병원 선택 해제
      clearSelectedHospital();
    } else if (hospitals) {
      const hospital = hospitals.find(h => h.id.toString() === hospitalId);
      if (hospital) {
        selectHospital(hospital);
      }
    }
  };
  
  return (
    <div className="flex h-screen overflow-hidden bg-background">
      {/* 사이드바 */}
      <div className="hidden md:flex md:w-64 md:flex-col">
        <div className="flex flex-col flex-grow border-r border-border bg-card">
          <div className="h-16 flex items-center px-4 border-b border-border">
            <h1 className="text-xl font-bold text-foreground">슈퍼관리자</h1>
          </div>
          
          {/* 병원 선택 드롭다운 */}
          <div className="px-4 py-3 border-b border-border">
            <label className="text-sm font-medium text-muted-foreground mb-1 block">
              병원 선택
            </label>
            <Select 
              value={selectedHospital?.id.toString() || ""} 
              onValueChange={handleHospitalChange}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="병원을 선택해주세요" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem key="all" value="all">전체 병원</SelectItem>
                {hospitals?.map(hospital => (
                  <SelectItem key={hospital.id} value={hospital.id.toString()}>
                    {hospital.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <div className="text-xs text-muted-foreground mt-1">
              {selectedHospital ? `${selectedHospital.name} 선택됨` : '병원 선택 필요'}
            </div>
          </div>
          
          {/* 네비게이션 메뉴 */}
          <nav className="flex-1 px-2 py-4 space-y-1 overflow-y-auto">
            {navItems.map((item) => {
              // 병원 필요 항목의 경우 선택된 병원이 없으면 비활성화
              const isDisabled = item.requiresHospital && !selectedHospital;
              
              return (
                <Link
                  key={item.href}
                  href={isDisabled ? '#' : item.href}
                  onClick={(e) => isDisabled && e.preventDefault()}
                  className={cn(
                    "group flex items-center px-2 py-2 text-sm font-medium rounded-md",
                    location === item.href
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:bg-muted",
                    isDisabled && "opacity-50 cursor-not-allowed"
                  )}
                >
                  {item.icon}
                  <span className="ml-3">{item.label}</span>
                </Link>
              );
            })}
          </nav>
        </div>
      </div>
      
      {/* 메인 콘텐츠 */}
      <div className="flex flex-col flex-1 overflow-hidden">
        {/* 모바일 헤더 */}
        <header className="bg-card border-b border-border p-4 md:hidden">
          <div className="flex items-center justify-between">
            <h1 className="text-lg font-bold text-foreground">슈퍼관리자</h1>
            {/* 모바일 메뉴 버튼 (필요 시 구현) */}
          </div>
        </header>
        
        {/* 헤더 - 현재 페이지 제목 및 병원 선택 (태블릿/데스크톱) */}
        <header className="hidden md:flex bg-card border-b border-border h-16 items-center px-6 justify-between">
          <h2 className="text-xl font-semibold text-foreground">
            {navItems.find(item => item.href === location)?.label || '슈퍼관리자'}
          </h2>
          
          {/* 병원 선택 정보 표시 */}
          {selectedHospital && (
            <div className="flex items-center text-sm">
              <HospitalIcon className="w-4 h-4 mr-1 text-muted-foreground" />
              <span>{selectedHospital.name}</span>
            </div>
          )}
        </header>
        
        {/* 콘텐츠 영역 */}
        <main className="flex-1 overflow-y-auto p-6 bg-background">
          {/* 모바일 전용 병원 선택 드롭다운 */}
          <div className="md:hidden mb-4">
            <Select 
              value={selectedHospital?.id.toString() || ""} 
              onValueChange={handleHospitalChange}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="병원을 선택해주세요" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem key="all" value="all">전체 병원</SelectItem>
                {hospitals?.map(hospital => (
                  <SelectItem key={hospital.id} value={hospital.id.toString()}>
                    {hospital.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          {/* 병원 선택 경고 메시지 */}
          {!selectedHospital && location.includes('/super/') && 
           !location.includes('/super/dashboard') && 
           !location.includes('/super/hospitals') && 
           !location.includes('/super/settings') &&
           !location.includes('/super/users') && (
            <div className="bg-amber-50 border-l-4 border-amber-400 p-4 mb-4 dark:bg-amber-950 dark:border-amber-600">
              <div className="flex">
                <div className="flex-shrink-0">
                  <svg className="h-5 w-5 text-amber-400 dark:text-amber-300" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                    <path fillRule="evenodd" d="M8.485 3.495c.673-1.167 2.357-1.167 3.03 0l6.28 10.875c.673 1.167-.17 2.625-1.516 2.625H3.72c-1.347 0-2.189-1.458-1.515-2.625L8.485 3.495zM10 6a.75.75 0 01.75.75v3.5a.75.75 0 01-1.5 0v-3.5A.75.75 0 0110 6zm0 9a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="ml-3">
                  <p className="text-sm text-amber-700 dark:text-amber-300">
                    병원을 선택해야 이 기능을 사용할 수 있습니다. 좌측 메뉴에서, 병원을 선택해주세요.
                  </p>
                </div>
              </div>
            </div>
          )}
          
          {/* 자식 컴포넌트 렌더링 */}
          {children}
        </main>
      </div>
    </div>
  );
}