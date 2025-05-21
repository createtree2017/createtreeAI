import React, { useState, useEffect } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useLocation } from 'wouter';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

// UI 컴포넌트
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { FileUpload } from '@/components/ui/file-upload';
import { Loader2, AlertCircle } from 'lucide-react';

// 유틸리티
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
import { useAuthContext } from '@/lib/AuthProvider';

// 캐릭터 생성 스키마 (서버 API와 일치하도록 수정)
const characterSchema = z.object({
  babyName: z.string().min(1, '아기 이름을 입력해주세요'),
  style: z.string().min(1, '스타일을 선택해주세요')
});

// 태몽동화 생성 스키마
const dreamBookSchema = z.object({
  babyName: z.string().min(1, '아기 이름을 입력해주세요'),
  dreamer: z.string().min(1, '꿈을 꾼 사람을 입력해주세요'),
  styleId: z.string().min(1, '스타일을 선택해주세요'),
  peoplePrompt: z.string().min(1, '인물 표현은 필수입니다').default('아기는 귀엽고 활기찬 모습이다.'),
  backgroundPrompt: z.string().min(1, '배경 표현은 필수입니다').default('환상적이고 아름다운 배경'),
  // 모든 장면을 string으로 취급하고 나중에 빈 문자열을 필터링
  scenePrompts: z.array(z.string())
    .max(4, '최대 4개의 장면까지 가능합니다'),
});

