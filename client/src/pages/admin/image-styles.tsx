import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { Separator } from '@/components/ui/separator';
import { Plus, Pencil, Trash, Copy, Star, View } from 'lucide-react';
// Layout 컴포넌트를 App.tsx에서 가져오지 않고 직접 사용
import { Badge } from '@/components/ui/badge';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Switch } from '@/components/ui/switch';

// 이미지 스타일 타입 정의
interface ImageStyle {
  id: number;
  styleId: string; // 스타일 ID 추가 (예: 'ghibli', 'disney' 등)
  name: string;
  description: string;
  systemPrompt: string;
  createdAt: string;
  updatedAt: string;
  isActive: boolean;
  creatorId?: number;
  order: number;
}

// 새 스타일 생성 또는 수정을 위한 폼 인터페이스
interface StyleFormData {
  id?: number;
  styleId: string; // 스타일 ID 추가 (예: 'ghibli', 'disney' 등)
  name: string;
  description: string;
  systemPrompt: string;
  isActive: boolean;
  order: number;
}

// 초기 폼 데이터
const initialFormData: StyleFormData = {
  styleId: '', // 스타일 ID 초기값
  name: '',
  description: '',
  systemPrompt: '',
  isActive: true,
  order: 0
};

/**
 * 이미지 스타일 관리 페이지
 * 관리자만 접근 가능
 */
