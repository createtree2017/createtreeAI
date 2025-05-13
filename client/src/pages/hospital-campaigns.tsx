import { useEffect } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/hooks/useAuth";
import CampaignTableForHospital from "@/components/hospital/CampaignTableForHospital";
import { Building2 } from "lucide-react";

export default function HospitalCampaignsPage() {
  const { user, isLoading } = useAuth();
  const [, setLocation] = useLocation();

  // 접근 권한 체크
  useEffect(() => {
    if (!isLoading && !user) {
      // 로그인되지 않은 경우
      setLocation("/auth");
      return;
    }
    
    if (!isLoading && user && (user.memberType !== 'hospital_admin' && user.memberType !== 'superadmin')) {
      // 병원 관리자 또는 슈퍼 관리자가 아닌 경우
      setLocation("/");
      return;
    }
    
    if (!isLoading && user && user.memberType === 'hospital_admin' && !user.hospitalId) {
      // 병원 관리자인데 병원 ID가 없는 경우
      setLocation("/auth");
      return;
    }
  }, [user, isLoading, setLocation]);

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-96">
        <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full"></div>
      </div>
    );
  }

  // 적절한 권한이 있는 경우에만 컴포넌트 렌더링
  if (!user || (user.memberType !== 'hospital_admin' && user.memberType !== 'superadmin')) {
    return (
      <div className="flex flex-col items-center justify-center h-96 text-center">
        <div className="bg-red-50 p-6 rounded-lg shadow-sm w-full max-w-md">
          <div className="text-red-500 mb-4 flex justify-center">
            <Building2 size={48} />
          </div>
          <h1 className="text-xl font-semibold text-red-700 mb-2">접근 권한이 없습니다</h1>
          <p className="text-slate-600">
            이 페이지는 병원 관리자 또는 슈퍼관리자만 접근할 수 있습니다.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-slate-800">병원 캠페인 관리</h1>
      </div>
      
      <div className="bg-white rounded-lg shadow-sm p-6">
        <CampaignTableForHospital />
      </div>
    </div>
  );
}