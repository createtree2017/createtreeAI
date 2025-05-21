import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
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
  PlusCircle, 
  Edit2, 
  Trash2, 
  Eye, 
  Loader2,
  ImagePlus
} from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { FileUpload } from '@/components/ui/file-upload';
import { SuperAdminLayout } from '@/components/SuperAdminLayout';

// 태몽동화 스타일 타입 정의
interface DreamBookStyle {
  id: string;
  name: string;
  description: string;
  systemPrompt: string;
  thumbnailUrl: string;
  characterPrompt?: string;
  characterSampleUrl?: string;
}

// 폼 검증 스키마
const styleSchema = z.object({
  id: z.string().min(1, 'ID는 필수입니다'),
  name: z.string().min(1, '스타일 이름은 필수입니다'),
  description: z.string().min(1, '설명은 필수입니다'),
  systemPrompt: z.string().min(1, '시스템 프롬프트는 필수입니다'),
  characterPrompt: z.string().optional(),
});

export default function DreamBookStylesPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [selectedStyle, setSelectedStyle] = useState<DreamBookStyle | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [selectedCharacterFile, setSelectedCharacterFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [characterPreviewUrl, setCharacterPreviewUrl] = useState<string | null>(null);

  // 스타일 목록 조회
  const { data: styles, isLoading, isError } = useQuery<DreamBookStyle[]>({
    queryKey: ['/api/dreambook-styles'],
    queryFn: async () => {
      const response = await fetch('/api/dreambook-styles');
      if (!response.ok) {
        throw new Error('태몽동화 스타일 목록을 불러오는데 실패했습니다');
      }
      return response.json();
    },
  });

  // 폼 설정
  const form = useForm<z.infer<typeof styleSchema>>({
    resolver: zodResolver(styleSchema),
    defaultValues: {
      id: '',
      name: '',
      description: '',
      systemPrompt: '',
      characterPrompt: '',
    },
  });

  // 스타일 추가 뮤테이션
  const addStyleMutation = useMutation({
    mutationFn: async (data: FormData) => {
      const response = await fetch('/api/dreambook-styles', {
        method: 'POST',
        body: data,
      });

      if (!response.ok) {
        throw new Error('스타일 추가에 실패했습니다');
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/dreambook-styles'] });
      setIsAddDialogOpen(false);
      form.reset();
      setSelectedFile(null);
      setPreviewUrl(null);
      toast({
        title: '스타일 추가 성공',
        description: '새로운 태몽동화 스타일이 추가되었습니다.',
      });
    },
    onError: (error) => {
      toast({
        title: '스타일 추가 실패',
        description: error instanceof Error ? error.message : '알 수 없는 오류가 발생했습니다.',
        variant: 'destructive',
      });
    },
  });

  // 스타일 수정 뮤테이션
  const updateStyleMutation = useMutation({
    mutationFn: async (data: FormData) => {
      const styleId = data.get('id') as string;
      const response = await fetch(`/api/dreambook-styles/${styleId}`, {
        method: 'PUT',
        body: data,
      });

      if (!response.ok) {
        throw new Error('스타일 수정에 실패했습니다');
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/dreambook-styles'] });
      setIsEditDialogOpen(false);
      setSelectedStyle(null);
      setSelectedFile(null);
      setPreviewUrl(null);
      toast({
        title: '스타일 수정 성공',
        description: '태몽동화 스타일이 수정되었습니다.',
      });
    },
    onError: (error) => {
      toast({
        title: '스타일 수정 실패',
        description: error instanceof Error ? error.message : '알 수 없는 오류가 발생했습니다.',
        variant: 'destructive',
      });
    },
  });

  // 스타일 삭제 뮤테이션
  const deleteStyleMutation = useMutation({
    mutationFn: async (styleId: string) => {
      const response = await fetch(`/api/dreambook-styles/${styleId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('스타일 삭제에 실패했습니다');
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/dreambook-styles'] });
      setIsDeleteDialogOpen(false);
      setSelectedStyle(null);
      toast({
        title: '스타일 삭제 성공',
        description: '태몽동화 스타일이 삭제되었습니다.',
      });
    },
    onError: (error) => {
      toast({
        title: '스타일 삭제 실패',
        description: error instanceof Error ? error.message : '알 수 없는 오류가 발생했습니다.',
        variant: 'destructive',
      });
    },
  });

  // 썸네일 파일 선택 처리
  const handleFileSelected = (file: File | null) => {
    setSelectedFile(file);
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        setPreviewUrl(e.target?.result as string);
      };
      reader.readAsDataURL(file);
    } else {
      setPreviewUrl(null);
    }
  };
  
  // 캐릭터 샘플 이미지 파일 선택 처리
  const handleCharacterFileSelected = (file: File | null) => {
    setSelectedCharacterFile(file);
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        setCharacterPreviewUrl(e.target?.result as string);
      };
      reader.readAsDataURL(file);
    } else {
      setCharacterPreviewUrl(null);
    }
  };

  // 스타일 추가 폼 제출
  const handleAddStyle = (values: z.infer<typeof styleSchema>) => {
    if (!selectedFile) {
      toast({
        title: '썸네일 필요',
        description: '스타일 썸네일 이미지를 업로드해주세요.',
        variant: 'destructive',
      });
      return;
    }

    const formData = new FormData();
    formData.append('id', values.id);
    formData.append('name', values.name);
    formData.append('description', values.description);
    formData.append('systemPrompt', values.systemPrompt);
    formData.append('thumbnail', selectedFile);
    
    // 캐릭터 관련 필드 (선택적)
    if (values.characterPrompt) {
      formData.append('characterPrompt', values.characterPrompt);
    }
    
    if (selectedCharacterFile) {
      formData.append('characterSample', selectedCharacterFile);
    }

    addStyleMutation.mutate(formData);
  };

  // 스타일 수정 폼 제출
  const handleUpdateStyle = (values: z.infer<typeof styleSchema>) => {
    const formData = new FormData();
    formData.append('id', values.id);
    formData.append('name', values.name);
    formData.append('description', values.description);
    formData.append('systemPrompt', values.systemPrompt);
    
    // 캐릭터 프롬프트 추가 (선택적)
    if (values.characterPrompt) {
      formData.append('characterPrompt', values.characterPrompt);
    }
    
    // 썸네일 이미지가 선택된 경우
    if (selectedFile) {
      formData.append('thumbnail', selectedFile);
    }
    
    // 캐릭터 샘플 이미지가 선택된 경우
    if (selectedCharacterFile) {
      formData.append('characterSample', selectedCharacterFile);
    }

    updateStyleMutation.mutate(formData);
  };

  // 스타일 수정 다이얼로그 열기
  const handleOpenEditDialog = (style: DreamBookStyle) => {
    setSelectedStyle(style);
    form.reset({
      id: style.id,
      name: style.name,
      description: style.description,
      systemPrompt: style.systemPrompt,
      characterPrompt: style.characterPrompt || '',
    });
    setPreviewUrl(style.thumbnailUrl);
    setCharacterPreviewUrl(style.characterSampleUrl || null);
    setSelectedFile(null);
    setSelectedCharacterFile(null);
    setIsEditDialogOpen(true);
  };

  // 스타일 삭제 다이얼로그 열기
  const handleOpenDeleteDialog = (style: DreamBookStyle) => {
    setSelectedStyle(style);
    setIsDeleteDialogOpen(true);
  };

  // 스타일 추가 다이얼로그 열기
  const handleOpenAddDialog = () => {
    form.reset({
      id: '',
      name: '',
      description: '',
      systemPrompt: '',
    });
    setSelectedFile(null);
    setPreviewUrl(null);
    setIsAddDialogOpen(true);
  };

  if (isLoading) {
    return (
      <SuperAdminLayout>
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-10 h-10 animate-spin text-primary" />
        </div>
      </SuperAdminLayout>
    );
  }

  if (isError) {
    return (
      <SuperAdminLayout>
        <div className="bg-destructive/10 p-6 rounded-lg text-center">
          <p className="text-destructive font-medium">
            태몽동화 스타일 목록을 불러오는데 실패했습니다. 잠시 후 다시 시도해주세요.
          </p>
        </div>
      </SuperAdminLayout>
    );
  }

  return (
    <SuperAdminLayout>
      <div className="container py-6">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold">태몽동화 스타일 관리</h1>
          <Button onClick={handleOpenAddDialog} className="flex items-center gap-2">
            <PlusCircle className="w-4 h-4" />
            스타일 추가
          </Button>
        </div>

        {/* 스타일 목록 */}
        <div className="bg-card rounded-lg shadow border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[100px]">썸네일</TableHead>
                <TableHead className="w-[150px]">스타일 ID</TableHead>
                <TableHead>이름</TableHead>
                <TableHead>설명</TableHead>
                <TableHead className="w-[120px]">작업</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {styles && styles.length > 0 ? (
                styles.map((style) => (
                  <TableRow key={style.id}>
                    <TableCell>
                      <div className="w-14 h-14 rounded-md overflow-hidden">
                        <img
                          src={style.thumbnailUrl}
                          alt={style.name}
                          className="w-full h-full object-cover"
                        />
                      </div>
                    </TableCell>
                    <TableCell className="font-medium">{style.id}</TableCell>
                    <TableCell>{style.name}</TableCell>
                    <TableCell className="max-w-xs truncate">{style.description}</TableCell>
                    <TableCell>
                      <div className="flex space-x-2">
                        <Button
                          variant="outline"
                          size="icon"
                          onClick={() => handleOpenEditDialog(style)}
                          title="수정"
                        >
                          <Edit2 className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="icon"
                          onClick={() => handleOpenDeleteDialog(style)}
                          title="삭제"
                          className="text-destructive hover:text-destructive"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-10 text-muted-foreground">
                    등록된 태몽동화 스타일이 없습니다. 새로운 스타일을 추가해주세요.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>

        {/* 스타일 추가 다이얼로그 */}
        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>태몽동화 스타일 추가</DialogTitle>
              <DialogDescription>
                새로운 태몽동화 스타일을 추가합니다. 모든 필드를 작성해주세요.
              </DialogDescription>
            </DialogHeader>

            <Form {...form}>
              <form
                onSubmit={form.handleSubmit(handleAddStyle)}
                className="space-y-4"
              >
                <div className="grid grid-cols-2 gap-x-4 gap-y-2">
                  <FormField
                    control={form.control}
                    name="id"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>스타일 ID</FormLabel>
                        <FormControl>
                          <Input placeholder="ghibli" {...field} />
                        </FormControl>
                        <FormDescription>
                          영문 소문자와 숫자로 구성된 고유 ID (예: ghibli, disney 등)
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
                        <FormLabel>스타일 이름</FormLabel>
                        <FormControl>
                          <Input placeholder="지브리풍" {...field} />
                        </FormControl>
                        <FormDescription>
                          사용자에게 표시되는 스타일 이름
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
                      <FormLabel>스타일 설명</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="따뜻하고 환상적인 지브리 스튜디오 스타일"
                          {...field}
                        />
                      </FormControl>
                      <FormDescription>
                        스타일에 대한 간략한 설명
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
                          rows={6}
                          placeholder="Create an image in the style of Studio Ghibli, with soft, warm colors, detailed backgrounds, and a magical, whimsical atmosphere..."
                          {...field}
                        />
                      </FormControl>
                      <FormDescription>
                        이미지 생성 모델에 전달될 프롬프트 (영어로 작성 권장)
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <div className="border-t pt-4 mt-4">
                  <h3 className="text-lg font-medium mb-2">태몽동화 캐릭터 참조 설정</h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    캐릭터 생성에 사용될 추가 설정입니다. 사용자가 업로드한 사진을 기반으로 일관된 캐릭터를 생성하는 데 사용됩니다.
                  </p>
                  
                  <FormField
                    control={form.control}
                    name="characterPrompt"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>캐릭터 참조 프롬프트</FormLabel>
                        <FormControl>
                          <Textarea
                            rows={4}
                            placeholder="Maintain consistent character appearance across all images. Apply the style while preserving the key facial features and identifiable characteristics from the reference image..."
                            {...field}
                          />
                        </FormControl>
                        <FormDescription>
                          업로드된 인물 사진에서 캐릭터 생성 시 적용할 추가 지시사항 (영어로 작성 권장)
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <div className="grid grid-cols-2 gap-6 mt-4">
                    <div>
                      <FormLabel>썸네일 이미지</FormLabel>
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
                              alt="Preview"
                              className="max-h-[150px] max-w-full object-contain"
                            />
                          ) : (
                            <div className="text-center p-6 text-muted-foreground">
                              <ImagePlus className="h-10 w-10 mx-auto mb-2" />
                              <p>스타일 썸네일 미리보기</p>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                    
                    <div>
                      <FormLabel>캐릭터 샘플 이미지 (선택사항)</FormLabel>
                      <div className="mt-2">
                        <FileUpload
                          onFileSelect={handleCharacterFileSelected}
                          accept="image/*"
                          maxSize={5 * 1024 * 1024}
                        />
                        <p className="text-sm text-muted-foreground mt-2">
                          캐릭터 생성 예시 이미지 (최대 5MB)
                        </p>
                        <div className="border rounded-md p-2 flex items-center justify-center h-40 mt-2">
                          {characterPreviewUrl ? (
                            <img
                              src={characterPreviewUrl}
                              alt="Character Sample"
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

                <DialogFooter>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setIsAddDialogOpen(false)}
                  >
                    취소
                  </Button>
                  <Button
                    type="submit"
                    disabled={addStyleMutation.isPending}
                  >
                    {addStyleMutation.isPending ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        저장 중...
                      </>
                    ) : (
                      '저장'
                    )}
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          </DialogContent>
        </Dialog>

        {/* 스타일 수정 다이얼로그 */}
        <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>태몽동화 스타일 수정</DialogTitle>
              <DialogDescription>
                태몽동화 스타일 정보를 수정합니다.
              </DialogDescription>
            </DialogHeader>

            <Form {...form}>
              <form
                onSubmit={form.handleSubmit(handleUpdateStyle)}
                className="space-y-4"
              >
                <div className="grid grid-cols-2 gap-x-4 gap-y-2">
                  <FormField
                    control={form.control}
                    name="id"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>스타일 ID</FormLabel>
                        <FormControl>
                          <Input readOnly {...field} />
                        </FormControl>
                        <FormDescription>
                          스타일 ID는 수정할 수 없습니다.
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
                        <FormLabel>스타일 이름</FormLabel>
                        <FormControl>
                          <Input placeholder="지브리풍" {...field} />
                        </FormControl>
                        <FormDescription>
                          사용자에게 표시되는 스타일 이름
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
                      <FormLabel>스타일 설명</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="따뜻하고 환상적인 지브리 스튜디오 스타일"
                          {...field}
                        />
                      </FormControl>
                      <FormDescription>
                        스타일에 대한 간략한 설명
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
                          rows={6}
                          placeholder="Create an image in the style of Studio Ghibli, with soft, warm colors, detailed backgrounds, and a magical, whimsical atmosphere..."
                          {...field}
                        />
                      </FormControl>
                      <FormDescription>
                        이미지 생성 모델에 전달될 프롬프트 (영어로 작성 권장)
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="border-t pt-4 mt-4">
                  <h3 className="text-lg font-medium mb-2">태몽동화 캐릭터 참조 설정</h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    캐릭터 생성에 사용될 추가 설정입니다. 사용자가 업로드한 사진을 기반으로 일관된 캐릭터를 생성하는 데 사용됩니다.
                  </p>
                  
                  <FormField
                    control={form.control}
                    name="characterPrompt"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>캐릭터 참조 프롬프트</FormLabel>
                        <FormControl>
                          <Textarea
                            rows={4}
                            placeholder="Maintain consistent character appearance across all images. Apply the style while preserving the key facial features and identifiable characteristics from the reference image..."
                            {...field}
                          />
                        </FormControl>
                        <FormDescription>
                          업로드된 인물 사진에서 캐릭터 생성 시 적용할 추가 지시사항 (영어로 작성 권장)
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <div className="grid grid-cols-2 gap-6 mt-4">
                    <div>
                      <FormLabel>썸네일 이미지</FormLabel>
                      <div className="mt-2">
                        <FileUpload
                          onFileSelect={handleFileSelected}
                          accept="image/*"
                          maxSize={5 * 1024 * 1024}
                        />
                        <p className="text-sm text-muted-foreground mt-2">
                          PNG, JPG 형식 (최대 5MB). 변경하지 않으려면 비워두세요.
                        </p>
                        <div className="border rounded-md p-2 flex items-center justify-center h-40 mt-2">
                          {previewUrl ? (
                            <img
                              src={previewUrl}
                              alt="Preview"
                              className="max-h-[150px] max-w-full object-contain"
                            />
                          ) : (
                            <div className="text-center p-6 text-muted-foreground">
                              <ImagePlus className="h-10 w-10 mx-auto mb-2" />
                              <p>스타일 썸네일 미리보기</p>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                    
                    <div>
                      <FormLabel>캐릭터 샘플 이미지 (선택사항)</FormLabel>
                      <div className="mt-2">
                        <FileUpload
                          onFileSelect={handleCharacterFileSelected}
                          accept="image/*"
                          maxSize={5 * 1024 * 1024}
                        />
                        <p className="text-sm text-muted-foreground mt-2">
                          캐릭터 생성 예시 이미지 (최대 5MB). 변경하지 않으려면 비워두세요.
                        </p>
                        <div className="border rounded-md p-2 flex items-center justify-center h-40 mt-2">
                          {characterPreviewUrl ? (
                            <img
                              src={characterPreviewUrl}
                              alt="Character Sample"
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

                <DialogFooter>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setIsEditDialogOpen(false)}
                  >
                    취소
                  </Button>
                  <Button
                    type="submit"
                    disabled={updateStyleMutation.isPending}
                  >
                    {updateStyleMutation.isPending ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        저장 중...
                      </>
                    ) : (
                      '저장'
                    )}
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          </DialogContent>
        </Dialog>

        {/* 스타일 삭제 확인 다이얼로그 */}
        <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>태몽동화 스타일 삭제</DialogTitle>
              <DialogDescription>
                정말로 이 스타일을 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.
              </DialogDescription>
            </DialogHeader>

            {selectedStyle && (
              <div className="flex items-center space-x-3 p-3 bg-muted rounded-md">
                <div className="w-12 h-12 rounded overflow-hidden flex-shrink-0">
                  <img
                    src={selectedStyle.thumbnailUrl}
                    alt={selectedStyle.name}
                    className="w-full h-full object-cover"
                  />
                </div>
                <div>
                  <h4 className="font-medium">{selectedStyle.name}</h4>
                  <p className="text-sm text-muted-foreground">
                    ID: {selectedStyle.id}
                  </p>
                </div>
              </div>
            )}

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsDeleteDialogOpen(false)}
              >
                취소
              </Button>
              <Button
                variant="destructive"
                onClick={() => selectedStyle && deleteStyleMutation.mutate(selectedStyle.id)}
                disabled={deleteStyleMutation.isPending}
              >
                {deleteStyleMutation.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    삭제 중...
                  </>
                ) : (
                  '삭제'
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </SuperAdminLayout>
  );
}