export default function ImageStylesPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  // 상태 관리
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [selectedStyle, setSelectedStyle] = useState<ImageStyle | null>(null);
  const [formData, setFormData] = useState<StyleFormData>(initialFormData);
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
  
  // 이미지 스타일 목록 조회
  const { data: styles = [], isLoading } = useQuery<ImageStyle[]>({
    queryKey: ['/api/image-styles'],
    queryFn: async () => {
      const response = await fetch('/api/image-styles', {
        credentials: 'include'
      });
      if (!response.ok) {
        throw new Error('이미지 스타일 목록을 불러오는데 실패했습니다');
      }
      return response.json();
    }
  });

  // 이미지 스타일 생성 mutation
  const createStyleMutation = useMutation({
    mutationFn: async (newStyle: StyleFormData) => {
      console.log('🚀 API 요청 시작:', newStyle);
      try {
        const response = await fetch('/api/image-styles', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          credentials: 'include',
          body: JSON.stringify(newStyle),
        });
        
        console.log('🔄 API 응답 상태:', response.status);
        
        if (!response.ok) {
          const errorData = await response.json();
          console.error('❌ API 오류 응답:', errorData);
          throw new Error(errorData.error || '이미지 스타일을 생성하는데 실패했습니다');
        }
        
        const data = await response.json();
        console.log('✅ API 성공 응답:', data);
        return data;
      } catch (err) {
        console.error('❌ API 예외 발생:', err);
        throw err;
      }
    },
    onSuccess: (data) => {
      console.log('✅ Mutation 성공 콜백:', data);
      queryClient.invalidateQueries({ queryKey: ['/api/image-styles'] });
      setIsCreateDialogOpen(false);
      resetForm();
      toast({
        title: '스타일 생성 완료',
        description: '새로운 이미지 스타일이 성공적으로 생성되었습니다.',
      });
    },
    onError: (error) => {
      console.error('❌ Mutation 오류 콜백:', error);
      toast({
        title: '스타일 생성 실패',
        description: `${error.message}`,
        variant: 'destructive',
      });
    },
  });

  // 이미지 스타일 수정 mutation
  const updateStyleMutation = useMutation({
    mutationFn: async (updatedStyle: StyleFormData) => {
      const response = await fetch(`/api/image-styles/${updatedStyle.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(updatedStyle),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || '이미지 스타일을 수정하는데 실패했습니다');
      }
      
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/image-styles'] });
      setIsEditDialogOpen(false);
      setSelectedStyle(null);
      resetForm();
      toast({
        title: '스타일 수정 완료',
        description: '이미지 스타일이 성공적으로 수정되었습니다.',
      });
    },
    onError: (error) => {
      toast({
        title: '스타일 수정 실패',
        description: `${error.message}`,
        variant: 'destructive',
      });
    },
  });

  // 이미지 스타일 삭제 mutation
  const deleteStyleMutation = useMutation({
    mutationFn: async (id: number) => {
      const response = await fetch(`/api/image-styles/${id}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || '이미지 스타일을 삭제하는데 실패했습니다');
      }
      
      return true;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/image-styles'] });
      toast({
        title: '스타일 삭제 완료',
        description: '이미지 스타일이 성공적으로 삭제되었습니다.',
      });
    },
    onError: (error) => {
      toast({
        title: '스타일 삭제 실패',
        description: `${error.message}`,
        variant: 'destructive',
      });
    },
  });

  // 이미지 스타일 복제 mutation
  const cloneStyleMutation = useMutation({
    mutationFn: async (id: number) => {
      const response = await fetch(`/api/image-styles/${id}/clone`, {
        method: 'POST',
        credentials: 'include',
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || '이미지 스타일을 복제하는데 실패했습니다');
      }
      
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/image-styles'] });
      toast({
        title: '스타일 복제 완료',
        description: '이미지 스타일이 성공적으로 복제되었습니다.',
      });
    },
    onError: (error) => {
      toast({
        title: '스타일 복제 실패',
        description: `${error.message}`,
        variant: 'destructive',
      });
    },
  });

  // 폼 데이터 초기화
  const resetForm = () => {
    setFormData(initialFormData);
  };

  // 폼 입력 처리
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  // 스위치 입력 처리
  const handleSwitchChange = (checked: boolean) => {
    setFormData((prev) => ({ ...prev, isActive: checked }));
  };

  // 스타일 생성 폼 제출
  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    console.log('스타일 생성 폼 제출 시도:', formData);
    
    // 필수 필드 확인
    if (!formData.name || !formData.description || !formData.systemPrompt) {
      toast({
        title: '입력 오류',
        description: '모든 필수 항목을 입력해주세요.',
        variant: 'destructive',
      });
      return;
    }
    
    try {
      createStyleMutation.mutate(formData);
    } catch (error) {
      console.error('스타일 생성 오류:', error);
      toast({
        title: '스타일 생성 실패',
        description: '오류가 발생했습니다. 다시 시도해주세요.',
        variant: 'destructive',
      });
    }
  };

  // 스타일 수정 폼 제출
  const handleEditSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (formData.id) {
      updateStyleMutation.mutate(formData);
    }
  };

  // 스타일 수정 모달 열기
  const handleEditClick = (style: ImageStyle) => {
    setSelectedStyle(style);
    setFormData({
      id: style.id,
      styleId: style.styleId || '', // 스타일 ID 추가
      name: style.name,
      description: style.description,
      systemPrompt: style.systemPrompt,
      isActive: style.isActive,
      order: style.order
    });
    setIsEditDialogOpen(true);
  };

  // 스타일 상세 보기 모달 열기
  const handleViewClick = (style: ImageStyle) => {
    setSelectedStyle(style);
    setIsViewDialogOpen(true);
  };

  // 스타일 삭제 처리
  const handleDeleteClick = (id: number) => {
    deleteStyleMutation.mutate(id);
  };

  // 스타일 복제 처리
  const handleCloneClick = (id: number) => {
    cloneStyleMutation.mutate(id);
  };

  // 생성일과 수정일 포맷팅
  const formatDate = (dateString: string) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleString('ko-KR', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div>
      <div className="container py-6">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">이미지 스타일 관리</h1>
            <p className="text-muted-foreground mt-1">
              DALL-E 3 이미지 생성을 위한 스타일 프리셋을 관리합니다
            </p>
          </div>
          <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button className="gap-1">
                <Plus className="h-4 w-4" />
                새 스타일 추가
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[600px]">
              <DialogHeader>
                <DialogTitle>새 이미지 스타일 추가</DialogTitle>
                <DialogDescription>
                  이미지 생성에 사용할 새로운 스타일 프리셋을 추가합니다.
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleCreateSubmit}>
                <div className="grid gap-4 py-4">
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="styleId" className="text-right">
                      스타일 ID *
                    </Label>
                    <Input
                      id="styleId"
                      name="styleId"
                      value={formData.styleId}
                      onChange={handleInputChange}
                      className="col-span-3"
                      placeholder="ghibli, disney 등 영문 소문자로 입력"
                      required
                    />
                  </div>
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="name" className="text-right">
                      스타일 이름 *
                    </Label>
                    <Input
                      id="name"
                      name="name"
                      value={formData.name}
                      onChange={handleInputChange}
                      className="col-span-3"
                      required
                    />
                  </div>
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="description" className="text-right">
                      스타일 설명 *
                    </Label>
                    <Textarea
                      id="description"
                      name="description"
                      value={formData.description}
                      onChange={handleInputChange}
                      className="col-span-3"
                      rows={2}
                      required
                    />
                  </div>
                  <div className="grid grid-cols-4 items-start gap-4">
                    <Label htmlFor="systemPrompt" className="text-right pt-2">
                      시스템 프롬프트 *
                    </Label>
                    <Textarea
                      id="systemPrompt"
                      name="systemPrompt"
                      value={formData.systemPrompt}
                      onChange={handleInputChange}
                      className="col-span-3"
                      rows={10}
                      placeholder="DALL-E 3에 전송할 스타일 지시 프롬프트를 작성하세요..."
                      required
                    />
                  </div>
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="order" className="text-right">
                      정렬 순서
                    </Label>
                    <Input
                      id="order"
                      name="order"
                      type="number"
                      value={formData.order}
                      onChange={handleInputChange}
                      className="col-span-3"
                    />
                  </div>
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="isActive" className="text-right">
                      활성화 상태
                    </Label>
                    <div className="flex items-center gap-2 col-span-3">
                      <Switch
                        id="isActive"
                        checked={formData.isActive}
                        onCheckedChange={handleSwitchChange}
                      />
                      <span className="text-sm">
                        {formData.isActive ? '활성화됨' : '비활성화됨'}
                      </span>
                    </div>
                  </div>
                </div>
                <DialogFooter>
                  <Button 
                    type="button" 
                    variant="outline" 
                    onClick={() => {
                      setIsCreateDialogOpen(false);
                      resetForm();
                    }}
                  >
                    취소
                  </Button>
                  <Button 
                    type="submit" 
                    disabled={createStyleMutation.isPending}
                    onClick={(e) => {
                      console.log('스타일 생성 버튼 클릭됨');
                      if (!formData.name || !formData.description || !formData.systemPrompt) {
                        e.preventDefault();
                        toast({
                          title: '입력 오류',
                          description: '모든 필수 항목을 입력해주세요.',
                          variant: 'destructive',
                        });
                        return;
                      }
                    }}
                  >
                    {createStyleMutation.isPending ? '생성 중...' : '스타일 생성'}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>이미지 스타일 목록</CardTitle>
            <CardDescription>
              등록된 이미지 스타일 프리셋 목록입니다. 수정, 삭제, 복제가 가능합니다.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex justify-center items-center py-8">
                <p>스타일 목록을 불러오는 중...</p>
              </div>
            ) : styles.length === 0 ? (
              <div className="flex flex-col justify-center items-center py-8 text-center">
                <p className="text-muted-foreground mb-4">
                  등록된 이미지 스타일이 없습니다
                </p>
                <Button 
                  variant="outline" 
                  onClick={() => setIsCreateDialogOpen(true)}
                  className="gap-1"
                >
                  <Plus className="h-4 w-4" />
                  스타일 추가하기
                </Button>
              </div>
            ) : (
              <div className="overflow-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-12 text-center">순서</TableHead>
                      <TableHead>스타일 ID</TableHead>
                      <TableHead>스타일 이름</TableHead>
                      <TableHead className="hidden md:table-cell w-1/4">설명</TableHead>
                      <TableHead className="hidden sm:table-cell">상태</TableHead>
                      <TableHead className="hidden md:table-cell">수정일</TableHead>
                      <TableHead className="text-right">관리</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {styles.map((style) => (
                      <TableRow key={style.id}>
                        <TableCell className="text-center font-medium">{style.order}</TableCell>
                        <TableCell>
                          <code className="px-1 py-0.5 bg-muted rounded text-sm">{style.styleId || '-'}</code>
                        </TableCell>
                        <TableCell>{style.name}</TableCell>
                        <TableCell className="hidden md:table-cell">{style.description}</TableCell>
                        <TableCell className="hidden sm:table-cell">
                          <Badge variant={style.isActive ? "default" : "secondary"}>
                            {style.isActive ? '활성화' : '비활성화'}
                          </Badge>
                        </TableCell>
                        <TableCell className="hidden md:table-cell">{formatDate(style.updatedAt)}</TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button 
                                    variant="ghost" 
                                    size="icon"
                                    onClick={() => handleViewClick(style)}
                                  >
                                    <View className="h-4 w-4" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>
                                  <p>상세 보기</p>
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                            
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button 
                                    variant="ghost" 
                                    size="icon"
                                    onClick={() => handleEditClick(style)}
                                  >
                                    <Pencil className="h-4 w-4" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>
                                  <p>수정하기</p>
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                            
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <AlertDialog>
                                    <AlertDialogTrigger asChild>
                                      <Button variant="ghost" size="icon">
                                        <Trash className="h-4 w-4" />
                                      </Button>
                                    </AlertDialogTrigger>
                                    <AlertDialogContent>
                                      <AlertDialogHeader>
                                        <AlertDialogTitle>스타일 삭제 확인</AlertDialogTitle>
                                        <AlertDialogDescription>
                                          정말 "{style.name}" 스타일을 삭제하시겠습니까?
                                          <br />이 작업은 되돌릴 수 없습니다.
                                        </AlertDialogDescription>
                                      </AlertDialogHeader>
                                      <AlertDialogFooter>
                                        <AlertDialogCancel>취소</AlertDialogCancel>
                                        <AlertDialogAction 
                                          onClick={() => handleDeleteClick(style.id)}
                                          className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                        >
                                          삭제
                                        </AlertDialogAction>
                                      </AlertDialogFooter>
                                    </AlertDialogContent>
                                  </AlertDialog>
                                </TooltipTrigger>
                                <TooltipContent>
                                  <p>삭제하기</p>
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                            
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button 
                                    variant="ghost" 
                                    size="icon"
                                    onClick={() => handleCloneClick(style.id)}
                                  >
                                    <Copy className="h-4 w-4" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>
                                  <p>복제하기</p>
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* 스타일 수정 대화상자 */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>이미지 스타일 수정</DialogTitle>
            <DialogDescription>
              기존 이미지 스타일 설정을 수정합니다.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleEditSubmit}>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="edit-styleId" className="text-right">
                  스타일 ID *
                </Label>
                <Input
                  id="edit-styleId"
                  name="styleId"
                  value={formData.styleId}
                  onChange={handleInputChange}
                  className="col-span-3"
                  placeholder="ghibli, disney 등 영문 소문자로 입력"
                  required
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="edit-name" className="text-right">
                  스타일 이름 *
                </Label>
                <Input
                  id="edit-name"
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  className="col-span-3"
                  required
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="edit-description" className="text-right">
                  스타일 설명 *
                </Label>
                <Textarea
                  id="edit-description"
                  name="description"
                  value={formData.description}
                  onChange={handleInputChange}
                  className="col-span-3"
                  rows={2}
                  required
                />
              </div>
              <div className="grid grid-cols-4 items-start gap-4">
                <Label htmlFor="edit-systemPrompt" className="text-right pt-2">
                  시스템 프롬프트 *
                </Label>
                <Textarea
                  id="edit-systemPrompt"
                  name="systemPrompt"
                  value={formData.systemPrompt}
                  onChange={handleInputChange}
                  className="col-span-3"
                  rows={10}
                  required
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="edit-order" className="text-right">
                  정렬 순서
                </Label>
                <Input
                  id="edit-order"
                  name="order"
                  type="number"
                  value={formData.order}
                  onChange={handleInputChange}
                  className="col-span-3"
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="edit-isActive" className="text-right">
                  활성화 상태
                </Label>
                <div className="flex items-center gap-2 col-span-3">
                  <Switch
                    id="edit-isActive"
                    checked={formData.isActive}
                    onCheckedChange={handleSwitchChange}
                  />
                  <span className="text-sm">
                    {formData.isActive ? '활성화됨' : '비활성화됨'}
                  </span>
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => {
                  setIsEditDialogOpen(false);
                  setSelectedStyle(null);
                  resetForm();
                }}
              >
                취소
              </Button>
              <Button type="submit" disabled={updateStyleMutation.isPending}>
                {updateStyleMutation.isPending ? '수정 중...' : '저장하기'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* 스타일 상세 보기 대화상자 */}
      <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
        <DialogContent className="sm:max-w-[750px]">
          <DialogHeader>
            <DialogTitle>이미지 스타일 상세 보기</DialogTitle>
            <DialogDescription>
              이미지 생성에 사용되는 스타일 프롬프트 정보입니다.
            </DialogDescription>
          </DialogHeader>
          {selectedStyle && (
            <div className="py-4 space-y-4">
              <div>
                <div className="flex justify-between">
                  <h3 className="text-lg font-semibold">{selectedStyle.name}</h3>
                  <Badge variant={selectedStyle.isActive ? "default" : "secondary"}>
                    {selectedStyle.isActive ? '활성화' : '비활성화'}
                  </Badge>
                </div>
                <div className="mt-1 mb-2">
                  <span className="text-sm text-muted-foreground mr-2">스타일 ID:</span>
                  <code className="px-2 py-1 bg-muted rounded text-sm">{selectedStyle.styleId || '-'}</code>
                </div>
                <p className="text-muted-foreground">{selectedStyle.description}</p>
              </div>
              
              <div className="space-y-2">
                <h4 className="font-medium">스타일 정보</h4>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div>ID</div>
                  <div>{selectedStyle.id}</div>
                  <div>생성일</div>
                  <div>{formatDate(selectedStyle.createdAt)}</div>
                  <div>수정일</div>
                  <div>{formatDate(selectedStyle.updatedAt)}</div>
                  <div>정렬 순서</div>
                  <div>{selectedStyle.order}</div>
                </div>
              </div>
              
              <Separator />
              
              <div className="space-y-2">
                <h4 className="font-medium">시스템 프롬프트</h4>
                <div className="p-4 bg-muted rounded-md whitespace-pre-wrap text-sm">
                  {selectedStyle.systemPrompt}
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => {
                setIsViewDialogOpen(false);
                setSelectedStyle(null);
              }}
            >
              닫기
            </Button>
            {selectedStyle && (
              <Button onClick={() => {
                setIsViewDialogOpen(false);
                handleEditClick(selectedStyle);
              }}>
                수정하기
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}