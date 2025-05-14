import { useEffect, useState } from "react";
import { useLocation, useParams } from "wouter";
import { Loader2 } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import CampaignEditorForHospital from "@/components/hospital/CampaignEditorForHospital";
import NotFound from "@/pages/not-found";
import AccessDenied from "@/pages/access-denied";

// 캠페인 타입
export type ExtendedCampaign = {
  id: number;
  slug: string;
  title: string;
  description?: string;
  bannerImage?: string;
  thumbnailUrl?: string;
  content?: string;
  isPublic: boolean;
  displayOrder: number;
  hospitalId?: number;
  hospitalName?: string;
  startDate?: string | null;
  endDate?: string | null;
  announceDate?: string | null;
  contentStartDate?: string | null;
  contentEndDate?: string | null;
  resultDate?: string | null;
  rewardPoint?: number;
  status?: string;
  createdAt?: string;
  updatedAt?: string;
};

export default function HospitalCampaignEditPage() {
  const { id } = useParams();
  const { user, isLoading: authLoading } = useAuth();
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const [notFound, setNotFound] = useState(false);
  const [accessDenied, setAccessDenied] = useState(false);

  // 캠페인 정보 조회
  const { data: campaign, isLoading } = useQuery<ExtendedCampaign>({
    queryKey: [`/api/admin/campaigns/${id}`],
    enabled: !!id && !authLoading && !!user,
    retry: false,
    onError: (error: any) => {
      console.error("캠페인 상세 조회 실패:", error);
      if (error.status === 404) {
        setNotFound(true);
      } else if (error.status === 403) {
        setAccessDenied(true);
        toast({
          title: "접근 권한 없음",
          description: "이 캠페인을 수정할 권한이 없습니다.",
          variant: "destructive"
        });
      } else {
        toast({
          title: "오류 발생",
          description: "캠페인 정보를 불러오는데 실패했습니다.",
          variant: "destructive"
        });
      }
    }
  });

  // 권한 체크
  useEffect(() => {
    if (!authLoading && user) {
      if (user.memberType !== 'hospital_admin') {
        setAccessDenied(true);
        toast({
          title: "접근 권한 없음",
          description: "병원 관리자만 접근할 수 있는 페이지입니다.",
          variant: "destructive"
        });
      } else if (campaign && user.hospitalId !== campaign.hospitalId) {
        setAccessDenied(true);
        toast({
          title: "접근 권한 없음",
          description: "본인 소속 병원의 캠페인만 수정할 수 있습니다.",
          variant: "destructive"
        });
      }
    }
  }, [user, authLoading, campaign, toast]);

  if (authLoading || isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <span className="ml-2">로딩 중...</span>
      </div>
    );
  }

  if (notFound) {
    return <NotFound />;
  }

  if (accessDenied) {
    return <AccessDenied />;
  }

  if (!campaign) {
    return <NotFound />;
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-6">병원 캠페인 수정</h1>
      <CampaignEditorForHospital campaign={campaign} />
    </div>
  );
}