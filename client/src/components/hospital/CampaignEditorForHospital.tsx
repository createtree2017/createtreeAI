import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { useLocation } from "wouter";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";

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
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { ArrowLeft, Info, X, AlertTriangle } from "lucide-react";

// 캠페인 타입 정의
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
  // 병원 관리자는 병원 ID를 변경할 수 없음 (서버에서 자동 설정)
  startDate: z.string().optional().nullable(),
  endDate: z.string().optional().nullable(),
  announceDate: z.string().optional().nullable(),
  contentStartDate: z.string().optional().nullable(),
  contentEndDate: z.string().optional().nullable(),
  resultDate: z.string().optional().nullable(),
  rewardPoint: z.number().int().default(0).nullable(),
  status: z.string().default('draft')
});

type FormValues = z.infer<typeof formSchema>;

// 날짜 포맷팅 유틸리티 함수 (입력 필드용)
const formatDateForInput = (dateStr?: string | null) => {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) return '';
  
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  
  return `${year}-${month}-${day}`;
};

// 파일 업로드 함수
async function uploadImage(file: File) {
  const formData = new FormData();
  formData.append('image', file);
  
  const response = await fetch('/api/upload', {
    method: 'POST',
    body: formData,
  });
  
  if (!response.ok) {
    throw new Error('이미지 업로드에 실패했습니다');
  }
  
  const data = await response.json();
  return data.url;
}

