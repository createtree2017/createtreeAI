import { useState, useEffect } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Campaign, InsertCampaign } from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";

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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { FileUpload } from "@/components/ui/file-upload";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";

// 캠페인 가져오기 함수
const getCampaigns = async (scope: string, hospitalId?: number) => {
  let url = "/api/admin/campaigns";
  
  if (scope === "hospital" && hospitalId) {
    url += `?hospitalId=${hospitalId}`;
  } else if (scope === "hospital") {
    url += "?onlyHospital=true";
  } else if (scope === "public") {
    url += "?onlyPublic=true";
  }
  
  const response = await apiRequest(url);
  return response.json();
};

// 병원 목록 가져오기 함수
const getHospitals = async () => {
  const response = await apiRequest("/api/hospitals");
  return response.json();
};

// 양식 스키마
const formSchema = z.object({
  title: z.string().min(2, "캠페인 제목은 최소 2자 이상이어야 합니다."),
  slug: z.string().min(2, "슬러그는 최소 2자 이상이어야 합니다.").regex(/^[a-z0-9-]+$/, "슬러그는 소문자, 숫자, 하이픈(-)만 사용 가능합니다."),
  description: z.string().optional(),
  bannerImage: z.string().optional(),
  thumbnailUrl: z.string().optional(),
  content: z.string().optional(),
  isPublic: z.boolean().default(true),
  displayOrder: z.number().int().default(0),
  hospitalId: z.number().optional().nullable(),
  // 새로운 필드들 추가
  startDate: z.string().optional().nullable(),
  endDate: z.string().optional().nullable(),
  announceDate: z.string().optional().nullable(),
  contentStartDate: z.string().optional().nullable(),
  contentEndDate: z.string().optional().nullable(),
  resultDate: z.string().optional().nullable(),
  rewardPoint: z.number().int().default(0).nullable(),
  status: z.string().default('draft')
});

