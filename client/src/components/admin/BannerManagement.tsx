import { useState, useRef } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Table,
  TableBody,
  TableCaption,
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
  DialogTrigger,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { Edit, Trash2, Plus, ImageIcon, ExternalLink, Upload, X } from "lucide-react";

// 배너 스키마 정의
const bannerFormSchema = z.object({
  title: z.string().min(1, "제목을 입력해주세요"),
  description: z.string().min(1, "설명을 입력해주세요"),
  imageSrc: z.string().min(1, "이미지 URL을 입력해주세요"),
  href: z.string().min(1, "링크 URL을 입력해주세요"),
  isNew: z.boolean().default(false),
  isActive: z.boolean().default(true),
  sortOrder: z.coerce.number().int().default(0),
});

type BannerFormValues = z.infer<typeof bannerFormSchema>;

// 초기값 설정
const defaultValues: Partial<BannerFormValues> = {
  title: "",
  description: "",
  imageSrc: "",
  href: "",
  isNew: false,
  isActive: true,
  sortOrder: 0,
};

interface Banner {
  id: number;
  title: string;
  description: string;
  imageSrc: string;
  href: string;
  isNew?: boolean;
  isActive: boolean;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

export default function BannerManagement() {
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [selectedBanner, setSelectedBanner] = useState<Banner | null>(null);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const createFileInputRef = useRef<HTMLInputElement>(null);
  const editFileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // 배너 목록 조회
  const { data: banners, isLoading } = useQuery<Banner[]>({
    queryKey: ["/api/admin/banners"],
    queryFn: async () => {
      const response = await fetch("/api/banners", {
        credentials: 'include'
      });
      if (!response.ok) {
        throw new Error("배너 목록을 불러오는데 실패했습니다");
      }
      return response.json();
    },
  });

  // 배너 생성 폼
  const createForm = useForm<BannerFormValues>({
    resolver: zodResolver(bannerFormSchema),
    defaultValues,
  });

  // 배너 수정 폼
  const editForm = useForm<BannerFormValues>({
    resolver: zodResolver(bannerFormSchema),
    defaultValues,
  });

  // 배너 생성 뮤테이션
  const createBannerMutation = useMutation({
    mutationFn: async (values: BannerFormValues) => {
      const response = await fetch("/api/admin/banners", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(values),
      });
      
      if (!response.ok) {
        throw new Error("배너 생성에 실패했습니다");
      }
      
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/banners"] });
      setIsCreateDialogOpen(false);
      createForm.reset();
      toast({
        title: "배너 생성 완료",
        description: "새로운 배너가 생성되었습니다",
      });
    },
    onError: (error) => {
      toast({
        title: "배너 생성 실패",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // 배너 수정 뮤테이션
  const updateBannerMutation = useMutation({
    mutationFn: async ({ id, values }: { id: number; values: BannerFormValues }) => {
      const response = await fetch(`/api/admin/banners/${id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(values),
      });
      
      if (!response.ok) {
        throw new Error("배너 수정에 실패했습니다");
      }
      
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/banners"] });
      setIsEditDialogOpen(false);
      setSelectedBanner(null);
      editForm.reset();
      toast({
        title: "배너 수정 완료",
        description: "배너가 수정되었습니다",
      });
    },
    onError: (error) => {
      toast({
        title: "배너 수정 실패",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // 배너 삭제 뮤테이션
  const deleteBannerMutation = useMutation({
    mutationFn: async (id: number) => {
      const response = await fetch(`/api/admin/banners/${id}`, {
        method: "DELETE",
      });
      
      if (!response.ok) {
        throw new Error("배너 삭제에 실패했습니다");
      }
      
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/banners"] });
      setIsDeleteDialogOpen(false);
      setSelectedBanner(null);
      toast({
        title: "배너 삭제 완료",
        description: "배너가 삭제되었습니다",
      });
    },
    onError: (error) => {
      toast({
        title: "배너 삭제 실패",
        description: error.message,
        variant: "destructive",
      });
    },
  });
  
  // 배너 생성 제출 핸들러
  function onCreateSubmit(values: BannerFormValues) {
    createBannerMutation.mutate(values);
  }
  
  // 배너 수정 제출 핸들러
  function onEditSubmit(values: BannerFormValues) {
    if (selectedBanner) {
      updateBannerMutation.mutate({ id: selectedBanner.id, values });
    }
  }
  
  // 배너 삭제 핸들러
  function handleDelete() {
    if (selectedBanner) {
      deleteBannerMutation.mutate(selectedBanner.id);
    }
  }
  
  // 배너 수정 모달 열기
  function handleEditClick(banner: Banner) {
    setSelectedBanner(banner);
    editForm.reset({
      title: banner.title,
      description: banner.description,
      imageSrc: banner.imageSrc,
      href: banner.href,
      isNew: banner.isNew || false,
      isActive: banner.isActive,
      sortOrder: banner.sortOrder,
    });
    setIsEditDialogOpen(true);
  }
  
  // 배너 삭제 모달 열기
  function handleDeleteClick(banner: Banner) {
    setSelectedBanner(banner);
    setIsDeleteDialogOpen(true);
  }
  
  // 이미지 업로드 핸들러
  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>, isCreate: boolean) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    setIsUploading(true);
    
    try {
      // 파일 미리보기 생성
      const reader = new FileReader();
      reader.onloadend = () => {
        setSelectedImage(reader.result as string);
      };
      reader.readAsDataURL(file);
      
      // 실제 서버에 업로드
      const formData = new FormData();
      formData.append('file', file);
      
      const response = await fetch('/api/admin/upload-thumbnail', {
        method: 'POST',
        body: formData,
      });
      
      if (!response.ok) {
        throw new Error('이미지 업로드에 실패했습니다');
      }
      
      const data = await response.json();
      
      // 업로드된 이미지 URL을 폼에 설정
      if (isCreate) {
        createForm.setValue('imageSrc', data.url);
      } else {
        editForm.setValue('imageSrc', data.url);
      }
      
      toast({
        title: "이미지 업로드 성공",
        description: "이미지가 성공적으로 업로드되었습니다",
      });
    } catch (error) {
      console.error('이미지 업로드 실패:', error);
      toast({
        title: "이미지 업로드 실패",
        description: error instanceof Error ? error.message : "이미지 업로드 중 오류가 발생했습니다",
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
    }
  };
  
  // 업로드된 이미지 제거
  const handleClearImage = (isCreate: boolean) => {
    setSelectedImage(null);
    if (isCreate) {
      if (createFileInputRef.current) {
        createFileInputRef.current.value = '';
      }
      createForm.setValue('imageSrc', '');
    } else {
      if (editFileInputRef.current) {
        editFileInputRef.current.value = '';
      }
      editForm.setValue('imageSrc', '');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">배너 관리</h2>
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              새 배너 추가
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>새 배너 추가</DialogTitle>
              <DialogDescription>
                홈페이지에 표시될 새로운 배너를 추가합니다.
              </DialogDescription>
            </DialogHeader>
            <Form {...createForm}>
              <form onSubmit={createForm.handleSubmit(onCreateSubmit)} className="space-y-4">
                <FormField
                  control={createForm.control}
                  name="title"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>제목</FormLabel>
                      <FormControl>
                        <Input placeholder="배너 제목" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={createForm.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>설명</FormLabel>
                      <FormControl>
                        <Textarea placeholder="배너 설명" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={createForm.control}
                  name="imageSrc"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>이미지</FormLabel>
                      <Tabs defaultValue="url" className="w-full">
                        <TabsList className="grid w-full grid-cols-2">
                          <TabsTrigger value="url">URL 입력</TabsTrigger>
                          <TabsTrigger value="upload">파일 업로드</TabsTrigger>
                        </TabsList>
                        <TabsContent value="url" className="pt-2">
                          <FormControl>
                            <Input 
                              placeholder="https://example.com/image.jpg" 
                              {...field} 
                            />
                          </FormControl>
                          <FormDescription>
                            외부 이미지 URL을 입력하세요
                          </FormDescription>
                        </TabsContent>
                        <TabsContent value="upload" className="pt-2">
                          <div className="flex flex-col gap-2">
                            <div className="flex items-center justify-center h-32 border border-dashed border-neutral-600 rounded-md overflow-hidden relative">
                              <input 
                                type="file" 
                                id="create-imageUpload" 
                                className="absolute inset-0 opacity-0 cursor-pointer" 
                                onChange={(e) => handleImageUpload(e, true)}
                                accept="image/*"
                                ref={createFileInputRef}
                              />
                              <div className="flex flex-col items-center justify-center text-center p-4">
                                <Upload className="h-6 w-6 mb-2 text-neutral-400" />
                                <p className="text-sm text-neutral-400">
                                  {selectedImage ? '다른 이미지 선택하기' : '이미지 파일을 업로드하세요'}
                                </p>
                                <p className="text-xs text-neutral-500 mt-1">PNG, JPG, GIF 등 이미지 파일</p>
                              </div>
                            </div>
                            {selectedImage && (
                              <div className="relative w-full h-32 mt-2 rounded-md overflow-hidden">
                                <img 
                                  src={selectedImage} 
                                  alt="업로드 미리보기" 
                                  className="w-full h-full object-cover" 
                                />
                                <Button
                                  type="button"
                                  size="sm"
                                  variant="destructive"
                                  onClick={() => handleClearImage(true)}
                                  className="absolute top-1 right-1 w-6 h-6 p-0 rounded-full"
                                >
                                  <X className="h-3 w-3" />
                                </Button>
                              </div>
                            )}
                            {isUploading && (
                              <div className="flex items-center justify-center mt-2">
                                <div className="animate-spin mr-2">
                                  <svg className="h-4 w-4 text-primary-lavender" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                  </svg>
                                </div>
                                <span className="text-sm text-neutral-300">업로드 중...</span>
                              </div>
                            )}
                          </div>
                        </TabsContent>
                      </Tabs>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={createForm.control}
                  name="href"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>링크 URL</FormLabel>
                      <FormControl>
                        <Input placeholder="/page-url 또는 https://..." {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={createForm.control}
                    name="isNew"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
                        <div className="space-y-0.5">
                          <FormLabel>NEW 표시</FormLabel>
                          <FormDescription>
                            배너에 NEW 배지를 표시합니다
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
                    control={createForm.control}
                    name="isActive"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
                        <div className="space-y-0.5">
                          <FormLabel>활성화</FormLabel>
                          <FormDescription>
                            배너 표시 여부
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
                </div>
                <FormField
                  control={createForm.control}
                  name="sortOrder"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>정렬 순서</FormLabel>
                      <FormControl>
                        <Input type="number" {...field} />
                      </FormControl>
                      <FormDescription>
                        낮은 숫자가 먼저 표시됩니다 (0, 1, 2, ...)
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <DialogFooter>
                  <Button type="submit" disabled={createBannerMutation.isPending}>
                    {createBannerMutation.isPending ? "저장 중..." : "저장하기"}
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      {/* 배너 목록 */}
      <Card>
        <CardHeader>
          <CardTitle>배너 목록</CardTitle>
          <CardDescription>
            홈페이지에 표시되는 배너를 관리합니다. 활성화된 배너만 표시됩니다.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableCaption>총 {banners?.length || 0}개의 배너</TableCaption>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[80px]">순서</TableHead>
                <TableHead>제목</TableHead>
                <TableHead>설명</TableHead>
                <TableHead>이미지</TableHead>
                <TableHead>상태</TableHead>
                <TableHead className="text-right">관리</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center">로딩 중...</TableCell>
                </TableRow>
              ) : banners?.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center">등록된 배너가 없습니다</TableCell>
                </TableRow>
              ) : (
                banners?.map((banner) => (
                  <TableRow key={banner.id}>
                    <TableCell>{banner.sortOrder}</TableCell>
                    <TableCell className="font-medium">
                      {banner.title}
                      {banner.isNew && (
                        <span className="ml-2 text-xs font-bold text-primary-lavender">NEW</span>
                      )}
                    </TableCell>
                    <TableCell className="max-w-[200px] truncate">{banner.description}</TableCell>
                    <TableCell>
                      <div className="relative w-10 h-10 overflow-hidden rounded">
                        {banner.imageSrc ? (
                          <img
                            src={banner.imageSrc}
                            alt={banner.title}
                            className="object-cover w-full h-full"
                          />
                        ) : (
                          <div className="flex items-center justify-center w-full h-full bg-secondary">
                            <ImageIcon size={16} />
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          banner.isActive
                            ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300"
                            : "bg-neutral-100 text-neutral-800 dark:bg-neutral-900 dark:text-neutral-300"
                        }`}
                      >
                        {banner.isActive ? "활성화" : "비활성화"}
                      </span>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleEditClick(banner)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDeleteClick(banner)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        asChild
                      >
                        <a href={banner.href} target="_blank" rel="noopener noreferrer">
                          <ExternalLink className="h-4 w-4" />
                        </a>
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* 배너 수정 다이얼로그 */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>배너 수정</DialogTitle>
            <DialogDescription>
              선택한 배너의 정보를 수정합니다.
            </DialogDescription>
          </DialogHeader>
          <Form {...editForm}>
            <form onSubmit={editForm.handleSubmit(onEditSubmit)} className="space-y-4">
              <FormField
                control={editForm.control}
                name="title"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>제목</FormLabel>
                    <FormControl>
                      <Input placeholder="배너 제목" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={editForm.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>설명</FormLabel>
                    <FormControl>
                      <Textarea placeholder="배너 설명" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={editForm.control}
                name="imageSrc"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>이미지</FormLabel>
                    <Tabs defaultValue="url" className="w-full">
                      <TabsList className="grid w-full grid-cols-2">
                        <TabsTrigger value="url">URL 입력</TabsTrigger>
                        <TabsTrigger value="upload">파일 업로드</TabsTrigger>
                      </TabsList>
                      <TabsContent value="url" className="pt-2">
                        <FormControl>
                          <Input 
                            placeholder="https://example.com/image.jpg" 
                            {...field} 
                          />
                        </FormControl>
                        <FormDescription>
                          외부 이미지 URL을 입력하세요
                        </FormDescription>
                      </TabsContent>
                      <TabsContent value="upload" className="pt-2">
                        <div className="flex flex-col gap-2">
                          <div className="flex items-center justify-center h-32 border border-dashed border-neutral-600 rounded-md overflow-hidden relative">
                            <input 
                              type="file" 
                              id="edit-imageUpload" 
                              className="absolute inset-0 opacity-0 cursor-pointer" 
                              onChange={(e) => handleImageUpload(e, false)}
                              accept="image/*"
                              ref={editFileInputRef}
                            />
                            <div className="flex flex-col items-center justify-center text-center p-4">
                              <Upload className="h-6 w-6 mb-2 text-neutral-400" />
                              <p className="text-sm text-neutral-400">
                                {field.value ? '다른 이미지 선택하기' : '이미지 파일을 업로드하세요'}
                              </p>
                              <p className="text-xs text-neutral-500 mt-1">PNG, JPG, GIF 등 이미지 파일</p>
                            </div>
                          </div>
                          {field.value && (
                            <div className="relative w-full h-32 mt-2 rounded-md overflow-hidden">
                              <img 
                                src={field.value} 
                                alt="업로드 미리보기" 
                                className="w-full h-full object-cover" 
                              />
                              <Button
                                type="button"
                                size="sm"
                                variant="destructive"
                                onClick={() => handleClearImage(false)}
                                className="absolute top-1 right-1 w-6 h-6 p-0 rounded-full"
                              >
                                <X className="h-3 w-3" />
                              </Button>
                            </div>
                          )}
                          {isUploading && (
                            <div className="flex items-center justify-center mt-2">
                              <div className="animate-spin mr-2">
                                <svg className="h-4 w-4 text-primary-lavender" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                </svg>
                              </div>
                              <span className="text-sm text-neutral-300">업로드 중...</span>
                            </div>
                          )}
                        </div>
                      </TabsContent>
                    </Tabs>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={editForm.control}
                name="href"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>링크 URL</FormLabel>
                    <FormControl>
                      <Input placeholder="/page-url 또는 https://..." {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={editForm.control}
                  name="isNew"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
                      <div className="space-y-0.5">
                        <FormLabel>NEW 표시</FormLabel>
                        <FormDescription>
                          배너에 NEW 배지를 표시합니다
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
                  control={editForm.control}
                  name="isActive"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
                      <div className="space-y-0.5">
                        <FormLabel>활성화</FormLabel>
                        <FormDescription>
                          배너 표시 여부
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
              </div>
              <FormField
                control={editForm.control}
                name="sortOrder"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>정렬 순서</FormLabel>
                    <FormControl>
                      <Input type="number" {...field} />
                    </FormControl>
                    <FormDescription>
                      낮은 숫자가 먼저 표시됩니다 (0, 1, 2, ...)
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <DialogFooter>
                <Button type="submit" disabled={updateBannerMutation.isPending}>
                  {updateBannerMutation.isPending ? "저장 중..." : "저장하기"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* 배너 삭제 확인 다이얼로그 */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>배너 삭제</DialogTitle>
            <DialogDescription>
              정말로 이 배너를 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            {selectedBanner && (
              <div className="rounded-md border p-4">
                <h4 className="font-medium">{selectedBanner.title}</h4>
                <p className="text-sm text-muted-foreground">{selectedBanner.description}</p>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsDeleteDialogOpen(false)}
            >
              취소
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={deleteBannerMutation.isPending}
            >
              {deleteBannerMutation.isPending ? "삭제 중..." : "삭제하기"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}