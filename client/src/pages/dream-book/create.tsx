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
  style: z.string().min(1, '스타일을 선택해주세요'),
  backgroundDescription: z.string().min(1, '배경 설명을 입력해주세요').default('환상적이고 아름다운 배경')
});

// 태몽동화 생성 스키마
const dreamBookSchema = z.object({
  babyName: z.string().min(1, '아기 이름을 입력해주세요'),
  dreamer: z.string().min(1, '꿈을 꾼 사람을 입력해주세요'),
  styleId: z.string().min(1, '스타일을 선택해주세요'),
  // 인물 표현과 배경 표현 필드는 UI에서 제거되지만, 서버와의 호환성을 위해 유지합니다
  peoplePrompt: z.string().default('아기는 귀엽고 활기찬 모습이다.'),
  backgroundPrompt: z.string().default('환상적이고 아름다운 배경'),
  scenePrompts: z.array(z.string().min(1, '장면 묘사를 입력해주세요'))
    .min(1, '최소 1개 이상의 장면이 필요합니다')
    .max(4, '최대 4개의 장면까지 가능합니다'),
});

// 태몽동화 생성 페이지
export default function CreateDreamBook() {
  const [activeScene, setActiveScene] = useState(0);
  const [characterImage, setCharacterImage] = useState<string | null>(null);
  const [scene0Image, setScene0Image] = useState<string | null>(null); // 캐릭터+배경 통합 이미지 URL 저장
  const [isGenerating, setIsGenerating] = useState(false);
  const [isCharacterDialogOpen, setIsCharacterDialogOpen] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [backgroundDescription, setBackgroundDescription] = useState<string>('환상적이고 아름다운 배경');
  const { toast } = useToast();
  const [, navigate] = useLocation();
  const { user } = useAuthContext();

  // 스타일 템플릿 목록 가져오기 (작업지시서 6단계)
  const { data: styles, isLoading: isLoadingStyles } = useQuery({
    queryKey: ['/api/admin/style-templates'],
    queryFn: async () => {
      const response = await fetch('/api/admin/style-templates');
      if (!response.ok) {
        throw new Error('스타일 템플릿 목록을 불러오는데 실패했습니다');
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

  // 기본 스타일 자동 선택 (작업지시서 6단계)
  useEffect(() => {
    if (styles && styles.length > 0 && !form.getValues('styleId')) {
      const defaultStyle = styles.find((style: any) => style.isDefault);
      if (defaultStyle) {
        form.setValue('styleId', defaultStyle.id.toString());
      }
    }
  }, [styles, form]);

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
        
        // scene0ImageUrl이 있으면 저장 (캐릭터+배경 통합 이미지)
        if (data.result.scene0ImageUrl) {
          setScene0Image(data.result.scene0ImageUrl);
          console.log('캐릭터+배경 통합 이미지 저장:', data.result.scene0ImageUrl);
        } else {
          // 캐릭터 이미지를 scene0Image로도 설정 (이전 버전 호환성)
          setScene0Image(data.result.characterImageUrl);
        }
        
        setIsCharacterDialogOpen(false);
        toast({
          title: '캐릭터 생성 완료',
          description: '태몽동화에 사용될 캐릭터와 배경이 생성되었습니다.'
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

  // 태몽동화 생성 뮤테이션 (FormData 사용)
  const createDreamBookMutation = useMutation<any, Error, FormData>({
    mutationFn: async (formData: FormData) => {
      if (!characterImage) {
        throw new Error('캐릭터 이미지가 필요합니다. 먼저 캐릭터를 생성해주세요.');
      }
      
      // FormData 내용 상세 디버깅을 위한 로깅
      console.log('태몽동화 생성 FormData 준비 완료');
      
      // FormData의 모든 값 확인 (디버깅용)
      // Array.from으로 변환하여 TypeScript 오류 방지
      Array.from(formData.entries()).forEach(([key, value]) => {
        console.log(`FormData 항목 - ${key}:`, typeof value === 'string' ? value : '파일 또는 객체');
      });

      return fetch('/api/dream-books', {
        method: 'POST',
        // FormData를 사용하므로 Content-Type 헤더를 설정하지 않음 (브라우저가 자동으로 설정)
        body: formData
      }).then(response => {
        if (!response.ok) {
          throw new Error('태몽동화 생성에 실패했습니다');
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
      navigate(`/dream-book/${data.id}`);
    },
    onError: (error) => {
      setIsGenerating(false);
      toast({
        title: '오류 발생',
        description: '태몽동화 생성 중 오류가 발생했습니다. 다시 시도해주세요.',
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
    formData.append('backgroundDescription', backgroundDescription); // 배경 설명 추가
    
    // 디버깅 확인을 위한 FormData 출력
    console.log('FormData 생성 완료, 파일 포함 여부:', formData.has('image'));
    console.log('서버에 API 요청 시작');
    
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

  // 파일 선택 처리
  const handleFileSelected = (file: File) => {
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

  // 폼 제출 처리
  const onSubmit = async (values: z.infer<typeof dreamBookSchema>) => {
    if (!user) {
      toast({
        title: '로그인 필요',
        description: '태몽동화를 생성하려면 로그인이 필요합니다.',
        variant: 'destructive'
      });
      return;
    }

    if (!characterImage) {
      toast({
        title: '캐릭터 필요',
        description: '먼저 캐릭터를 생성해주세요.',
        variant: 'destructive'
      });
      return;
    }

    // 장면 프롬프트 확인
    const validScenePrompts = values.scenePrompts.filter(p => p.trim().length > 0);
    if (validScenePrompts.length === 0) {
      toast({
        title: '장면 입력 필요',
        description: '최소 1개 이상의 장면 설명을 입력해주세요.',
        variant: 'destructive'
      });
      return;
    }

    console.log('태몽동화 생성 시작:', { 
      ...values, 
      scenesCount: validScenePrompts.length,
      characterImage: characterImage ? '있음' : '없음'
    });

    // 생성 시작 알림
    toast({
      title: '태몽동화 생성 시작',
      description: '태몽동화를 생성하고 있습니다. 잠시 기다려주세요.',
    });

    setIsGenerating(true);
    // 필요한 데이터 준비 (작업지시서 6단계: style_id 포함)
    const formData = new FormData();
    formData.append('babyName', values.babyName);
    formData.append('dreamer', values.dreamer);
    formData.append('styleId', String(values.styleId)); // 새로운 style_templates 테이블의 ID
    formData.append('characterImageUrl', characterImage || '');
    formData.append('peoplePrompt', values.peoplePrompt);
    formData.append('backgroundPrompt', values.backgroundPrompt);
    
    // 캐릭터+배경 통합 이미지 URL 추가
    if (scene0Image) {
      formData.append('scene0ImageUrl', scene0Image);
    }
    
    // 장면 프롬프트는 JSON 문자열로 변환하여 전송
    formData.append('scenePrompts', JSON.stringify(validScenePrompts));
    
    console.log('태몽동화 생성 FormData 준비:', {
      scene0Image: scene0Image ? '있음' : '없음',
      sceneCount: validScenePrompts.length
    });
    
    // 태몽동화 생성 API 호출
    createDreamBookMutation.mutate(formData);
  };

  // 스타일 선택 및 캐릭터 생성 섹션
  const renderStyleAndCharacterSection = () => (
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
                          <SelectItem key={style.id} value={style.id.toString()}>
                            {style.name}
                            {style.isDefault && (
                              <span className="ml-2 text-xs bg-blue-100 text-blue-800 px-1 rounded">기본값</span>
                            )}
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
                    <div className="grid grid-cols-2 gap-4 mb-3 w-full">
                      {/* 캐릭터 이미지 */}
                      <div className="flex flex-col items-center">
                        <div className="relative mb-2">
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
                        <span className="text-xs font-medium">캐릭터</span>
                      </div>
                      
                      {/* 배경 포함 통합 이미지 */}
                      <div className="flex flex-col items-center">
                        <div className="relative mb-2">
                          <div className="rounded-md overflow-hidden border w-32 h-32">
                            <img 
                              src={scene0Image || characterImage} 
                              alt="캐릭터+배경 이미지" 
                              className="w-full h-full object-cover"
                            />
                          </div>
                        </div>
                        <span className="text-xs font-medium">캐릭터+배경</span>
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

  // 기본 정보 섹션
  const renderBasicInfoSection = () => (
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

  // 이전 공통 설정 섹션은 제거되었습니다
  
  // 장면 입력 탭 콘텐츠
  const renderSceneTabContent = (sceneIndex: number) => (
    <TabsContent value={sceneIndex.toString()} className="mt-6">
      <Card>
        <CardContent className="p-6">
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-medium">장면 {sceneIndex + 1} 설정</h3>
              {sceneIndex > 0 && (
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={copyFromPreviousScene}
                >
                  이전 장면에서 복사
                </Button>
              )}
            </div>
            
            <FormField
              control={form.control}
              name={`scenePrompts.${sceneIndex}`}
              render={({ field }) => (
                <FormItem>
                  <FormLabel>장면 묘사 (필수)</FormLabel>
                  <FormControl>
                    <Textarea 
                      placeholder="이 장면에서 일어나는 상황을 설명해주세요. 예: 아기가 고래를 타고 구름 위를 날아다니며 신기한 별들을 만지고 있다"
                      {...field}
                      rows={4}
                    />
                  </FormControl>
                  <FormDescription>
                    이 장면에서 일어나는 상황을 자세히 설명해주세요.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        </CardContent>
      </Card>
    </TabsContent>
  );

  if (!user) {
    return (
      <div className="container mx-auto py-10">
        <div className="flex items-center justify-center h-[50vh]">
          <Card className="w-full max-w-md">
            <CardContent className="p-6 text-center">
              <AlertCircle className="mx-auto h-12 w-12 text-red-500 mb-4" />
              <h2 className="text-xl font-bold mb-4">로그인이 필요합니다</h2>
              <p className="text-gray-500 mb-6">
                태몽동화를 생성하기 위해서는 로그인이 필요합니다.
              </p>
              <Button 
                className="w-full"
                onClick={() => navigate('/login')}
              >
                로그인 페이지로 이동
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-10">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">태몽동화 만들기</h1>
        <p className="text-gray-500 mt-2">
          태몽으로 아기의 이야기를 만들어보세요. 4개의 장면으로 구성된 동화책을 생성합니다.
        </p>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
          {renderStyleAndCharacterSection()}
          {renderBasicInfoSection()}
          
          <div className="space-y-6">
            <Card>
              <CardContent className="p-6">
                <h3 className="text-lg font-medium mb-4">태몽동화 장면 구성</h3>
                <Tabs
                  defaultValue="0"
                  value={activeScene.toString()}
                  onValueChange={(value) => setActiveScene(parseInt(value))}
                >
                  <TabsList className="w-full justify-start mb-4">
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

          <div className="flex justify-end">
            <Button
              type="submit"
              disabled={isGenerating}
              size="lg"
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
        <DialogContent>
          <DialogHeader>
            <DialogTitle>사진으로 캐릭터 생성하기</DialogTitle>
            <DialogDescription>
              사진을 업로드하여 태몽동화에 사용할 캐릭터를 생성할 수 있습니다.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="space-y-4">
              <p className="text-sm font-medium">사진 업로드</p>
              <FileUpload 
                accept="image/*"
                maxSize={5 * 1024 * 1024} // 5MB
                onFileSelect={handleFileSelected}
              />
            </div>
            
            <div className="space-y-2">
              <p className="text-sm font-medium">배경 설명</p>
              <Textarea 
                placeholder="이 캐릭터가 있는 장면의 배경을 묘사해주세요. (예: 밤하늘에 별이 가득하고 잔디밭이 펼쳐진 초원)"
                id="backgroundDescription"
                rows={3}
                className="resize-none"
                value={backgroundDescription}
                onChange={(e) => setBackgroundDescription(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                캐릭터가 있는 장면의 배경을 자세히 묘사해주세요. 이 설명에 따라 배경이 함께 생성됩니다.
              </p>
            </div>
          </div>
          
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => setIsCharacterDialogOpen(false)}
            >
              취소
            </Button>
            <Button 
              onClick={handleGenerateCharacter}
              disabled={generateCharacterMutation.isPending || !selectedFile}
            >
              {generateCharacterMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  생성 중...
                </>
              ) : (
                "캐릭터 생성하기"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}