// 태몽동화 생성 페이지
export default function CreateDreamBook() {
  const [activeScene, setActiveScene] = useState(0);
  const [characterImage, setCharacterImage] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isCharacterDialogOpen, setIsCharacterDialogOpen] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const { toast } = useToast();
  const [, navigate] = useLocation();
  const { user } = useAuthContext();

  // 이미지 스타일 목록 가져오기
  const { data: styles, isLoading: isLoadingStyles } = useQuery({
    queryKey: ['/api/image-styles'],
    queryFn: async () => {
      const response = await fetch('/api/image-styles');
      if (!response.ok) {
        throw new Error('이미지 스타일 목록을 불러오는데 실패했습니다');
      }
      return response.json();
    },
  });

  // 폼 설정
  const form = useForm<z.infer<typeof dreamBookSchema>>({
    resolver: zodResolver(dreamBookSchema),
    defaultValues: {
      babyName: '',
      dreamer: '',
      styleId: '',
      peoplePrompt: '아기는 귀엽고 활기찬 모습이다.',
      backgroundPrompt: '환상적이고 아름다운 배경',
      scenePrompts: ['', '', '', ''],
    },
  });

  // 스타일 변경 시 캐릭터 이미지 초기화
  const selectedStyleId = form.watch('styleId');
  useEffect(() => {
    setCharacterImage(null);
  }, [selectedStyleId]);

  // 아기 캐릭터 생성 뮤테이션 (업로드된 사진 기반)
  const generateCharacterMutation = useMutation({
    mutationFn: async (data: FormData) => {
      return fetch('/api/dream-books/character', {
        method: 'POST',
        // FormData를 사용하므로 Content-Type 헤더를 생략 (브라우저가 자동으로 설정)
        body: data
      }).then(response => {
        if (!response.ok) {
          throw new Error('캐릭터 생성에 실패했습니다');
        }
        return response.json();
      });
    },
    onSuccess: (data) => {
      if (data.result && data.result.characterImageUrl) {
        setCharacterImage(data.result.characterImageUrl);
        setIsCharacterDialogOpen(false);
        toast({
          title: '캐릭터 생성 완료',
          description: '태몽동화에 사용될 캐릭터가 생성되었습니다.'
        });
      } else {
        toast({
          title: '오류 발생',
          description: '캐릭터 이미지를 받지 못했습니다. 다시 시도해주세요.',
          variant: 'destructive'
        });
      }
    },
    onError: (error) => {
      toast({
        title: '오류 발생',
        description: '캐릭터 생성 중 오류가 발생했습니다. 다시 시도해주세요.',
        variant: 'destructive'
      });
      console.error('Character generation error:', error);
    }
  });

  // 태몽동화 생성 뮤테이션
  const createDreamBookMutation = useMutation({
    mutationFn: async (data: z.infer<typeof dreamBookSchema>) => {
      if (!characterImage) {
        throw new Error('캐릭터 이미지가 필요합니다. 먼저 캐릭터를 생성해주세요.');
      }

      // 유효한 장면 프롬프트만 필터링
      const validScenePrompts = data.scenePrompts.filter(p => p && p.trim().length > 0);
      if (validScenePrompts.length === 0) {
        throw new Error('최소 1개 이상의 장면 설명이 필요합니다.');
      }

      // 서버에 보내는 데이터 형식을 API 요구사항에 맞게 변환
      const payload = {
        babyName: data.babyName,
        dreamer: data.dreamer,
        style: data.styleId, // styleId → style 변환 (서버 기대 형식)
        characterImageUrl: characterImage,
        peoplePrompt: data.peoplePrompt,
        backgroundPrompt: data.backgroundPrompt,
        numberOfScenes: validScenePrompts.length,
        scenePrompts: validScenePrompts
      };

      return fetch('/api/dream-books', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      }).then(response => {
        if (!response.ok) {
          throw new Error(`태몽동화 생성에 실패했습니다 (${response.status})`);
        }
        return response.json();
      });
    },
    onSuccess: (data) => {
      setIsGenerating(false);
      toast({
        title: '태몽동화 생성 완료',
        description: '태몽동화가 성공적으로 생성되었습니다.'
      });
      navigate(`/dream-book/detail/${data.result.id}`);
    },
    onError: (error) => {
      setIsGenerating(false);
      toast({
        title: '오류 발생',
        description: `태몽동화 생성 중 오류가 발생했습니다: ${error instanceof Error ? error.message : '알 수 없는 오류'}`,
        variant: 'destructive'
      });
      console.error('Dream book creation error:', error);
    }
  });

  // 캐릭터 생성 처리 (사진 기반)
  const handleGenerateCharacter = () => {
    console.log('캐릭터 생성 버튼 클릭됨');
    
    if (!selectedFile) {
      toast({
        title: '사진 필요',
        description: '캐릭터 생성을 위해 사진을 업로드해주세요.',
        variant: 'destructive'
      });
      return;
    }

    const babyName = form.getValues('babyName') || '아기';
    const styleId = form.getValues('styleId');
    
    if (!styleId) {
      toast({
        title: '스타일 필요',
        description: '캐릭터 생성을 위해 스타일을 선택해주세요.',
        variant: 'destructive'
      });
      return;
    }

    // 캐릭터 생성 시작 알림
    toast({
      title: '캐릭터 생성 시작',
      description: '업로드한 사진을 기반으로 아기 캐릭터를 생성하고 있습니다. 잠시 기다려주세요.',
    });

    console.log('캐릭터 생성 시작:', { babyName, styleId, fileSelected: !!selectedFile, fileName: selectedFile.name });
    
    // FormData 생성 및 필요한 데이터 추가
    const formData = new FormData();
    formData.append('babyName', babyName);
    formData.append('style', String(styleId)); // 서버에서는 'style' 필드를 기대함
    formData.append('image', selectedFile); // 업로드한 이미지 파일 추가
    
    try {
      generateCharacterMutation.mutate(formData);
    } catch (error) {
      console.error('캐릭터 생성 오류:', error);
      toast({
        title: '오류 발생',
        description: '캐릭터 생성 중 오류가 발생했습니다.',
        variant: 'destructive'
      });
    }
  };

  // 파일 선택 처리 - FileUpload 컴포넌트에 맞는 함수명
  const onFileSelect = (file: File) => {
    console.log('파일 선택됨:', file.name, file.size);
    setSelectedFile(file);
  };

  // 이전 장면 내용을 현재 장면으로 복사
  const copyFromPreviousScene = () => {
    if (activeScene === 0) return;
    
    const scenePrompts = form.getValues('scenePrompts');
    const previousScenePrompt = scenePrompts[activeScene - 1];
    
    form.setValue(`scenePrompts.${activeScene}`, previousScenePrompt);
  };

  // 태몽동화 생성하기 버튼 클릭 처리
  const handleCreateDreamBook = () => {
    // 폼 데이터 가져오기
    const formValues = form.getValues();
    
    // 캐릭터 확인
    if (!characterImage) {
      toast({
        title: '캐릭터 필요',
        description: '먼저 캐릭터를 생성해주세요.',
        variant: 'destructive'
      });
      return;
    }
    
    // 장면 확인 (최소 1개)
    const scenePrompts = formValues.scenePrompts.filter(p => p && p.trim().length > 0);
    if (scenePrompts.length === 0) {
      toast({
        title: '장면 입력 필요',
        description: '최소 1개 이상의 장면 설명을 입력해주세요.',
        variant: 'destructive'
      });
      return;
    }
    
    // 생성 시작 알림
    toast({
      title: '태몽동화 생성 시작',
      description: '태몽동화를 생성하고 있습니다. 잠시 기다려주세요.',
    });
    
    // 처리 중 상태 설정
    setIsGenerating(true);
    
    // mutation 호출
    createDreamBookMutation.mutate(formValues);
  };

  // 장면 탭 콘텐츠 렌더링
  const renderSceneTabContent = (index: number) => (
    <TabsContent value={String(index)} className="space-y-4">
      <h3 className="text-lg font-medium">장면 {index + 1} 설정</h3>
      
      <FormField
        control={form.control}
        name={`scenePrompts.${index}`}
        render={({ field }) => (
          <FormItem>
            <FormLabel>장면 묘사 (필수)</FormLabel>
            <FormControl>
              <Textarea 
                placeholder="이 장면에서 일어나는 일을 상세히 설명해주세요."
                className="min-h-[150px]"
                {...field}
              />
            </FormControl>
            <FormDescription>
              이 장면에서 일어나는 상황을 자세히 설명해주세요.
            </FormDescription>
            <FormMessage />
          </FormItem>
        )}
      />
      
      {index > 0 && (
        <Button 
          type="button" 
          variant="outline" 
          size="sm"
          onClick={copyFromPreviousScene}
        >
          이전 장면에서 복사
        </Button>
      )}
    </TabsContent>
  );

  return (
    <div className="container mx-auto py-8 max-w-4xl">
      <h1 className="text-3xl font-bold mb-6">태몽동화 만들기</h1>
      
      <Form {...form}>
        <form className="space-y-8">
          {/* 기본 정보 입력 */}
          {renderBasicInfoSection()}
          
          {/* 스타일 선택 및 캐릭터 생성 */}
          {renderStyleAndCharacterSection()}
          
          {/* 공통 설정 (인물/배경) */}
          {renderCommonSettingsSection()}
          
          {/* 장면 설정 */}
          <div className="space-y-6">
            <Card>
              <CardContent className="p-6">
                <h3 className="text-lg font-medium mb-4">태몽동화 장면 구성</h3>
                <Tabs defaultValue="0" value={String(activeScene)} onValueChange={(value) => setActiveScene(parseInt(value))}>
                  <TabsList className="mb-4">
                    <TabsTrigger value="0">장면 1</TabsTrigger>
                    <TabsTrigger value="1">장면 2</TabsTrigger>
                    <TabsTrigger value="2">장면 3</TabsTrigger>
                    <TabsTrigger value="3">장면 4</TabsTrigger>
                  </TabsList>
                  {[0, 1, 2, 3].map((index) => renderSceneTabContent(index))}
                </Tabs>
              </CardContent>
            </Card>
          </div>

          <div className="flex justify-end mt-8">
            <Button
              type="button" 
              disabled={isGenerating}
              size="lg"
              onClick={handleCreateDreamBook}
            >
              {isGenerating ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  태몽동화 생성 중...
                </>
              ) : (
                "태몽동화 생성하기"
              )}
            </Button>
          </div>
        </form>
      </Form>

      {/* 캐릭터 생성 다이얼로그 */}
      <Dialog open={isCharacterDialogOpen} onOpenChange={setIsCharacterDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>캐릭터 생성하기</DialogTitle>
            <DialogDescription>
              태몽동화에 등장할 캐릭터 이미지를 생성합니다. 사진을 업로드하면 선택한 스타일로 아기 캐릭터를 만들어드립니다.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="flex flex-col items-center">
              <FileUpload
                onFileSelect={onFileSelect}
                accept="image/*"
                maxSize={5 * 1024 * 1024} // 5MB
              />
            </div>
          </div>
          
          <DialogFooter>
            <Button 
              onClick={() => setIsCharacterDialogOpen(false)} 
              variant="outline"
            >
              취소
            </Button>
            <Button 
              onClick={handleGenerateCharacter}
              disabled={!selectedFile || !form.getValues('styleId') || generateCharacterMutation.isPending}
            >
              {generateCharacterMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  생성 중...
                </>
              ) : "캐릭터 생성하기"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );

  // 기본 정보 섹션
  function renderBasicInfoSection() {
    return (
      <div className="space-y-6">
        <Card>
          <CardContent className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <FormField
                control={form.control}
                name="babyName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>아기 이름</FormLabel>
                    <FormControl>
                      <Input placeholder="아기 이름을 입력해주세요" {...field} />
                    </FormControl>
                    <FormDescription>
                      태몽동화에 등장할 아기의 이름입니다.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="dreamer"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>꿈을 꾼 사람</FormLabel>
                    <FormControl>
                      <Input placeholder="꿈을 꾼 사람의 이름을 입력해주세요" {...field} />
                    </FormControl>
                    <FormDescription>
                      태몽을 꾼 사람의 이름이나 관계를 입력하세요 (예: 엄마, 아빠, 할머니).
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // 스타일 선택 및 캐릭터 생성 섹션
  function renderStyleAndCharacterSection() {
    return (
      <div className="space-y-6">
        <Card>
          <CardContent className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h3 className="text-lg font-medium mb-4">스타일 선택</h3>
                <FormField
                  control={form.control}
                  name="styleId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>이미지 스타일</FormLabel>
                      <Select 
                        value={field.value} 
                        onValueChange={field.onChange}
                        disabled={isLoadingStyles}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="스타일을 선택해주세요" />
                        </SelectTrigger>
                        <SelectContent>
                          {styles?.map((style: any) => (
                            <SelectItem key={style.styleId} value={style.styleId}>
                              {style.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormDescription>
                        태몽동화의 시각적 스타일을 선택해주세요.
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <div>
                <h3 className="text-lg font-medium mb-4">캐릭터 생성</h3>
                <div className="bg-card rounded-lg border p-4">
                  {characterImage ? (
                    <div className="flex flex-col items-center">
                      <div className="relative mb-3">
                        <div className="rounded-md overflow-hidden border w-32 h-32">
                          <img 
                            src={characterImage} 
                            alt="생성된 캐릭터" 
                            className="w-full h-full object-cover"
                          />
                        </div>
                        <div className="absolute -top-2 -right-2 bg-green-500 text-white p-1 rounded-full">
                          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M20 6L9 17l-5-5"></path>
                          </svg>
                        </div>
                      </div>
                      <p className="text-sm font-medium mb-2">캐릭터가 생성되었습니다!</p>
                      <Button 
                        onClick={() => setIsCharacterDialogOpen(true)}
                        variant="outline"
                        size="sm"
                        className="w-full"
                      >
                        캐릭터 다시 생성하기
                      </Button>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center">
                      <div className="w-32 h-32 flex items-center justify-center border-2 border-dashed border-gray-300 rounded-md mb-3">
                        <svg xmlns="http://www.w3.org/2000/svg" width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-muted-foreground">
                          <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
                          <circle cx="9" cy="7" r="4"></circle>
                          <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
                          <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
                        </svg>
                      </div>
                      <p className="text-sm text-muted-foreground mb-2">캐릭터를 생성해주세요 (필수)</p>
                      <Button 
                        onClick={() => setIsCharacterDialogOpen(true)}
                        disabled={!selectedStyleId}
                        className="w-full"
                      >
                        {generateCharacterMutation.isPending ? (
                          <>
                            <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                            생성 중...
                          </>
                        ) : "캐릭터 생성하기"}
                      </Button>
                      
                      {!selectedStyleId || !form.getValues('babyName') ? (
                        <p className="text-xs text-amber-500 mt-2">
                          아기 이름과 스타일을 먼저 입력해주세요
                        </p>
                      ) : null}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // 공통 설정 섹션 (인물/배경 프롬프트)
  function renderCommonSettingsSection() {
    return (
      <div className="space-y-6">
        <Card>
          <CardContent className="p-6">
            <h3 className="text-lg font-medium mb-4">동화 스타일 세부 설정</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <FormField
                control={form.control}
                name="peoplePrompt"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>인물 표현</FormLabel>
                    <FormControl>
                      <Textarea 
                        placeholder="인물의 특징적인 표현을 입력해주세요" 
                        {...field}
                      />
                    </FormControl>
                    <FormDescription>
                      캐릭터의 모습이나 행동을 어떻게 표현할지 설명해주세요.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="backgroundPrompt"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>배경 표현</FormLabel>
                    <FormControl>
                      <Textarea 
                        placeholder="배경의 특징적인 표현을 입력해주세요" 
                        {...field}
                      />
                    </FormControl>
                    <FormDescription>
                      장면의 배경을 어떻게 표현할지 설명해주세요.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }
}