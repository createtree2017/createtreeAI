import React, { useState, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { useForm } from 'react-hook-form';
import { useToast } from '@/hooks/use-toast';

// UI 컴포넌트
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { 
  Table, 
  TableHeader, 
  TableBody, 
  TableRow, 
  TableHead, 
  TableCell 
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Form,
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormDescription,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';

// 아이콘
import { PlusCircle, Edit, Trash2, Loader2, Upload, Image, ImagePlus } from 'lucide-react';

// 이미지 스타일 관리 컴포넌트
export function ImageStyleManagement() {
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingStyle, setEditingStyle] = useState<any>(null);
  const queryClient = useQueryClient();
  const { toast } = useToast();
  
  // 이미지 스타일 목록 조회
  const { data: styles, isLoading } = useQuery({
    queryKey: ["/api/image-styles"],
    queryFn: async () => {
      const response = await fetch('/api/image-styles');
      if (!response.ok) {
        throw new Error('이미지 스타일 목록을 불러오는데 실패했습니다');
      }
      return response.json();
    },
  });
  
  // 이미지 스타일 삭제 뮤테이션
  const deleteStyleMutation = useMutation({
    mutationFn: (styleId: string) => apiRequest(`/api/image-styles/${styleId}`, {
      method: "DELETE",
    }),
    onSuccess: () => {
      toast({
        title: "스타일 삭제 완료",
        description: "이미지 스타일이 성공적으로 삭제되었습니다.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/image-styles"] });
    },
    onError: (error) => {
      toast({
        title: "오류",
        description: "이미지 스타일 삭제 중 오류가 발생했습니다.",
        variant: "destructive",
      });
      console.error("Error deleting image style:", error);
    },
  });
  
  const handleEditStyle = (style: any) => {
    setEditingStyle(style);
    setIsEditDialogOpen(true);
  };
  
  const handleDeleteStyle = (styleId: string) => {
    if (window.confirm("정말로 이 스타일을 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.")) {
      deleteStyleMutation.mutate(styleId);
    }
  };
  
  if (isLoading) {
    return <div className="text-center py-10">스타일 목록을 불러오는 중...</div>;
  }
  
  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-xl font-bold">이미지 스타일 관리</h3>
        <Button onClick={() => setIsCreateDialogOpen(true)}>
          <PlusCircle className="h-4 w-4 mr-2" />
          새 스타일 추가
        </Button>
      </div>
      
      {styles && styles.length > 0 ? (
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>스타일 ID</TableHead>
                <TableHead>이름</TableHead>
                <TableHead>시스템 프롬프트</TableHead>
                <TableHead>생성일</TableHead>
                <TableHead>작업</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {styles.map((style: any) => (
                <TableRow key={style.styleId}>
                  <TableCell className="font-medium">
                    {style.styleId}
                  </TableCell>
                  <TableCell>{style.name}</TableCell>
                  <TableCell className="max-w-md truncate">
                    {style.systemPrompt ? style.systemPrompt.substring(0, 100) + '...' : '(없음)'}
                  </TableCell>
                  <TableCell>
                    {new Date(style.createdAt).toLocaleDateString()}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center space-x-2">
                      <Button variant="ghost" size="sm" onClick={() => handleEditStyle(style)}>
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => handleDeleteStyle(style.styleId)}>
                        <Trash2 className="h-4 w-4 text-red-500" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      ) : (
        <div className="text-center py-10 bg-gray-50 rounded-lg border border-dashed border-gray-300">
          <p className="text-gray-500">등록된 이미지 스타일이 없습니다.</p>
        </div>
      )}
      
      {/* 스타일 생성 다이얼로그 */}
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>새 이미지 스타일 생성</DialogTitle>
            <DialogDescription>
              태몽동화에 사용할 새로운 이미지 스타일을 만듭니다.
            </DialogDescription>
          </DialogHeader>
          
          <ImageStyleForm 
            onSuccess={() => {
              setIsCreateDialogOpen(false);
              queryClient.invalidateQueries({ queryKey: ["/api/image-styles"] });
            }}
          />
        </DialogContent>
      </Dialog>
      
      {/* 스타일 편집 다이얼로그 */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>이미지 스타일 편집</DialogTitle>
            <DialogDescription>
              이미지 스타일의 세부 정보를 수정합니다.
            </DialogDescription>
          </DialogHeader>
          
          {editingStyle && (
            <ImageStyleForm 
              initialData={editingStyle}
              onSuccess={() => {
                setIsEditDialogOpen(false);
                queryClient.invalidateQueries({ queryKey: ["/api/image-styles"] });
              }}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

// 파일 업로드 컴포넌트
function FileUpload({
  onFileSelect,
  accept = "image/*",
  maxSize = 5 * 1024 * 1024 // 기본 5MB
}: {
  onFileSelect: (file: File) => void;
  accept?: string;
  maxSize?: number;
}) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    
    if (!file) return;
    
    // 파일 크기 검증
    if (file.size > maxSize) {
      toast({
        title: "파일 크기 초과",
        description: `파일 크기는 ${Math.floor(maxSize / 1024 / 1024)}MB를 초과할 수 없습니다.`,
        variant: "destructive",
      });
      return;
    }
    
    onFileSelect(file);
  };

  const handleClick = () => {
    fileInputRef.current?.click();
  };

  return (
    <div>
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        accept={accept}
        className="hidden"
      />
      <Button
        type="button"
        variant="outline"
        onClick={handleClick}
        className="w-full"
      >
        <Upload className="mr-2 h-4 w-4" />
        파일 선택
      </Button>
    </div>
  );
}

// 이미지 스타일 폼 컴포넌트
function ImageStyleForm({ initialData, onSuccess }: { initialData?: any, onSuccess: () => void }) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(initialData?.thumbnailUrl || null);
  const [selectedCharacterFile, setSelectedCharacterFile] = useState<File | null>(null);
  const [characterPreviewUrl, setCharacterPreviewUrl] = useState<string | null>(initialData?.characterSampleUrl || null);
  
  // 폼 설정
  const form = useForm({
    defaultValues: initialData || {
      styleId: "",
      name: "",
      systemPrompt: "",
      description: "",
      characterPrompt: "", // 캐릭터 프롬프트 추가
    }
  });
  
  // 파일 선택 핸들러
  const handleFileSelected = (file: File) => {
    setSelectedFile(file);
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
  };
  
  // 캐릭터 샘플 파일 선택 핸들러
  const handleCharacterFileSelected = (file: File) => {
    setSelectedCharacterFile(file);
    const url = URL.createObjectURL(file);
    setCharacterPreviewUrl(url);
  };
  
  // 스타일 생성/수정 뮤테이션
  const stylesMutation = useMutation({
    mutationFn: (data: any) => {
      // FormData 객체면 JSON.stringify 하지 않고 그대로 전달
      const isFormData = data instanceof FormData;
      
      if (initialData) {
        return fetch(`/api/image-styles/${initialData.styleId}`, {
          method: "PUT",
          body: data,
          // FormData는 Content-Type을 설정하지 않아 브라우저가 자동으로 multipart/form-data로 설정함
          headers: isFormData ? undefined : {
            'Content-Type': 'application/json'
          }
        }).then(res => {
          if (!res.ok) throw new Error('요청 실패');
          return res.json();
        });
      } else {
        return fetch("/api/image-styles", {
          method: "POST",
          body: data,
          headers: isFormData ? undefined : {
            'Content-Type': 'application/json'
          }
        }).then(res => {
          if (!res.ok) throw new Error('요청 실패');
          return res.json();
        });
      }
    },
    onSuccess: () => {
      toast({
        title: initialData ? "스타일 수정 완료" : "스타일 생성 완료",
        description: initialData 
          ? "이미지 스타일이 성공적으로 수정되었습니다." 
          : "새 이미지 스타일이 생성되었습니다.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/image-styles"] });
      onSuccess();
    },
    onError: (error) => {
      toast({
        title: "오류",
        description: "이미지 스타일 저장 중 오류가 발생했습니다.",
        variant: "destructive",
      });
      console.error("Error saving image style:", error);
    }
  });
  
  const onSubmit = (values: any) => {
    // FormData를 사용하여 멀티파트 요청 생성
    const formData = new FormData();
    
    // 텍스트 필드 추가
    Object.keys(values).forEach(key => {
      formData.append(key, values[key]);
    });
    
    // 스타일 썸네일 이미지 추가
    if (selectedFile) {
      formData.append('thumbnail', selectedFile);
    }
    
    // 캐릭터 샘플 이미지 추가
    if (selectedCharacterFile) {
      formData.append('characterSample', selectedCharacterFile);
    }
    
    stylesMutation.mutate(formData);
  };
  
  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <div className="space-y-4">
          <FormField
            control={form.control}
            name="styleId"
            render={({ field }) => (
              <FormItem>
                <FormLabel>스타일 ID</FormLabel>
                <FormControl>
                  <Input 
                    placeholder="ghibli" 
                    {...field} 
                    disabled={!!initialData}
                  />
                </FormControl>
                <FormDescription>
                  스타일의 고유 식별자입니다. 영문 소문자와 숫자만 사용해주세요.
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
          
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>이름</FormLabel>
                <FormControl>
                  <Input placeholder="지브리풍" {...field} />
                </FormControl>
                <FormDescription>
                  사용자에게 표시될 스타일 이름입니다.
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
                    placeholder="지브리 스튜디오 스타일의 이미지를 생성합니다." 
                    {...field} 
                    rows={2}
                  />
                </FormControl>
                <FormDescription>
                  이 스타일에 대한 간략한 설명입니다.
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
          
          <FormField
            control={form.control}
            name="systemPrompt"
            render={({ field }) => (
              <FormItem>
                <FormLabel>시스템 프롬프트</FormLabel>
                <FormControl>
                  <Textarea 
                    placeholder="지브리 스튜디오 스타일과 비슷하게 이미지를 생성해주세요. 한장에 한장면만 연출되도록 생성해주세요. 일본 애니메이션 특유의 섬세한 선과 느낌을 충분히 살려주세요." 
                    {...field} 
                    rows={8}
                  />
                </FormControl>
                <FormDescription>
                  이미지 생성 시 사용될 스타일 프롬프트입니다. 상세하게 스타일 특성을 설명해주세요.
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
          
          <FormField
            control={form.control}
            name="characterPrompt"
            render={({ field }) => (
              <FormItem>
                <FormLabel>캐릭터 참조 프롬프트</FormLabel>
                <FormControl>
                  <Textarea 
                    placeholder="사용자가 업로드한 인물 사진을 기반으로 캐릭터를 생성할 때 사용됩니다. 참조 사진의 인물 특징(얼굴 생김새, 머리 스타일 등)을 유지하면서 스타일에 맞게 변환해주세요." 
                    {...field} 
                    rows={5}
                  />
                </FormControl>
                <FormDescription>
                  인물 사진 기반 캐릭터 생성 시 사용될 추가 프롬프트입니다. 일관된 캐릭터 표현을 위한 지침을 작성해주세요.
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
          
          {/* 이미지 업로드 영역 */}
          <div className="grid grid-cols-2 gap-6 mt-6">
            {/* 스타일 샘플 이미지 */}
            <div className="border rounded-md p-4">
              <FormLabel>스타일 샘플 이미지</FormLabel>
              <div className="mt-2">
                <FileUpload
                  onFileSelect={handleFileSelected}
                  accept="image/*"
                  maxSize={5 * 1024 * 1024}
                />
                <p className="text-sm text-muted-foreground mt-2">
                  PNG, JPG 형식 (최대 5MB)
                </p>
                <div className="border rounded-md p-2 flex items-center justify-center h-40 mt-2">
                  {previewUrl ? (
                    <img
                      src={previewUrl}
                      alt="스타일 미리보기"
                      className="max-h-[150px] max-w-full object-contain"
                    />
                  ) : (
                    <div className="text-center p-6 text-muted-foreground">
                      <ImagePlus className="h-10 w-10 mx-auto mb-2" />
                      <p>스타일 샘플 미리보기</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
            
            {/* 캐릭터 샘플 이미지 */}
            <div className="border rounded-md p-4">
              <FormLabel>캐릭터 참조 샘플 이미지 (선택사항)</FormLabel>
              <div className="mt-2">
                <FileUpload
                  onFileSelect={handleCharacterFileSelected}
                  accept="image/*"
                  maxSize={5 * 1024 * 1024}
                />
                <p className="text-sm text-muted-foreground mt-2">
                  캐릭터 생성 참조용 이미지 (최대 5MB)
                </p>
                <div className="border rounded-md p-2 flex items-center justify-center h-40 mt-2">
                  {characterPreviewUrl ? (
                    <img
                      src={characterPreviewUrl}
                      alt="캐릭터 샘플"
                      className="max-h-[150px] max-w-full object-contain"
                    />
                  ) : (
                    <div className="text-center p-6 text-muted-foreground">
                      <ImagePlus className="h-10 w-10 mx-auto mb-2" />
                      <p>캐릭터 샘플 미리보기</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
        
        <div className="flex justify-end space-x-2">
          <Button 
            type="button" 
            variant="outline" 
            onClick={onSuccess}
          >
            취소
          </Button>
          <Button 
            type="submit" 
            disabled={stylesMutation.isPending}
          >
            {stylesMutation.isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                저장 중...
              </>
            ) : (
              "저장"
            )}
          </Button>
        </div>
      </form>
    </Form>
  );
}