import { useEffect } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/hooks/useAuth";
import CampaignTableForHospital from "@/components/hospital/CampaignTableForHospital";

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
    return null;
  }

  return (
    <div className="container mx-auto">
      <CampaignTableForHospital />
    </div>
  );
}