export default function CampaignEditorForHospital({ campaign }: { campaign: ExtendedCampaign }) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const [bannerPreview, setBannerPreview] = useState<string | null>(campaign?.bannerImage ?? null);
  
  // 폼 초기화
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: campaign?.title ?? "",
      slug: campaign?.slug ?? "",
      description: campaign?.description ?? "",
      bannerImage: campaign?.bannerImage ?? "",
      thumbnailUrl: campaign?.thumbnailUrl ?? "",
      content: campaign?.content ?? "",
      isPublic: campaign?.isPublic ?? true,
      displayOrder: campaign?.displayOrder ?? 0,
      startDate: formatDateForInput(campaign?.startDate) || null,
      endDate: formatDateForInput(campaign?.endDate) || null,
      announceDate: formatDateForInput(campaign?.announceDate) || null,
      contentStartDate: formatDateForInput(campaign?.contentStartDate) || null,
      contentEndDate: formatDateForInput(campaign?.contentEndDate) || null,
      resultDate: formatDateForInput(campaign?.resultDate) || null,
      rewardPoint: campaign?.rewardPoint ?? 0,
      status: campaign?.status ?? 'draft'
    },
  });

  // 병원 정보 가져오기
  const { data: hospitalData } = useQuery<{id: number, name: string}>({
    queryKey: [`/api/hospitals/${user?.hospitalId}`],
    enabled: !!user?.hospitalId,
  });

  // 캠페인 업데이트 뮤테이션
  const updateMutation = useMutation({
    mutationFn: async (data: FormValues) => {
      const response = await apiRequest(`/api/admin/campaigns/${campaign.id}`, {
        method: "PATCH",
        data: data
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "캠페인 업데이트에 실패했습니다");
      }
      
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "캠페인이 업데이트되었습니다",
        description: "변경사항이 저장되었습니다.",
      });
      
      // 쿼리 캐시 무효화
      queryClient.invalidateQueries({ queryKey: ["/api/hospital/campaigns"] });
      queryClient.invalidateQueries({ queryKey: [`/api/admin/campaigns/${campaign.id}`] });
      
      // 목록 페이지로 돌아가기
      setLocation("/hospital/campaigns");
    },
    onError: (error: any) => {
      console.error("캠페인 업데이트 오류:", error);
      toast({
        title: "업데이트 실패",
        description: error.message || "캠페인을 업데이트하는데 문제가 발생했습니다",
        variant: "destructive",
      });
    },
  });

  // 폼 제출 처리
  const onSubmit = async (values: FormValues) => {
    // 상태값이 변경되었는지 확인하고 확인 요청 (draft → active로 변경 시)
    if (campaign.status === 'draft' && values.status === 'active') {
      if (!window.confirm('캠페인을 활성화하시겠습니까? 활성화된 캠페인은 사용자에게 공개됩니다.')) {
        return;
      }
    }
    
    updateMutation.mutate(values);
  };

  // 배너 이미지 업로드 처리
  const handleBannerUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    
    const file = e.target.files[0];
    try {
      const url = await uploadImage(file);
      form.setValue("bannerImage", url);
      setBannerPreview(url);
      toast({
        title: "이미지 업로드 성공",
        description: "배너 이미지가 업로드되었습니다.",
      });
    } catch (error) {
      console.error("이미지 업로드 오류:", error);
      toast({
        title: "이미지 업로드 실패",
        description: "배너 이미지 업로드에 실패했습니다.",
        variant: "destructive",
      });
    }
  };

  // 배너 이미지 제거
  const handleRemoveBanner = () => {
    form.setValue("bannerImage", "");
    setBannerPreview(null);
  };

  return (
    <div className="space-y-8">
      <div className="flex items-center">
        <Button
          variant="ghost"
          onClick={() => setLocation("/hospital/campaigns")}
          className="mr-2"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          뒤로 가기
        </Button>
      </div>

      <Alert className="mb-6 bg-blue-50 text-blue-800 border-blue-200">
        <Info className="h-4 w-4" />
        <AlertTitle>병원 전용 캠페인 수정</AlertTitle>
        <AlertDescription>
          병원 관리자는 본인 소속 병원의 캠페인만 수정할 수 있습니다.
          {hospitalData && (
            <div className="mt-2 font-semibold">
              소속 병원: {hospitalData.name}
            </div>
          )}
        </AlertDescription>
      </Alert>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>캠페인 제목</FormLabel>
                  <FormControl>
                    <Input placeholder="캠페인 제목을 입력하세요" {...field} />
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
                  <FormLabel>슬러그 (URL)</FormLabel>
                  <FormControl>
                    <Input placeholder="url-slug-example" {...field} />
                  </FormControl>
                  <FormDescription>
                    URL에 사용될 고유 식별자입니다. 소문자, 숫자, 하이픈(-)만 사용 가능합니다.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <FormField
            control={form.control}
            name="description"
            render={({ field }) => (
              <FormItem>
                <FormLabel>캠페인 설명</FormLabel>
                <FormControl>
                  <Textarea
                    placeholder="캠페인에 대한 간단한 설명을 입력하세요"
                    className="min-h-32"
                    {...field}
                    value={field.value || ""}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <Label>배너 이미지</Label>
              <div className="mt-2">
                <Input
                  type="file"
                  accept="image/*"
                  onChange={handleBannerUpload}
                />
              </div>
              {bannerPreview && (
                <div className="mt-4 relative">
                  <img
                    src={bannerPreview}
                    alt="배너 미리보기"
                    className="max-h-40 rounded-md object-cover"
                  />
                  <button
                    type="button"
                    onClick={handleRemoveBanner}
                    className="absolute top-2 right-2 bg-white rounded-full p-1 shadow-md"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              )}
            </div>

            <FormField
              control={form.control}
              name="thumbnailUrl"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>썸네일 URL</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="썸네일 이미지 URL"
                      {...field}
                      value={field.value || ""}
                    />
                  </FormControl>
                  <FormDescription>썸네일 이미지 URL을 입력하세요</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <FormField
              control={form.control}
              name="startDate"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>신청 시작일</FormLabel>
                  <FormControl>
                    <Input
                      type="date"
                      {...field}
                      value={field.value || ""}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="endDate"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>신청 마감일</FormLabel>
                  <FormControl>
                    <Input
                      type="date"
                      {...field}
                      value={field.value || ""}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <FormField
              control={form.control}
              name="announceDate"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>선정 발표일</FormLabel>
                  <FormControl>
                    <Input
                      type="date"
                      {...field}
                      value={field.value || ""}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="contentStartDate"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>콘텐츠 등록 시작일</FormLabel>
                  <FormControl>
                    <Input
                      type="date"
                      {...field}
                      value={field.value || ""}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="contentEndDate"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>콘텐츠 등록 마감일</FormLabel>
                  <FormControl>
                    <Input
                      type="date"
                      {...field}
                      value={field.value || ""}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <FormField
              control={form.control}
              name="resultDate"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>최종 결과 발표일</FormLabel>
                  <FormControl>
                    <Input
                      type="date"
                      {...field}
                      value={field.value || ""}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="rewardPoint"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>제공 포인트</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      placeholder="0"
                      {...field}
                      value={field.value || 0}
                      onChange={(e) => {
                        const value = e.target.value ? parseInt(e.target.value) : 0;
                        field.onChange(value);
                      }}
                    />
                  </FormControl>
                  <FormDescription>참여자에게 제공되는 포인트</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <FormField
              control={form.control}
              name="displayOrder"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>표시 순서</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      placeholder="0"
                      {...field}
                      onChange={(e) => {
                        const value = e.target.value ? parseInt(e.target.value) : 0;
                        field.onChange(value);
                      }}
                    />
                  </FormControl>
                  <FormDescription>
                    낮은 숫자가 더 위에 표시됩니다. 0이 가장 먼저 표시됩니다.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="status"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>상태</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    defaultValue={field.value}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="상태 선택" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="draft">작성대기</SelectItem>
                      <SelectItem value="active">모집중</SelectItem>
                      <SelectItem value="closed">마감</SelectItem>
                      <SelectItem value="completed">완료</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormDescription>
                    캠페인의 현재 상태입니다. 작성대기일 경우 사용자에게 표시되지 않습니다.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
          
          {/* 병원 정보 표시 (읽기 전용) */}
          <div className="col-span-2 mt-6">
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>병원 정보</AlertTitle>
              <AlertDescription>
                이 캠페인은 {hospitalData?.name || campaign?.hospitalName || "알 수 없는 병원"} 소속 캠페인입니다. 
                병원 관리자는 병원을 변경할 수 없습니다.
              </AlertDescription>
            </Alert>
          </div>

          <FormField
            control={form.control}
            name="isPublic"
            render={({ field }) => (
              <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                <div className="space-y-0.5">
                  <FormLabel className="text-base">
                    공개 여부
                  </FormLabel>
                  <FormDescription>
                    공개로 설정 시 캠페인이 사용자에게 표시됩니다.
                  </FormDescription>
                </div>
                <FormControl>
                  <Switch
                    checked={field.value}
                    onCheckedChange={field.onChange}
                  />
                </FormControl>
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="content"
            render={({ field }) => (
              <FormItem>
                <FormLabel>캠페인 상세 내용</FormLabel>
                <FormControl>
                  <Textarea
                    placeholder="캠페인의 상세 내용을 입력하세요"
                    className="min-h-64"
                    {...field}
                    value={field.value || ""}
                  />
                </FormControl>
                <FormDescription>
                  HTML을 포함한 마크다운 형식으로 작성할 수 있습니다.
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          <div className="flex justify-end space-x-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => setLocation("/hospital/campaigns")}
            >
              취소
            </Button>
            <Button
              type="submit"
              disabled={updateMutation.isPending}
            >
              {updateMutation.isPending ? "저장 중..." : "저장하기"}
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}