export default function CampaignManagement() {
  const { toast } = useToast();
  const [isOpen, setIsOpen] = useState(false);
  const [editingCampaign, setEditingCampaign] = useState<ExtendedCampaign | null>(null);
  const [bannerFile, setBannerFile] = useState<File | null>(null);
  const [bannerPreview, setBannerPreview] = useState<string | null>(null);
  const [activeScope, setActiveScope] = useState<'all' | 'public' | 'hospital'>('all');
  const [selectedHospitalId, setSelectedHospitalId] = useState<number | undefined>(undefined);

  // 폼 설정
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: "",
      slug: "",
      description: "",
      bannerImage: "",
      thumbnailUrl: "",
      content: "",
      isPublic: true,
      displayOrder: 0,
      hospitalId: null,
      // 새로운 필드들 기본값
      startDate: null,
      endDate: null,
      announceDate: null,
      contentStartDate: null,
      contentEndDate: null,
      resultDate: null,
      rewardPoint: 0,
      status: 'draft'
    }
  });

  // 병원 데이터 가져오기
  const { data: hospitals = [] } = useQuery({
    queryKey: ["/api/hospitals"],
    queryFn: getHospitals
  });

  // 캠페인 데이터 가져오기
  const { data = [], isLoading } = useQuery<ExtendedCampaign[]>({
    queryKey: ["/api/admin/campaigns", activeScope, selectedHospitalId],
    queryFn: () => getCampaigns(activeScope, selectedHospitalId),
  });

  // 배너 이미지 업로드 함수
  const uploadBanner = async (file: File) => {
    if (!file) return null;
    
    const formData = new FormData();
    formData.append("file", file);
    
    const response = await fetch("/api/admin/upload-thumbnail", {
      method: "POST",
      body: formData
    });
    
    if (!response.ok) {
      throw new Error("배너 이미지 업로드 실패");
    }
    
    const data = await response.json();
    return data.url;
  };

  // 생성 뮤테이션
  const createMutation = useMutation({
    mutationFn: async (data: any) => {
      // 배너 업로드
      if (bannerFile) {
        const bannerUrl = await uploadBanner(bannerFile);
        if (bannerUrl) {
          data.bannerImage = bannerUrl;
        }
      }
      
      const response = await apiRequest("/api/admin/campaigns", {
        method: "POST",
        data: data
      });
      return response.json();
    },
    onSuccess: () => {
      toast({ title: "성공", description: "캠페인이 생성되었습니다." });
      setIsOpen(false);
      queryClient.invalidateQueries({queryKey: ["/api/admin/campaigns"]});
      setBannerFile(null);
      setBannerPreview(null);
      form.reset();
    },
    onError: (error) => {
      console.error("캠페인 생성 오류:", error);
      toast({ 
        title: "오류", 
        description: "캠페인 생성 중 오류가 발생했습니다.",
        variant: "destructive" 
      });
    }
  });

  // 수정 뮤테이션
  const updateMutation = useMutation({
    mutationFn: async (data: any) => {
      // 배너 업로드
      if (bannerFile) {
        const bannerUrl = await uploadBanner(bannerFile);
        if (bannerUrl) {
          data.bannerImage = bannerUrl;
        }
      }
      
      const response = await apiRequest(`/api/admin/campaigns/${editingCampaign?.id}`, {
        method: "PATCH",
        data: data
      });
      return response.json();
    },
    onSuccess: () => {
      toast({ title: "성공", description: "캠페인이 수정되었습니다." });
      setIsOpen(false);
      queryClient.invalidateQueries({queryKey: ["/api/admin/campaigns"]});
      setEditingCampaign(null);
      setBannerFile(null);
      setBannerPreview(null);
      form.reset();
    },
    onError: (error) => {
      console.error("캠페인 수정 오류:", error);
      toast({ 
        title: "오류", 
        description: "캠페인 수정 중 오류가 발생했습니다.",
        variant: "destructive" 
      });
    }
  });

  // 폼 제출 핸들러
  const onSubmit = (values: z.infer<typeof formSchema>) => {
    // 디버깅용 로그 추가
    console.log("🎯 제출되는 값:", values);
    
    if (editingCampaign) {
      // 수정 시에는 기존 값 유지
      updateMutation.mutate(values);
    } else {
      // 생성 시 슬러그 중복 방지
      const timestamp = new Date().getTime().toString().slice(-6);
      const uniqueSlug = `${values.slug}-${timestamp}`;
      
      // 로그로 확인
      console.log("🆕 생성 데이터:", {
        ...values,
        slug: uniqueSlug
      });
      
      // 신규 슬러그로 교체하여 제출
      createMutation.mutate({
        ...values,
        slug: uniqueSlug
      });
    }
  };

  // 대화상자 열기 핸들러
  const openModal = (mode: 'create' | 'edit', campaign?: ExtendedCampaign) => {
    setIsOpen(true);
    
    if (mode === 'edit' && campaign) {
      setEditingCampaign(campaign);
      form.reset({
        title: campaign.title,
        slug: campaign.slug,
        description: campaign.description || "",
        bannerImage: campaign.bannerImage || "",
        thumbnailUrl: campaign.thumbnailUrl || "",
        content: campaign.content || "",
        isPublic: Boolean(campaign.isPublic),
        displayOrder: campaign.displayOrder || 0,
        hospitalId: campaign.hospitalId,
        // 새로운 필드들 설정 - ISO 문자열을 yyyy-MM-dd 형식으로 변환
        startDate: campaign.startDate ? new Date(campaign.startDate).toISOString().split('T')[0] : null,
        endDate: campaign.endDate ? new Date(campaign.endDate).toISOString().split('T')[0] : null,
        announceDate: campaign.announceDate ? new Date(campaign.announceDate).toISOString().split('T')[0] : null,
        contentStartDate: campaign.contentStartDate ? new Date(campaign.contentStartDate).toISOString().split('T')[0] : null,
        contentEndDate: campaign.contentEndDate ? new Date(campaign.contentEndDate).toISOString().split('T')[0] : null,
        resultDate: campaign.resultDate ? new Date(campaign.resultDate).toISOString().split('T')[0] : null,
        rewardPoint: campaign.rewardPoint || 0,
        status: campaign.status || 'draft'
      });
      
      // 배너 이미지 미리보기 설정
      if (campaign.bannerImage) {
        setBannerPreview(campaign.bannerImage);
      } else {
        setBannerPreview(null);
      }
    } else {
      setEditingCampaign(null);
      form.reset({
        title: "",
        slug: "",
        description: "",
        bannerImage: "",
        thumbnailUrl: "",
        content: "",
        isPublic: true,
        displayOrder: 0,
        hospitalId: null,
        startDate: null,
        endDate: null,
        announceDate: null,
        contentStartDate: null,
        contentEndDate: null,
        resultDate: null,
        rewardPoint: 0,
        status: 'draft'
      });
      setBannerPreview(null);
    }
  };

  // 파일 선택 핸들러
  const handleFileChange = (file: File) => {
    setBannerFile(file);
    
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setBannerPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    } else {
      setBannerPreview(null);
    }
  };

  // 편집 버튼 컴포넌트
  const EditButton = ({ campaign }: { campaign: ExtendedCampaign }) => (
    <div className="flex space-x-2">
      <Button
        variant="outline"
        size="sm"
        onClick={() => openModal('edit', campaign)}
      >
        수정
      </Button>
    </div>
  );

  return (
    <div className="p-6">
      <div className="flex flex-col gap-4">
        <div className="flex justify-between items-center">
          <h2 className="text-xl font-bold">캠페인 관리</h2>
          <Button onClick={() => openModal('create')}>
            + 새 캠페인 만들기
          </Button>
        </div>
        
        <div className="flex flex-col sm:flex-row gap-4">
          <Tabs value={activeScope} onValueChange={(value) => {
            setActiveScope(value as 'all' | 'public' | 'hospital');
            // 스코프 변경 시 병원 선택 초기화
            if (value !== 'hospital') {
              setSelectedHospitalId(undefined);
            }
          }} className="w-full sm:w-auto">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="all">전체</TabsTrigger>
              <TabsTrigger value="public">공개 캠페인</TabsTrigger>
              <TabsTrigger value="hospital">병원 캠페인</TabsTrigger>
            </TabsList>
          </Tabs>
          
          {activeScope === 'hospital' && (
            <>
              {hospitals.length === 0 ? (
                <div className="text-sm text-yellow-600 bg-yellow-50 p-2 rounded-md">
                  병원을 먼저 등록해주세요
                </div>
              ) : (
                <Select 
                  value={selectedHospitalId?.toString() || 'all'} 
                  onValueChange={(value) => setSelectedHospitalId(value !== 'all' ? parseInt(value) : undefined)}
                >
                  <SelectTrigger className="w-full sm:w-[220px]">
                    <SelectValue placeholder="병원 선택" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">모든 병원</SelectItem>
                    {hospitals.map((hospital: any) => (
                      <SelectItem key={hospital.id} value={hospital.id.toString()}>
                        {hospital.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </>
          )}
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
                {activeScope !== 'public' && <TableHead>병원</TableHead>}
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
                  <TableCell colSpan={activeScope !== 'public' ? 9 : 8} className="text-center py-4">
                    생성된 캠페인이 없습니다. 새 캠페인을 만들어보세요.
                  </TableCell>
                </TableRow>
              ) : (
                data.map((campaign) => (
                  <TableRow key={campaign.id}>
                    <TableCell>{campaign.title}</TableCell>
                    <TableCell>{campaign.slug}</TableCell>
                    {activeScope !== 'public' && (
                      <TableCell>
                        {'hospitalName' in campaign && campaign.hospitalName ? campaign.hospitalName : (campaign.hospitalId ? `병원 ID: ${campaign.hospitalId}` : '일반(공개)')}
                      </TableCell>
                    )}
                    <TableCell>
                      <span className={`px-2 py-1 text-xs rounded-full ${
                        campaign.status === 'active' ? 'bg-green-100 text-green-800' :
                        campaign.status === 'draft' ? 'bg-gray-100 text-gray-800' :
                        campaign.status === 'closed' ? 'bg-yellow-100 text-yellow-800' :
                        campaign.status === 'completed' ? 'bg-blue-100 text-blue-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {
                          campaign.status === 'active' ? '활성화' :
                          campaign.status === 'draft' ? '초안' :
                          campaign.status === 'closed' ? '마감' :
                          campaign.status === 'completed' ? '완료' :
                          campaign.status || '초안'
                        }
                      </span>
                    </TableCell>
                    <TableCell>
                      {formatDate(campaign.startDate)} ~ {formatDate(campaign.endDate)}
                    </TableCell>
                    <TableCell>{campaign.isPublic ? "공개" : "비공개"}</TableCell>
                    <TableCell>{campaign.rewardPoint || 0}</TableCell>
                    <TableCell>{campaign.displayOrder || 0}</TableCell>
                    <TableCell>
                      <EditButton campaign={campaign} />
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      )}

      {/* 캠페인 생성/수정 대화상자 */}
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>
              {editingCampaign ? "캠페인 수정" : "새 캠페인 만들기"}
            </DialogTitle>
            <DialogDescription>
              {editingCampaign
                ? "캠페인 정보를 업데이트하세요."
                : "새 캠페인의 정보를 입력하세요."}
            </DialogDescription>
          </DialogHeader>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="title"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>제목</FormLabel>
                    <FormControl>
                      <Input placeholder="캠페인 제목" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="slug"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>슬러그</FormLabel>
                    <FormControl>
                      <Input placeholder="url-slug-format" {...field} />
                    </FormControl>
                    <FormDescription>
                      URL에 사용될 고유 식별자입니다 (예: summer-event)
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>설명</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="캠페인에 대한 설명을 입력하세요"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="space-y-2">
                <FormLabel>배너 이미지</FormLabel>
                <FileUpload
                  onFileSelect={handleFileChange}
                  accept="image/*"
                  maxSize={5 * 1024 * 1024} // 5MB
                />
                {bannerPreview && (
                  <div className="mt-2">
                    <p className="text-sm text-muted-foreground mb-1">미리보기:</p>
                    <img
                      src={bannerPreview}
                      alt="배너 미리보기"
                      className="w-full h-40 object-cover rounded-md"
                    />
                  </div>
                )}
              </div>

              <FormField
                control={form.control}
                name="isPublic"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                    <div className="space-y-0.5">
                      <FormLabel>공개 여부</FormLabel>
                      <FormDescription>
                        이 캠페인을 사용자에게 보여줄지 설정합니다
                      </FormDescription>
                    </div>
                    <FormControl>
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="displayOrder"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>표시 순서</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        {...field}
                        onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                      />
                    </FormControl>
                    <FormDescription>
                      숫자가 낮을수록 먼저 표시됩니다
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="hospitalId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>병원</FormLabel>
                    <Select 
                      value={field.value?.toString() || "null"} 
                      onValueChange={(value) => field.onChange(value !== "null" ? parseInt(value) : null)}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="병원 선택 (선택하지 않으면 공개 캠페인)" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="null">공개 캠페인</SelectItem>
                        {hospitals.map((hospital: any) => (
                          <SelectItem key={hospital.id} value={hospital.id.toString()}>
                            {hospital.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormDescription>
                      캠페인을 특정 병원에 연결하려면 병원을 선택하세요. 선택하지 않으면 공개 캠페인이 됩니다.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              {/* 상태 선택 필드 */}
              <FormField
                control={form.control}
                name="status"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>상태</FormLabel>
                    <Select 
                      value={field.value} 
                      onValueChange={field.onChange}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="캠페인 상태 선택" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="draft">초안</SelectItem>
                        <SelectItem value="active">활성화</SelectItem>
                        <SelectItem value="closed">마감</SelectItem>
                        <SelectItem value="completed">완료</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormDescription>
                      캠페인의 현재 상태를 선택하세요.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              {/* 날짜 필드들 */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="startDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>시작일</FormLabel>
                      <FormControl>
                        <Input
                          type="date"
                          value={field.value || ""}
                          onChange={(e) => field.onChange(e.target.value || null)}
                        />
                      </FormControl>
                      <FormDescription>
                        캠페인 시작 날짜
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="endDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>종료일</FormLabel>
                      <FormControl>
                        <Input
                          type="date"
                          value={field.value || ""}
                          onChange={(e) => field.onChange(e.target.value || null)}
                        />
                      </FormControl>
                      <FormDescription>
                        캠페인 종료 날짜
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="announceDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>발표일</FormLabel>
                      <FormControl>
                        <Input
                          type="date"
                          value={field.value || ""}
                          onChange={(e) => field.onChange(e.target.value || null)}
                        />
                      </FormControl>
                      <FormDescription>
                        당첨자 발표 날짜
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="resultDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>결과 게시일</FormLabel>
                      <FormControl>
                        <Input
                          type="date"
                          value={field.value || ""}
                          onChange={(e) => field.onChange(e.target.value || null)}
                        />
                      </FormControl>
                      <FormDescription>
                        결과 게시 날짜
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="contentStartDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>컨텐츠 시작일</FormLabel>
                      <FormControl>
                        <Input
                          type="date"
                          value={field.value || ""}
                          onChange={(e) => field.onChange(e.target.value || null)}
                        />
                      </FormControl>
                      <FormDescription>
                        컨텐츠 제공 시작 날짜
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="contentEndDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>컨텐츠 종료일</FormLabel>
                      <FormControl>
                        <Input
                          type="date"
                          value={field.value || ""}
                          onChange={(e) => field.onChange(e.target.value || null)}
                        />
                      </FormControl>
                      <FormDescription>
                        컨텐츠 제공 종료 날짜
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              
              {/* 보상 포인트 */}
              <FormField
                control={form.control}
                name="rewardPoint"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>보상 포인트</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        value={field.value?.toString() || "0"}
                        onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                        onBlur={field.onBlur}
                        name={field.name}
                        ref={field.ref}
                      />
                    </FormControl>
                    <FormDescription>
                      참여자에게 지급될 포인트 (0: 보상 없음)
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              {/* 컨텐츠 필드 - 리치 에디터로 대체 가능 */}
              <FormField
                control={form.control}
                name="content"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>컨텐츠</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="캠페인 상세 내용을 입력하세요"
                        className="min-h-[200px]"
                        {...field}
                      />
                    </FormControl>
                    <FormDescription>
                      캠페인 상세 페이지에 표시될 내용
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              {/* 썸네일 URL 필드 */}
              <FormField
                control={form.control}
                name="thumbnailUrl"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>썸네일 URL (선택사항)</FormLabel>
                    <FormControl>
                      <Input placeholder="https://example.com/image.jpg" {...field} />
                    </FormControl>
                    <FormDescription>
                      캠페인 목록에 표시될 작은 썸네일 이미지 URL
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <DialogFooter>
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => setIsOpen(false)}
                >
                  취소
                </Button>
                <Button 
                  type="submit" 
                  disabled={createMutation.isPending || updateMutation.isPending}
                >
                  {(createMutation.isPending || updateMutation.isPending) && (
                    <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-background border-t-transparent"></div>
                  )}
                  {editingCampaign ? "수정" : "생성"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}