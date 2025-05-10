import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { Settings, User as UserIcon, Calendar, Hospital, Download } from "lucide-react";
import { Link } from "wouter";

export default function Profile() {
  const { user } = useAuth();

  return (
    <div className="p-5 animate-fadeIn">
      {/* 헤더 */}
      <div className="text-center mb-6">
        <h2 className="font-heading font-bold text-2xl mb-2">마이페이지</h2>
        <p className="text-neutral-dark">나의 계정 정보</p>
      </div>
      
      {/* 프로필 정보 */}
      <div className="bg-white p-6 rounded-lg shadow-softer border border-neutral-light mb-6">
        <div className="flex flex-col md:flex-row items-center md:items-start gap-6">
          <div className="w-20 h-20 bg-primary-light rounded-full flex items-center justify-center">
            <UserAvatar className="w-10 h-10 text-primary" />
          </div>
          <div className="flex-1 text-center md:text-left">
            <h3 className="font-semibold text-xl">{user?.username || "사용자"}</h3>
            <p className="text-sm text-neutral-dark mb-4">{user?.email || "이메일 정보 없음"}</p>
            
            <div className="flex flex-col gap-3">
              <div className="flex items-center gap-2">
                <UserIcon className="w-4 h-4 text-primary" />
                <span className="text-sm font-medium text-neutral-dark">계정 유형:</span>
                <span className="text-sm">{user?.memberType || "일반 사용자"}</span>
              </div>
              
              {user?.hospitalId && (
                <div className="flex items-center gap-2">
                  <Hospital className="w-4 h-4 text-primary" />
                  <span className="text-sm font-medium text-neutral-dark">소속 병원:</span>
                  <span className="text-sm">병원 ID {user.hospitalId}</span>
                </div>
              )}
              
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-primary" />
                <span className="text-sm font-medium text-neutral-dark">가입일:</span>
                <span className="text-sm">
                  {user?.createdAt ? new Date(user.createdAt).toLocaleDateString() : "정보 없음"}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 계정 관련 메뉴 */}
      <div className="bg-white p-4 rounded-lg shadow-softer border border-neutral-light">
        <h3 className="font-semibold text-lg mb-4 px-2">계정 관리</h3>
        
        <ul className="space-y-1">
          <li className="hover:bg-neutral-lightest rounded-md transition-colors">
            <Link to="/gallery" className="flex items-center gap-3 p-3">
              <Download className="w-5 h-5 text-primary" />
              <span>나의 갤러리</span>
            </Link>
          </li>
          <li className="hover:bg-neutral-lightest rounded-md transition-colors">
            <Button variant="ghost" className="w-full justify-start gap-3 p-3 h-auto font-normal">
              <Settings className="w-5 h-5 text-primary" />
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