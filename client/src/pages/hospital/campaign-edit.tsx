import { useParams, useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { AlertTriangle } from "lucide-react";
import CampaignEditorForHospital from "@/components/hospital/CampaignEditorForHospital";
import { ExtendedCampaign } from "@/components/hospital/CampaignEditorForHospital";
import AccessDenied from "@/pages/access-denied";
import { getApi } from "@/lib/apiClient";

/**
 * 병원 관리자용 캠페인 수정 페이지
 * 
 * 이 페이지는 병원 관리자만 접근할 수 있으며, 자신의 병원 캠페인만 수정할 수 있습니다.
 * 슈퍼관리자용 페이지(/super/campaigns/edit/:id)와는 별도로 구현되어 있습니다.
 */
export default function HospitalCampaignEditPage() {
  const { id } = useParams<{ id: string }>();
  const [, setLocation] = useLocation();
  const { user } = useAuth();
  
  const campaignId = parseInt(id);

  // 캠페인 상세 정보 가져오기
  const { data: campaign, isLoading, error } = useQuery<ExtendedCampaign>({
    queryKey: [`/api/hospital/campaigns/${campaignId}`],
    // queryFn 추가: 병원 캠페인 데이터 가져오기
    queryFn: async () => {
      try {
        // getApi 도우미 함수 사용 - 자동으로 JSON 응답 반환
        return await getApi<ExtendedCampaign>(`/api/hospital/campaigns/${campaignId}`);
      } catch (error) {
        console.error("캠페인 조회 오류:", error);
        // 오류 객체에서 적절한 메시지 추출 후 다시 던지기
        const errorMessage = error instanceof Error 
          ? error.message 
          : "캠페인을 불러오는데 실패했습니다.";
        
        throw new Error(errorMessage);
      }
    },
    // 병원 관리자는 자신의 병원 캠페인만 편집할 수 있음
    enabled: !!campaignId && !!user,
    retry: false,
  });

  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-[70vh]">
        <Loader2 className="w-8 h-8 animate-spin" />
      </div>
    );
  }

  // 에러 처리
  if (error) {
    return (
      <div className="container py-8">
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>오류 발생</AlertTitle>
          <AlertDescription>
            {error instanceof Error ? error.message : "캠페인을 불러오는 중 오류가 발생했습니다."}
          </AlertDescription>
        </Alert>
        <div className="mt-4">
          <Button onClick={() => setLocation("/hospital/campaigns")}>
            돌아가기
          </Button>
        </div>
      </div>
    );
  }

  // 캠페인이 없는 경우
  if (!campaign) {
    return (
      <div className="container py-8">
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>캠페인을 찾을 수 없음</AlertTitle>
          <AlertDescription>
            요청하신 캠페인을 찾을 수 없습니다.
          </AlertDescription>
        </Alert>
        <div className="mt-4">
          <Button onClick={() => setLocation("/hospital/campaigns")}>
            돌아가기
          </Button>
        </div>
      </div>
    );
  }

  // 병원 관리자의 경우 본인 병원 캠페인만 편집 가능
  if (user?.memberType === "hospital_admin" && campaign.hospitalId !== user.hospitalId) {
    return <AccessDenied />;
  }

  return <CampaignEditorForHospital campaign={campaign} />;
}