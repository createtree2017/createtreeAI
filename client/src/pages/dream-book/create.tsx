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
  scenePrompts: z.array(z.string().min(1, '장면 묘사를 입력해주세요'))
    .min(1, '최소 1개 이상의 장면이 필요합니다')
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

  // wouter 네비게이션은 위에 이미 선언되어 있음

  // 태몽동화 생성 뮤테이션
  const createDreamBookMutation = useMutation({
    mutationFn: async (data: z.infer<typeof dreamBookSchema>) => {
      if (!characterImage) {
        throw new Error('캐릭터 이미지가 필요합니다. 먼저 캐릭터를 생성해주세요.');
      }

      // 서버에 보내는 데이터 형식을 API 요구사항에 맞게 변환
      const payload = {
        babyName: data.babyName,
        dreamer: data.dreamer,
        style: data.styleId, // styleId → style 변환 (서버 기대 형식)
        characterImageUrl: characterImage,
        peoplePrompt: data.peoplePrompt,
        backgroundPrompt: data.backgroundPrompt,
        scenePrompts: data.scenePrompts.filter(p => p.trim() !== '')
      };

      console.log('태몽동화 생성 요청 데이터:', payload);

      return fetch('/api/dream-books', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
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
      navigate(`/dream-book/detail/${data.result.id}`);
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
    try {
      await createDreamBookMutation.mutateAsync({
        ...values,
        // 필요한 경우 특정 필드 형식 조정
        styleId: String(values.styleId)
      });
    } catch (error: any) {
      console.error('태몽동화 생성 오류:', error);
      toast({
        title: '오류 발생',
        description: `태몽동화 생성에 실패했습니다: ${error?.message || '알 수 없는 오류'}`,
        variant: 'destructive'
      });
      setIsGenerating(false);
    }
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

  // 공통 설정 섹션 (인물/배경 프롬프트)
  const renderCommonSettingsSection = () => (
    <div className="space-y-6">
      <Card>
        <CardContent className="p-6">
          <h3 className="text-lg font-medium mb-4">공통 설정</h3>
          <div className="grid grid-cols-1 gap-6">
            <FormField
              control={form.control}
              name="peoplePrompt"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>인물 표현</FormLabel>
                  <FormControl>
                    <Textarea 
                      placeholder="아기 캐릭터의 표현 방식을 입력해주세요. 예: 귀엽고 활기찬 모습의 아기"
                      {...field}
                      rows={2}
                    />
                  </FormControl>
                  <FormDescription>
                    모든 장면에서 인물이 어떻게 표현될지 설명해주세요. 일관성 있는 캐릭터 표현에 중요합니다.
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
                      placeholder="전체적인 배경 분위기를 입력해주세요. 예: 환상적이고 아름다운 동화 세계"
                      {...field}
                      rows={2}
                    />
                  </FormControl>
                  <FormDescription>
                    전체 이야기의 배경 분위기를 설명해주세요. 각 장면의 배경 스타일에 영향을 줍니다.
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

          {renderCommonSettingsSection()}
          
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

          <div className="flex justify-end mt-8">
            <Button
              type="button" 
              disabled={isGenerating}
              size="lg"
              onClick={async () => {
                if (!characterImage) {
                  toast({
                    title: '캐릭터 필요',
                    description: '먼저 캐릭터를 생성해주세요.',
                    variant: 'destructive'
                  });
                  return;
                }
                
                const formValues = form.getValues();
                const validScenePrompts = formValues.scenePrompts.filter(p => p.trim().length > 0);
                
                if (validScenePrompts.length === 0) {
                  toast({
                    title: '장면 입력 필요',
                    description: '최소 1개 이상의 장면 설명을 입력해주세요.',
                    variant: 'destructive'
                  });
                  return;
                }
                
                console.log('태몽동화 생성 시작:', formValues);
                
                // 생성 시작 알림
                toast({
                  title: '태몽동화 생성 시작',
                  description: '태몽동화를 생성하고 있습니다. 잠시 기다려주세요.',
                });
                
                setIsGenerating(true);
                
                try {
                  const payload = {
                    babyName: formValues.babyName,
                    dreamer: formValues.dreamer,
                    style: formValues.styleId,
                    characterImageUrl: characterImage,
                    peoplePrompt: formValues.peoplePrompt,
                    backgroundPrompt: formValues.backgroundPrompt,
                    scenePrompts: validScenePrompts
                  };
                  
                  console.log('서버로 전송하는 데이터:', payload);
                  
                  const response = await fetch('/api/dream-books', {
                    method: 'POST',
                    headers: {
                      'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(payload)
                  });
                  
                  if (!response.ok) {
                    throw new Error(`서버 오류 발생: ${response.status}`);
                  }
                  
                  const data = await response.json();
                  console.log('서버 응답:', data);
                  
                  if (data.success && data.result && data.result.id) {
                    toast({
                      title: '태몽동화 생성 완료',
                      description: '태몽동화가 성공적으로 생성되었습니다.'
                    });
                    navigate(`/dream-book/detail/${data.result.id}`);
                  } else {
                    throw new Error('서버 응답에 오류가 있습니다');
                  }
                } catch (error: any) {
                  console.error('태몽동화 생성 오류:', error);
                  toast({
                    title: '오류 발생',
                    description: `태몽동화 생성에 실패했습니다: ${error?.message || '알 수 없는 오류'}`,
                    variant: 'destructive'
                  });
                } finally {
                  setIsGenerating(false);
                }
              }}
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
            <div className="space-y-2">
              <p className="text-sm font-medium">사진 업로드</p>
              <FileUpload 
                accept="image/*"
                maxSize={5 * 1024 * 1024} // 5MB
                onFileSelect={handleFileSelected}
              />
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