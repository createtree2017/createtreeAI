import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Loader2, CheckCircle, Clock, AlertCircle } from "lucide-react";
import { format } from "date-fns";
import { Badge } from "@/components/ui/badge";

type CampaignApplication = {
  id: number;
  campaignId: number;
  name: string;
  contact: string;
  memo?: string;
  status: "new" | "processing" | "done";
  createdAt: string;
  campaignTitle: string;
};

type Campaign = {
  id: number;
  title: string;
  slug: string;
};

export default function CampaignApplicationManagement() {
  const { toast } = useToast();
  const [selectedCampaignId, setSelectedCampaignId] = useState<string>("all");

  // 캠페인 목록 조회
  const { data: campaigns, isLoading: isLoadingCampaigns } = useQuery<Campaign[]>({
    queryKey: ["/api/admin/campaigns"],
  });

  // 신청자 목록 조회
  const { 
    data: applications, 
    isLoading: isLoadingApplications,
    refetch: refetchApplications, 
  } = useQuery<CampaignApplication[]>({
    queryKey: [
      "/api/admin/campaign-applications", 
      selectedCampaignId
    ],
    queryFn: async ({ queryKey }) => {
      const campaignId = queryKey[1];
      const url = campaignId !== "all" 
        ? `/api/admin/campaign-applications?campaignId=${campaignId}`
        : "/api/admin/campaign-applications";
      
      const response = await apiRequest(url, { method: "GET" });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "신청자 목록을 불러오는데 실패했습니다.");
      }
      return await response.json();
    }
  });

  // 신청 상태 업데이트 mutation
  const updateStatusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: number; status: string }) => {
      const response = await apiRequest(`/api/admin/campaign-applications/${id}`, {
        method: "PATCH",
        data: { status },
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "상태 업데이트 실패");
      }
      
      return await response.json();
    },
    onSuccess: () => {
      toast({
        title: "상태 업데이트 성공",
        description: "신청 상태가 변경되었습니다.",
      });
      // 신청 목록 다시 조회
      queryClient.invalidateQueries({ queryKey: ["/api/admin/campaign-applications"] });
    },
    onError: (error: Error) => {
      toast({
        title: "상태 업데이트 실패",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // 신청 상태 변경 핸들러
  const handleStatusChange = (id: number, status: string) => {
    updateStatusMutation.mutate({ id, status });
  };

  // 상태에 따른 색상 및 아이콘 결정
  const getStatusBadge = (status: string) => {
    switch (status) {
      case "new":
        return (
          <Badge variant="outline" className="bg-slate-100 text-slate-700 flex items-center gap-1">
            <AlertCircle className="h-3 w-3" />
            신규
          </Badge>
        );
      case "processing":
        return (
          <Badge variant="outline" className="bg-blue-100 text-blue-700 flex items-center gap-1">
            <Clock className="h-3 w-3" />
            처리중
          </Badge>
        );
      case "done":
        return (
          <Badge variant="outline" className="bg-green-100 text-green-700 flex items-center gap-1">
            <CheckCircle className="h-3 w-3" />
            완료
          </Badge>
        );
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  // 행 색상 결정
  const getRowStyle = (status: string) => {
    switch (status) {
      case "new":
        return "bg-slate-50";
      case "processing":
        return "bg-blue-50";
      case "done":
        return "bg-green-50";
      default:
        return "";
    }
  };

  // 다음 상태로 순환
  const getNextStatus = (status: string): string => {
    const statusCycle: Record<string, string> = {
      new: "processing",
      processing: "done",
      done: "new",
    };
    return statusCycle[status] || "new";
  };

  if (isLoadingCampaigns || isLoadingApplications) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <span className="ml-2">로딩 중...</span>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-bold">캠페인 신청 관리</h2>
        <div className="flex items-center gap-2">
          <Select
            value={selectedCampaignId}
            onValueChange={setSelectedCampaignId}
          >
            <SelectTrigger className="w-[250px]">
              <SelectValue placeholder="캠페인 선택" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">모든 캠페인</SelectItem>
              {Array.isArray(campaigns) && campaigns.map((campaign) => (
                <SelectItem key={campaign.id} value={String(campaign.id)}>
                  {campaign.title}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button
            variant="outline"
            size="sm"
            onClick={() => refetchApplications()}
            disabled={updateStatusMutation.isPending}
          >
            {updateStatusMutation.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin mr-1" />
            ) : (
              "새로고침"
            )}
          </Button>
        </div>
      </div>

      {!Array.isArray(applications) || applications.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-64 text-center p-4 border rounded-lg bg-muted/10">
          <p className="text-muted-foreground mb-2">신청자가 없습니다.</p>
          <p className="text-sm text-muted-foreground">
            선택한 캠페인에 대한 신청자가 없거나 아직 신청이 들어오지 않았습니다.
          </p>
        </div>
      ) : (
        <div className="border rounded-md overflow-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[80px]">번호</TableHead>
                <TableHead className="w-[150px]">이름</TableHead>
                <TableHead className="w-[180px]">연락처</TableHead>
                <TableHead>캠페인</TableHead>
                <TableHead>메모</TableHead>
                <TableHead className="w-[120px]">신청일</TableHead>
                <TableHead className="w-[100px]">상태</TableHead>
                <TableHead className="w-[100px]">상태 변경</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {applications.map((application: CampaignApplication) => (
                <TableRow 
                  key={application.id}
                  className={getRowStyle(application.status)}
                >
                  <TableCell className="font-medium">{application.id}</TableCell>
                  <TableCell>{application.name}</TableCell>
                  <TableCell>{application.contact}</TableCell>
                  <TableCell>{application.campaignTitle}</TableCell>
                  <TableCell className="max-w-[300px] truncate">
                    {application.memo || "-"}
                  </TableCell>
                  <TableCell>
                    {format(new Date(application.createdAt), "yy.MM.dd HH:mm")}
                  </TableCell>
                  <TableCell>{getStatusBadge(application.status)}</TableCell>
                  <TableCell>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => 
                        handleStatusChange(application.id, getNextStatus(application.status))
                      }
                      disabled={updateStatusMutation.isPending}
                      title={`${application.status === 'new' ? '처리중으로 변경' : application.status === 'processing' ? '완료로 변경' : '신규로 변경'}`}
                    >
                      {updateStatusMutation.isPending ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        "상태 변경"
                      )}
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}