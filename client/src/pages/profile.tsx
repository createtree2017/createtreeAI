import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { Settings, User as UserIcon, Calendar, Hospital, Download, Building2 } from "lucide-react";
import { Link } from "wouter";
import { useQuery } from "@tanstack/react-query";

// 역할 및 멤버 타입 한글 맵핑
const MEMBER_TYPE_MAP: Record<string, string> = {
  'superadmin': '슈퍼관리자',
  'hospital_admin': '병원 관리자',
  'admin': '관리자',
  'user': '일반 사용자'
};

// 날짜 포맷팅 함수
const formatDate = (dateStr?: string | Date | null) => {
  if (!dateStr) return '설정되지 않음';
  const date = new Date(dateStr);
  // 유효한 날짜인지 확인
  if (isNaN(date.getTime())) return '설정되지 않음';
  return date.toLocaleDateString('ko-KR', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).replace(/\.\s/g, '.'); // "2025.06.01" 형식으로 변환
};

// 병원 정보 인터페이스
interface Hospital {
  id: number;
  name: string;
  slug: string | null;
  description: string | null;
  contactEmail: string | null;
  contactPhone: string | null;
  address: string | null;
  contractStartDate: Date | null;
  contractEndDate: Date | null;
  createdAt: Date | null;
  updatedAt: Date | null;
}

export default function Profile() {
  const { user } = useAuth();
  
  // 병원 관리자인 경우 병원 정보 가져오기
  const { data: hospital, isLoading: isLoadingHospital } = useQuery<Hospital>({
    queryKey: [`/api/hospitals/${user?.hospitalId}`],
    queryFn: async () => {
      if (!user?.hospitalId) return null;
      const response = await fetch(`/api/hospitals/${user.hospitalId}`, {
        credentials: 'include'
      });
      if (!response.ok) {
        throw new Error('병원 정보를 가져오는데 실패했습니다.');
      }
      return response.json();
    },
    enabled: !!user?.hospitalId,
  });

  return (
    <div className="p-5 animate-fadeIn">
      {/* 헤더 */}
      <div className="text-center mb-6">
        <h2 className="text-2xl font-bold mb-2">마이페이지</h2>
        <p className="text-neutral-600">나의 계정 정보</p>
      </div>
      
      {/* 프로필 정보 - Suno 스타일 */}
      <div className="bg-white p-6 rounded-2xl shadow-md border border-purple-100 mb-6">
        <div className="flex flex-col md:flex-row items-center md:items-start gap-6">
          <div className="w-20 h-20 bg-purple-100 rounded-full flex items-center justify-center">
            <UserAvatar className="w-10 h-10 text-purple-600" />
          </div>
          <div className="flex-1 text-center md:text-left">
            <h3 className="font-bold text-xl text-purple-800">{user?.username || "사용자"}</h3>
            <p className="text-sm text-purple-500 mb-4">{user?.email || "이메일 정보 없음"}</p>
            
            <div className="flex flex-col gap-3">
              <div className="flex items-center gap-2">
                <UserIcon className="w-4 h-4 text-purple-600" />
                <span className="text-sm font-medium text-purple-700">계정 유형:</span>
                <span className="text-sm text-purple-800">{user?.memberType ? MEMBER_TYPE_MAP[user.memberType] || user.memberType : "일반 사용자"}</span>
              </div>
              
              {user?.hospitalId && (
                <>
                  <div className="flex items-center gap-2">
                    <Building2 className="w-4 h-4 text-purple-600" />
                    <span className="text-sm font-medium text-purple-700">소속 병원:</span>
                    <span className="text-sm text-purple-800">
                      {isLoadingHospital ? "로딩 중..." : (hospital?.name || `병원 ID ${user.hospitalId}`)}
                    </span>
                  </div>
                  
                  {hospital?.contractStartDate && (
                    <div className="flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-purple-600" />
                      <span className="text-sm font-medium text-purple-700">계약 기간:</span>
                      <span className="text-sm text-purple-800">
                        {formatDate(hospital.contractStartDate)} ~ {formatDate(hospital.contractEndDate)}
                      </span>
                    </div>
                  )}
                </>
              )}
              
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-purple-600" />
                <span className="text-sm font-medium text-purple-700">가입일:</span>
                <span className="text-sm text-purple-800">
                  {user?.createdAt ? formatDate(user.createdAt) : "정보 없음"}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 계정 관련 메뉴 */}
      <div className="bg-white p-4 rounded-2xl shadow-md border border-purple-100">
        <h3 className="font-bold text-lg mb-4 px-2 text-purple-800">계정 관리</h3>
        
        <ul className="space-y-2">
          <li>
            <Link to="/gallery" className="group flex items-center gap-3 p-3 bg-purple-50 hover:bg-purple-100 rounded-xl transition-colors">
              <Download className="w-5 h-5 text-purple-600" />
              <span className="text-purple-800 group-hover:text-purple-900">나의 갤러리</span>
            </Link>
          </li>
          <li>
            <Button variant="ghost" className="w-full justify-start gap-3 p-3 h-auto font-normal bg-purple-50 hover:bg-purple-100 rounded-xl text-purple-800 hover:text-purple-900">
              <Settings className="w-5 h-5 text-purple-600" />
              <span>계정 설정</span>
            </Button>
          </li>
        </ul>
      </div>
    </div>
  );
}

// User 아이콘 컴포넌트
const UserAvatar = ({ className }: { className?: string }) => {
  return (
    <svg 
      xmlns="http://www.w3.org/2000/svg" 
      viewBox="0 0 24 24" 
      fill="none" 
      stroke="currentColor" 
      strokeWidth="2" 
      strokeLinecap="round" 
      strokeLinejoin="round" 
      className={className}
    >
      <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"></path>
      <circle cx="12" cy="7" r="4"></circle>
    </svg>
  );
};