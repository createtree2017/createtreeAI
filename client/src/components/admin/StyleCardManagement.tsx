import { useState, useEffect, useRef } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Pencil, Trash2, Plus, Image, Upload, X } from "lucide-react";
import { 
  Dialog, 
  DialogContent, 
  DialogFooter, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger,
  DialogClose
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

// 스타일 카드 타입 정의
type StyleCard = {
  id: number;
  title: string;
  styleId: string;
  imageSrc: string;
  href: string;
  isNew: boolean;
  isActive: boolean;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
};

type StyleCardFormData = Omit<StyleCard, "id" | "createdAt" | "updatedAt">;

export default function StyleCardManagement() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  // 스타일 카드 목록 불러오기
  const { data: styleCards, isLoading, isError } = useQuery({
    queryKey: ["/api/style-cards", "all"],
    queryFn: async () => {
      const response = await fetch("/api/style-cards?showAll=true");
      if (!response.ok) {
        throw new Error("스타일 카드 데이터를 불러오는데 실패했습니다");
      }
      return response.json() as Promise<StyleCard[]>;
    }
  });
  
  // 스타일 카드 생성 mutation
  const createStyleCardMutation = useMutation({
    mutationFn: async (formData: StyleCardFormData) => {
      const response = await fetch("/api/admin/style-cards", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(formData),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "스타일 카드 생성에 실패했습니다");
      }
      
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "성공!",
        description: "스타일 카드가 성공적으로 생성되었습니다",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/style-cards"] });
      setIsAddDialogOpen(false);
      resetForm();
    },
    onError: (error) => {
      toast({
        title: "오류 발생",
        description: error.message,
        variant: "destructive",
      });
    },
  });
  
  // 스타일 카드 수정 mutation
  const updateStyleCardMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: Partial<StyleCardFormData> }) => {
      const response = await fetch(`/api/admin/style-cards/${id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "스타일 카드 수정에 실패했습니다");
      }
      
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "성공!",
        description: "스타일 카드가 성공적으로 수정되었습니다",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/style-cards"] });
      setIsEditDialogOpen(false);
      resetForm();
    },
    onError: (error) => {
      toast({
        title: "오류 발생",
        description: error.message,
        variant: "destructive",
      });
    },
  });
  
  // 스타일 카드 삭제 mutation
  const deleteStyleCardMutation = useMutation({
    mutationFn: async (id: number) => {
      const response = await fetch(`/api/admin/style-cards/${id}`, {
        method: "DELETE",
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "스타일 카드 삭제에 실패했습니다");
      }
      
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "성공!",
        description: "스타일 카드가 성공적으로 삭제되었습니다",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/style-cards"] });
    },
    onError: (error) => {
      toast({
        title: "오류 발생",
        description: error.message,
        variant: "destructive",
      });
    },
  });
  
  // 폼 상태 관리
  const [formData, setFormData] = useState<StyleCardFormData>({
    title: "",
    styleId: "",
    imageSrc: "",
    href: "",
    isNew: false,
    isActive: true,
    sortOrder: 0,
  });
  
  // 이미지 업로드 관련 상태
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // 다이얼로그 상태 관리
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [currentEditId, setCurrentEditId] = useState<number | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<number | null>(null);
  
  // 폼 초기화 함수
  const resetForm = () => {
    setFormData({
      title: "",
      styleId: "",
      imageSrc: "",
      href: "",
      isNew: false,
      isActive: true,
      sortOrder: 0,
    });
    setSelectedImage(null);
  };
  
  // 이미지 업로드 핸들러
  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
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
        throw new Error('이미지 업로드에 실패했습니다.');
      }
      
      const data = await response.json();
      // 업로드된 이미지 URL 설정
      setFormData(prev => ({
        ...prev,
        imageSrc: data.url,
      }));
      
      toast({
        title: "이미지 업로드 성공",
        description: "이미지가 성공적으로 업로드되었습니다.",
      });
    } catch (error) {
      console.error('이미지 업로드 실패:', error);
      toast({
        title: "이미지 업로드 실패",
        description: "이미지 업로드 중 오류가 발생했습니다.",
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
    }
  };
  
  // 업로드된 이미지 제거
  const handleClearImage = () => {
    setSelectedImage(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
    setFormData(prev => ({
      ...prev,
      imageSrc: '',
    }));
  };
  
  // 폼 입력 핸들러
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  };
  
  // 스위치 핸들러
  const handleSwitchChange = (name: string, checked: boolean) => {
    setFormData((prev) => ({
      ...prev,
      [name]: checked,
    }));
  };
  
  // 수정 다이얼로그 열기
  const handleEdit = (styleCard: StyleCard) => {
    setCurrentEditId(styleCard.id);
    setFormData({
      title: styleCard.title,
      styleId: styleCard.styleId,
      imageSrc: styleCard.imageSrc,
      href: styleCard.href,
      isNew: styleCard.isNew,
      isActive: styleCard.isActive,
      sortOrder: styleCard.sortOrder,
    });
    setIsEditDialogOpen(true);
  };
  
  // 스타일 카드 생성 핸들러
  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    createStyleCardMutation.mutate(formData);
  };
  
  // 스타일 카드 수정 핸들러
  const handleUpdate = (e: React.FormEvent) => {
    e.preventDefault();
    if (currentEditId !== null) {
      updateStyleCardMutation.mutate({ id: currentEditId, data: formData });
    }
  };
  
  // 스타일 카드 삭제 핸들러
  const handleDelete = (id: number) => {
    deleteStyleCardMutation.mutate(id);
    setDeleteConfirmId(null);
  };
  
  // 스타일 카드 활성화 상태 토글 핸들러
  const handleToggleActive = (id: number, isActive: boolean) => {
    updateStyleCardMutation.mutate({ 
      id, 
      data: { isActive: !isActive } 
    });
  };

  if (isLoading) {
    return <div className="text-white p-4">로딩 중...</div>;
  }

  if (isError) {
    return <div className="text-red-500 p-4">데이터 로드 중 오류가 발생했습니다.</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-white">스타일 카드 관리</h2>
        <Button onClick={() => setIsAddDialogOpen(true)} className="bg-primary-lavender hover:bg-primary-lavender/90">
          <Plus className="mr-2 h-4 w-4" />
          스타일 카드 추가
        </Button>
      </div>
      
      {/* 스타일 카드 목록 */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {styleCards?.map((styleCard) => (
          <Card key={styleCard.id} className={`bg-neutral-800 border-neutral-700 ${!styleCard.isActive ? 'opacity-60' : ''}`}>
            <CardHeader className="pb-2">
              <div className="flex justify-between items-start">
                <CardTitle className="text-white">{styleCard.title}</CardTitle>
                <div className="flex space-x-2">
                  <Button 
                    size="sm" 
                    variant="ghost" 
                    onClick={() => handleEdit(styleCard)}
                    className="text-neutral-300 hover:text-white hover:bg-neutral-700"
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button 
                    size="sm" 
                    variant="ghost" 
                    onClick={() => setDeleteConfirmId(styleCard.id)}
                    className="text-red-400 hover:text-red-300 hover:bg-neutral-700"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="pb-2">
              <div className="flex gap-4">
                <div className="w-24 h-24 rounded-md overflow-hidden">
                  {styleCard.imageSrc ? (
                    <img 
                      src={styleCard.imageSrc} 
                      alt={styleCard.title} 
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-neutral-700">
                      <Image className="h-10 w-10 text-neutral-400" />
                    </div>
                  )}
                </div>
                <div className="flex-1 space-y-1 text-sm">
                  <p className="text-neutral-300">스타일 ID: <span className="text-white">{styleCard.styleId}</span></p>
                  <p className="text-neutral-300">링크: <span className="text-white">{styleCard.href}</span></p>
                  <p className="text-neutral-300">정렬 순서: <span className="text-white">{styleCard.sortOrder}</span></p>
                  <div className="flex gap-3">
                    <div className="flex items-center space-x-2">
                      <span className="text-neutral-300">NEW 표시</span>
                      <Switch 
                        checked={styleCard.isNew} 
                        onCheckedChange={(checked) => 
                          updateStyleCardMutation.mutate({ id: styleCard.id, data: { isNew: checked } })
                        }
                        className="data-[state=checked]:bg-primary-lavender"
                      />
                    </div>
                    <div className="flex items-center space-x-2">
                      <span className="text-neutral-300">활성화</span>
                      <Switch 
                        checked={styleCard.isActive} 
                        onCheckedChange={(checked) => 
                          handleToggleActive(styleCard.id, styleCard.isActive)
                        }
                        className="data-[state=checked]:bg-primary-lavender"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
      
      {/* 스타일 카드 추가 다이얼로그 */}
      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent className="bg-neutral-800 text-white border-neutral-700 sm:max-w-md">
          <DialogHeader>
            <DialogTitle>새 스타일 카드 추가</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleCreate}>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="title">제목</Label>
                <Input
                  id="title"
                  name="title"
                  value={formData.title}
                  onChange={handleInputChange}
                  className="bg-neutral-700 border-neutral-600"
                  required
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="styleId">스타일 ID</Label>
                <Input
                  id="styleId"
                  name="styleId"
                  value={formData.styleId}
                  onChange={handleInputChange}
                  className="bg-neutral-700 border-neutral-600"
                  required
                />
                <p className="text-xs text-neutral-400">예: ghibli, disney, simpsons</p>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="imageSrc">이미지</Label>
                <Tabs defaultValue="url" className="w-full">
                  <TabsList className="grid w-full grid-cols-2 bg-neutral-700">
                    <TabsTrigger value="url">URL 입력</TabsTrigger>
                    <TabsTrigger value="upload">파일 업로드</TabsTrigger>
                  </TabsList>
                  <TabsContent value="url" className="pt-2">
                    <Input
                      id="imageSrc"
                      name="imageSrc"
                      value={formData.imageSrc}
                      onChange={handleInputChange}
                      className="bg-neutral-700 border-neutral-600"
                      placeholder="이미지 URL 입력"
                      required={!selectedImage}
                    />
                  </TabsContent>
                  <TabsContent value="upload" className="pt-2">
                    <div className="flex flex-col gap-2">
                      <div className="flex items-center justify-center h-32 border border-dashed border-neutral-600 rounded-md overflow-hidden bg-neutral-700 relative">
                        <input 
                          type="file" 
                          id="imageUpload" 
                          className="absolute inset-0 opacity-0 cursor-pointer" 
                          onChange={handleImageUpload}
                          accept="image/*"
                          ref={fileInputRef}
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
                            onClick={handleClearImage}
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
              </div>
              <div className="grid gap-2">
                <Label htmlFor="href">링크 URL</Label>
                <Input
                  id="href"
                  name="href"
                  value={formData.href}
                  onChange={handleInputChange}
                  className="bg-neutral-700 border-neutral-600"
                  required
                />
                <p className="text-xs text-neutral-400">예: /image?style=ghibli</p>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="sortOrder">정렬 순서</Label>
                <Input
                  id="sortOrder"
                  name="sortOrder"
                  type="number"
                  value={formData.sortOrder}
                  onChange={handleInputChange}
                  className="bg-neutral-700 border-neutral-600"
                />
              </div>
              <div className="flex items-center space-x-2">
                <Switch
                  id="isNew"
                  name="isNew"
                  checked={formData.isNew}
                  onCheckedChange={(checked) => handleSwitchChange("isNew", checked)}
                  className="data-[state=checked]:bg-primary-lavender"
                />
                <Label htmlFor="isNew">NEW 표시</Label>
              </div>
              <div className="flex items-center space-x-2">
                <Switch
                  id="isActive"
                  name="isActive"
                  checked={formData.isActive}
                  onCheckedChange={(checked) => handleSwitchChange("isActive", checked)}
                  className="data-[state=checked]:bg-primary-lavender"
                />
                <Label htmlFor="isActive">활성화</Label>
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsAddDialogOpen(false)} className="border-neutral-600 text-neutral-300 hover:bg-neutral-700">
                취소
              </Button>
              <Button type="submit" className="bg-primary-lavender hover:bg-primary-lavender/90">
                추가
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
      
      {/* 스타일 카드 수정 다이얼로그 */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="bg-neutral-800 text-white border-neutral-700 sm:max-w-md">
          <DialogHeader>
            <DialogTitle>스타일 카드 수정</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleUpdate}>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="edit-title">제목</Label>
                <Input
                  id="edit-title"
                  name="title"
                  value={formData.title}
                  onChange={handleInputChange}
                  className="bg-neutral-700 border-neutral-600"
                  required
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="edit-styleId">스타일 ID</Label>
                <Input
                  id="edit-styleId"
                  name="styleId"
                  value={formData.styleId}
                  onChange={handleInputChange}
                  className="bg-neutral-700 border-neutral-600"
                  required
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="edit-imageSrc">이미지</Label>
                <Tabs defaultValue="url" className="w-full">
                  <TabsList className="grid w-full grid-cols-2 bg-neutral-700">
                    <TabsTrigger value="url">URL 입력</TabsTrigger>
                    <TabsTrigger value="upload">파일 업로드</TabsTrigger>
                  </TabsList>
                  <TabsContent value="url" className="pt-2">
                    <Input
                      id="edit-imageSrc"
                      name="imageSrc"
                      value={formData.imageSrc}
                      onChange={handleInputChange}
                      className="bg-neutral-700 border-neutral-600"
                      placeholder="이미지 URL 입력"
                      required={!selectedImage}
                    />
                  </TabsContent>
                  <TabsContent value="upload" className="pt-2">
                    <div className="flex flex-col gap-2">
                      <div className="flex items-center justify-center h-32 border border-dashed border-neutral-600 rounded-md overflow-hidden bg-neutral-700 relative">
                        <input 
                          type="file" 
                          id="edit-imageUpload" 
                          className="absolute inset-0 opacity-0 cursor-pointer" 
                          onChange={handleImageUpload}
                          accept="image/*"
                          ref={fileInputRef}
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
                            onClick={handleClearImage}
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
              </div>
              <div className="grid gap-2">
                <Label htmlFor="edit-href">링크 URL</Label>
                <Input
                  id="edit-href"
                  name="href"
                  value={formData.href}
                  onChange={handleInputChange}
                  className="bg-neutral-700 border-neutral-600"
                  required
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="edit-sortOrder">정렬 순서</Label>
                <Input
                  id="edit-sortOrder"
                  name="sortOrder"
                  type="number"
                  value={formData.sortOrder}
                  onChange={handleInputChange}
                  className="bg-neutral-700 border-neutral-600"
                />
              </div>
              <div className="flex items-center space-x-2">
                <Switch
                  id="edit-isNew"
                  name="isNew"
                  checked={formData.isNew}
                  onCheckedChange={(checked) => handleSwitchChange("isNew", checked)}
                  className="data-[state=checked]:bg-primary-lavender"
                />
                <Label htmlFor="edit-isNew">NEW 표시</Label>
              </div>
              <div className="flex items-center space-x-2">
                <Switch
                  id="edit-isActive"
                  name="isActive"
                  checked={formData.isActive}
                  onCheckedChange={(checked) => handleSwitchChange("isActive", checked)}
                  className="data-[state=checked]:bg-primary-lavender"
                />
                <Label htmlFor="edit-isActive">활성화</Label>
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsEditDialogOpen(false)} className="border-neutral-600 text-neutral-300 hover:bg-neutral-700">
                취소
              </Button>
              <Button type="submit" className="bg-primary-lavender hover:bg-primary-lavender/90">
                저장
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
      
      {/* 삭제 확인 다이얼로그 */}
      <Dialog open={deleteConfirmId !== null} onOpenChange={() => setDeleteConfirmId(null)}>
        <DialogContent className="bg-neutral-800 text-white border-neutral-700 sm:max-w-md">
          <DialogHeader>
            <DialogTitle>스타일 카드 삭제</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <p>정말 이 스타일 카드를 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.</p>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setDeleteConfirmId(null)} className="border-neutral-600 text-neutral-300 hover:bg-neutral-700">
              취소
            </Button>
            <Button 
              type="button" 
              variant="destructive" 
              onClick={() => deleteConfirmId !== null && handleDelete(deleteConfirmId)}
              className="bg-red-500 hover:bg-red-600 text-white"
            >
              삭제
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}