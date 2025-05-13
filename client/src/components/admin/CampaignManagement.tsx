import { useState, useEffect } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Campaign, InsertCampaign } from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";

// 임시 인터페이스 - 백엔드에서 확장 데이터를 위해
interface ExtendedCampaign extends Campaign {
  hospitalName?: string;
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
  isPublic: z.boolean().default(true),
  displayOrder: z.number().int().default(0),
  hospitalId: z.number().optional().nullable()
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
      isPublic: true,
      displayOrder: 0,
      hospitalId: null
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
    if (editingCampaign) {
      updateMutation.mutate(values);
    } else {
      createMutation.mutate(values);
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
        isPublic: Boolean(campaign.isPublic),
        displayOrder: campaign.displayOrder || 0,
        hospitalId: campaign.hospitalId
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
        isPublic: true,
        displayOrder: 0,
        hospitalId: null
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
            <Select 
              value={selectedHospitalId?.toString() || ''} 
              onValueChange={(value) => setSelectedHospitalId(value ? parseInt(value) : undefined)}
            >
              <SelectTrigger className="w-full sm:w-[220px]">
                <SelectValue placeholder="병원 선택" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">모든 병원</SelectItem>
                {hospitals.map((hospital: any) => (
                  <SelectItem key={hospital.id} value={hospital.id.toString()}>
                    {hospital.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
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
                <TableHead>공개</TableHead>
                <TableHead>표시 순서</TableHead>
                <TableHead>작업</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={activeScope !== 'public' ? 6 : 5} className="text-center py-4">
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
                    <TableCell>{campaign.isPublic ? "공개" : "비공개"}</TableCell>
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
                      value={field.value?.toString() || ""} 
                      onValueChange={(value) => field.onChange(value ? parseInt(value) : null)}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="병원 선택 (선택하지 않으면 공개 캠페인)" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="">공개 캠페인</SelectItem>
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