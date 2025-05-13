import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { useAuth } from "@/hooks/useAuth";
import { Campaign } from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

// 날짜 포맷팅 유틸리티 함수
const formatDate = (dateStr?: string | null) => {
  if (!dateStr) return '미설정';
  const date = new Date(dateStr);
  // 유효한 날짜인지 확인
  if (isNaN(date.getTime())) return '미설정';
  return date.toLocaleDateString('ko-KR', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).replace(/\.\s/g, '.'); // "2025.06.01" 형식으로 변환
};

// 임시 인터페이스 - 백엔드에서 확장 데이터를 위해
interface ExtendedCampaign {
  id: number;
  slug: string;
  title: string;
  description: string | null;
  bannerImage: string | null;
  isPublic: boolean;
  displayOrder: number;
  hospitalId: number | null;
  createdAt: Date | null;
  updatedAt: Date | null;
  // 확장 필드
  hospitalName?: string | null;
  hospitalSlug?: string | null;
  // 날짜 필드들(프론트에서는 string으로 처리)
  startDate: string | null;
  endDate: string | null;
  announceDate: string | null;
  contentStartDate: string | null;
  contentEndDate: string | null;
  resultDate: string | null;
  // 기타 필드
  rewardPoint: number | null;
  thumbnailUrl: string | null;
  content: string | null;
  status: string | null;
}

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";

// 상태값과 한글 레이블 매핑
const STATUS_MAP = {
  draft: '작성대기',
  active: '모집중',
  closed: '마감',
  completed: '완료'
};

// 캠페인 가져오기 함수
const getHospitalCampaigns = async (status?: string) => {
  let url = "/api/hospital/campaigns";
  if (status && status !== 'all') {
    url += `?status=${status}`;
  }
  
  console.log(`병원 캠페인 API 호출: ${url} (상태: ${status || 'all'})`);
  
  const response = await fetch(url, {
    credentials: "include"
  });
  
  if (!response.ok) {
    throw new Error("캠페인 목록을 가져오는데 실패했습니다");
  }
  
  const data = await response.json();
  console.log(`병원 캠페인 데이터 수신: ${data.length}개`);
  return data;
};

export default function CampaignTableForHospital() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [activeStatus, setActiveStatus] = useState<string>('all');

  // 캠페인 데이터 가져오기
  const { data = [], isLoading } = useQuery<ExtendedCampaign[]>({
    queryKey: ["/api/hospital/campaigns", activeStatus],
    queryFn: () => getHospitalCampaigns(activeStatus),
    enabled: !!user,
  });

  // 상세 페이지로 이동
  const handleViewDetail = (slug: string) => {
    window.location.href = `/campaigns/${slug}`;
  };

  // 디버깅 로그 - 문제 확인용
  console.log(`현재 탭: ${activeStatus}, 데이터 개수: ${data.length}`);
  data.forEach((campaign, index) => {
    console.log(`캠페인 ${index+1}: ID=${campaign.id}, 제목=${campaign.title}, 상태=${campaign.status}`);
  });

  return (
    <div className="p-6">
      <div className="flex flex-col gap-4">
        <div className="flex justify-between items-center">
          <h2 className="text-xl font-bold">병원 캠페인 관리</h2>
          {user?.hospitalId && (
            <div className="text-sm bg-blue-50 text-blue-600 px-2 py-1 rounded-md">
              {user.hospitalId} 번 병원 관리자
            </div>
          )}
        </div>
        
        <div className="flex flex-col sm:flex-row gap-4">
          <Tabs value={activeStatus} onValueChange={(value) => {
            console.log(`탭 변경: ${value}`);
            setActiveStatus(value);
          }} className="w-full sm:w-auto">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="all">전체</TabsTrigger>
              <TabsTrigger value="active">모집중</TabsTrigger>
              <TabsTrigger value="draft">작성대기</TabsTrigger>
              <TabsTrigger value="closed">마감</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
      </div>

      {isLoading ? (
        <div className="flex justify-center p-8">
          <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full"></div>
        </div>
      ) : (
        <div className="mt-4">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>제목</TableHead>
                <TableHead>슬러그</TableHead>
                <TableHead>상태</TableHead>
                <TableHead>기간</TableHead>
                <TableHead>공개</TableHead>
                <TableHead>포인트</TableHead>
                <TableHead>표시 순서</TableHead>
                <TableHead>작업</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-4">
                    생성된 캠페인이 없습니다.
                  </TableCell>
                </TableRow>
              ) : (
                data.map((campaign) => (
                  <TableRow key={campaign.id}>
                    <TableCell>{campaign.title}</TableCell>
                    <TableCell>{campaign.slug}</TableCell>
                    <TableCell>
                      <Badge variant={
                        campaign.status === 'active' ? 'default' :
                        campaign.status === 'draft' ? 'outline' :
                        campaign.status === 'closed' ? 'secondary' :
                        campaign.status === 'completed' ? 'destructive' :
                        'outline'
                      }>
                        {STATUS_MAP[campaign.status as keyof typeof STATUS_MAP] || campaign.status || '초안'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {formatDate(campaign.startDate)} ~ {formatDate(campaign.endDate)}
                    </TableCell>
                    <TableCell>{campaign.isPublic ? "공개" : "비공개"}</TableCell>
                    <TableCell>{campaign.rewardPoint || 0}</TableCell>
                    <TableCell>{campaign.displayOrder || 0}</TableCell>
                    <TableCell>
                      <div className="flex space-x-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => window.location.href = `/admin?tab=campaigns&edit=${campaign.id}`}
                        >
                          수정
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleViewDetail(campaign.slug)}
                        >
                          상세
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}