import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Trash2, Edit, Plus, X, FileImage } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";

// 이미지 템플릿 유형
const TEMPLATE_TYPES = [
  { value: "background", label: "배경" },
  { value: "frame", label: "프레임" },
  { value: "overlay", label: "오버레이" },
  { value: "blend", label: "혼합" },
  { value: "face", label: "얼굴" },
];

// 폼 유효성 검증 스키마
const templateSchema = z.object({
  title: z.string().min(1, "제목을 입력해주세요"),
  description: z.string().optional(),
  templateImageUrl: z.string().min(1, "템플릿 이미지 URL을 입력해주세요"),
  templateType: z.string().min(1, "템플릿 유형을 선택해주세요"),
  promptTemplate: z.string().min(1, "프롬프트 템플릿을 입력해주세요"),
  maskArea: z.any().optional(),
  thumbnailUrl: z.string().optional(),
  categoryId: z.string().optional(),
  isActive: z.boolean().default(true),
  isFeatured: z.boolean().default(false),
  sortOrder: z.number().default(0),
});

type TemplateFormData = z.infer<typeof templateSchema>;

export default function ImageTemplateManagement() {
  const [isOpen, setIsOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<any>(null);
  const [uploadedImage, setUploadedImage] = useState<File | null>(null);
  const [uploadedImageUrl, setUploadedImageUrl] = useState<string>("");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // 폼 설정
  const form = useForm<TemplateFormData>({
    resolver: zodResolver(templateSchema),
    defaultValues: {
      title: "",
      description: "",
      templateImageUrl: "",
      templateType: "",
      promptTemplate: "",
      maskArea: null,
      thumbnailUrl: "",
      categoryId: "",
      isActive: true,
      isFeatured: false,
      sortOrder: 0,
    },
  });

  // 템플릿 목록 조회
  const { data: templates = [], isLoading } = useQuery({
    queryKey: ["/api/image-templates"],
    queryFn: () => apiRequest({ url: "/api/image-templates" }),
  });

  // 템플릿 생성
  const createMutation = useMutation({
    mutationFn: (data: TemplateFormData) =>
      apiRequest({
        url: "/api/image-templates",
        method: "POST",
        data,
      }),
    onSuccess: () => {
      toast({
        title: "성공",
        description: "템플릿이 생성되었습니다.",
      });
      setIsOpen(false);
      queryClient.invalidateQueries({ queryKey: ["/api/image-templates"] });
      resetForm();
    },
    onError: (error) => {
      toast({
        title: "오류",
        description: "템플릿 생성 중 오류가 발생했습니다.",
        variant: "destructive",
      });
      console.error("Failed to create template:", error);
    },
  });

  // 템플릿 업데이트
  const updateMutation = useMutation({
    mutationFn: (data: TemplateFormData & { id: number }) => {
      const { id, ...updateData } = data;
      return apiRequest({
        url: `/api/image-templates/${id}`,
        method: "PUT",
        data: updateData,
      });
    },
    onSuccess: () => {
      toast({
        title: "성공",
        description: "템플릿이 업데이트되었습니다.",
      });
      setIsOpen(false);
      queryClient.invalidateQueries({ queryKey: ["/api/image-templates"] });
      resetForm();
    },
    onError: (error) => {
      toast({
        title: "오류",
        description: "템플릿 업데이트 중 오류가 발생했습니다.",
        variant: "destructive",
      });
      console.error("Failed to update template:", error);
    },
  });

  // 템플릿 삭제
  const deleteMutation = useMutation({
    mutationFn: (id: number) =>
      apiRequest({
        url: `/api/image-templates/${id}`,
        method: "DELETE",
      }),
    onSuccess: () => {
      toast({
        title: "성공",
        description: "템플릿이 삭제되었습니다.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/image-templates"] });
    },
    onError: (error) => {
      toast({
        title: "오류",
        description: "템플릿 삭제 중 오류가 발생했습니다.",
        variant: "destructive",
      });
      console.error("Failed to delete template:", error);
    },
  });

  // 이미지 업로드 처리
  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setUploadedImage(file);
      
      // 이미지 미리보기 URL 생성
      const imageUrl = URL.createObjectURL(file);
      setUploadedImageUrl(imageUrl);
      
      // 이미지 URL을 폼에 설정
      form.setValue("templateImageUrl", imageUrl);
    }
  };

  // 템플릿 편집 시작
  const handleEdit = (template: any) => {
    setEditingTemplate(template);
    form.reset({
      title: template.title,
      description: template.description || "",
      templateImageUrl: template.templateImageUrl,
      templateType: template.templateType,
      promptTemplate: template.promptTemplate,
      maskArea: template.maskArea,
      thumbnailUrl: template.thumbnailUrl || "",
      categoryId: template.categoryId || "",
      isActive: template.isActive,
      isFeatured: template.isFeatured,
      sortOrder: template.sortOrder || 0,
    });
    
    // 이미 있는 이미지 URL 설정
    setUploadedImageUrl(template.templateImageUrl);
    
    setIsOpen(true);
  };

  // 폼 제출 처리
  const onSubmit = (data: TemplateFormData) => {
    // 편집 모드
    if (editingTemplate) {
      updateMutation.mutate({ ...data, id: editingTemplate.id });
    } 
    // 생성 모드
    else {
      createMutation.mutate(data);
    }
  };

  // 폼 초기화
  const resetForm = () => {
    form.reset({
      title: "",
      description: "",
      templateImageUrl: "",
      templateType: "",
      promptTemplate: "",
      maskArea: null,
      thumbnailUrl: "",
      categoryId: "",
      isActive: true,
      isFeatured: false,
      sortOrder: 0,
    });
    setUploadedImage(null);
    setUploadedImageUrl("");
    setEditingTemplate(null);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between">
        <h2 className="text-2xl font-bold">이미지 템플릿 관리</h2>
        <Button onClick={() => {
          resetForm();
          setIsOpen(true);
        }}>
          <Plus className="mr-2 h-4 w-4" />
          템플릿 추가
        </Button>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-8">
          <div className="animate-pulse">데이터 로딩 중...</div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {templates.length === 0 ? (
            <div className="col-span-full text-center py-8 text-muted-foreground">
              등록된 이미지 템플릿이 없습니다. 새 템플릿을 추가해주세요.
            </div>
          ) : (
            templates.map((template: any) => (
              <Card key={template.id} className="overflow-hidden">
                <CardHeader className="pb-2">
                  <CardTitle className="flex justify-between items-center">
                    <span className="truncate">{template.title}</span>
                    <span className="text-xs px-2 py-1 rounded-full bg-primary/20 text-primary">{
                      TEMPLATE_TYPES.find(t => t.value === template.templateType)?.label || template.templateType
                    }</span>
                  </CardTitle>
                </CardHeader>
                
                <CardContent className="p-0">
                  <div className="relative aspect-video overflow-hidden bg-muted">
                    {template.templateImageUrl ? (
                      <img 
                        src={template.templateImageUrl} 
                        alt={template.title}
                        className="object-cover w-full h-full" 
                      />
                    ) : (
                      <div className="flex items-center justify-center h-full">
                        <FileImage className="h-12 w-12 text-muted-foreground" />
                      </div>
                    )}
                    
                    <div className="absolute top-2 right-2 flex gap-1">
                      {template.isActive ? 
                        <span className="inline-flex items-center rounded-full bg-green-100 px-2 py-1 text-xs font-medium text-green-700">활성</span> : 
                        <span className="inline-flex items-center rounded-full bg-gray-100 px-2 py-1 text-xs font-medium text-gray-600">비활성</span>
                      }
                      
                      {template.isFeatured && 
                        <span className="inline-flex items-center rounded-full bg-amber-100 px-2 py-1 text-xs font-medium text-amber-700">추천</span>
                      }
                    </div>
                  </div>
                  
                  <div className="p-4">
                    <p className="text-sm text-muted-foreground line-clamp-2">
                      {template.description || "설명 없음"}
                    </p>
                  </div>
                </CardContent>
                
                <CardFooter className="flex justify-between pt-0">
                  <Button 
                    variant="ghost" 
                    size="sm"
                    onClick={() => handleEdit(template)}
                  >
                    <Edit className="h-4 w-4 mr-1" />
                    편집
                  </Button>
                  
                  <Button 
                    variant="ghost" 
                    size="sm"
                    className="text-destructive hover:text-destructive"
                    onClick={() => {
                      if (confirm(`정말 "${template.title}" 템플릿을 삭제하시겠습니까?`)) {
                        deleteMutation.mutate(template.id);
                      }
                    }}
                  >
                    <Trash2 className="h-4 w-4 mr-1" />
                    삭제
                  </Button>
                </CardFooter>
              </Card>
            ))
          )}
        </div>
      )}

      {/* 템플릿 추가/편집 다이얼로그 */}
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="sm:max-w-[600px] max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingTemplate ? "템플릿 편집" : "새 템플릿 추가"}
            </DialogTitle>
          </DialogHeader>
          
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* 템플릿 이미지 업로드 */}
                <div className="md:col-span-2">
                  <FormLabel>템플릿 이미지</FormLabel>
                  <div className="mt-2 flex flex-col items-center">
                    <div className="w-full h-[200px] bg-muted rounded-md mb-4 flex items-center justify-center overflow-hidden relative">
                      {uploadedImageUrl ? (
                        <>
                          <img 
                            src={uploadedImageUrl} 
                            alt="템플릿 이미지 미리보기" 
                            className="object-contain max-w-full max-h-full"
                          />
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="absolute top-2 right-2 bg-background/80 rounded-full"
                            onClick={() => {
                              setUploadedImage(null);
                              setUploadedImageUrl("");
                              form.setValue("templateImageUrl", "");
                            }}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </>
                      ) : (
                        <div className="text-center">
                          <FileImage className="mx-auto h-10 w-10 text-muted-foreground" />
                          <p className="mt-2 text-sm text-muted-foreground">
                            이미지를 업로드하세요
                          </p>
                        </div>
                      )}
                    </div>
                    
                    <div className="flex justify-center">
                      <label className="cursor-pointer">
                        <Input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={handleImageUpload}
                        />
                        <Button type="button" variant="outline" size="sm">
                          {uploadedImageUrl ? "이미지 변경" : "이미지 업로드"}
                        </Button>
                      </label>
                    </div>
                  </div>
                  
                  <FormField
                    control={form.control}
                    name="templateImageUrl"
                    render={({ field }) => (
                      <FormItem className="hidden">
                        <FormControl>
                          <Input {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                
                <FormField
                  control={form.control}
                  name="title"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>제목</FormLabel>
                      <FormControl>
                        <Input placeholder="템플릿 제목" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="templateType"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>템플릿 유형</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="유형 선택" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {TEMPLATE_TYPES.map(type => (
                            <SelectItem key={type.value} value={type.value}>
                              {type.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem className="md:col-span-2">
                      <FormLabel>설명</FormLabel>
                      <FormControl>
                        <Textarea 
                          placeholder="템플릿에 대한 설명"
                          className="resize-none" 
                          {...field} 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="promptTemplate"
                  render={({ field }) => (
                    <FormItem className="md:col-span-2">
                      <FormLabel>프롬프트 템플릿</FormLabel>
                      <FormControl>
                        <Textarea 
                          placeholder="이미지 합성을 위한 프롬프트 템플릿"
                          className="resize-none h-24" 
                          {...field} 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="isActive"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
                      <div className="space-y-0.5">
                        <FormLabel>활성화</FormLabel>
                        <p className="text-xs text-muted-foreground">
                          템플릿을 사용자에게 표시할지 여부
                        </p>
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
                  name="isFeatured"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
                      <div className="space-y-0.5">
                        <FormLabel>추천 템플릿</FormLabel>
                        <p className="text-xs text-muted-foreground">
                          추천 템플릿으로 표시할지 여부
                        </p>
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
                  name="sortOrder"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>정렬 순서</FormLabel>
                      <FormControl>
                        <Input 
                          type="number" 
                          {...field}
                          onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              
              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setIsOpen(false);
                    resetForm();
                  }}
                >
                  취소
                </Button>
                <Button type="submit">
                  {editingTemplate ? "저장" : "추가"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}