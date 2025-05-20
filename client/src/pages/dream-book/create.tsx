import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { createDreamBookSchema, DREAM_BOOK_DREAMERS, DREAM_BOOK_STYLES, CreateDreamBookRequest } from '@shared/dream-book';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from 'wouter';
import { Loader2 } from "lucide-react";
import { useAuth } from '@/hooks/useAuth';
import { useQuery } from '@tanstack/react-query';

export default function CreateDreamBook() {
  const [creating, setCreating] = useState(false);
  const [progress, setProgress] = useState(0);
  const [statusMessage, setStatusMessage] = useState('');
  const [promptsCount, setPromptsCount] = useState(1); // 처음에는 1개 프롬프트만 표시
  const [customDreamerMode, setCustomDreamerMode] = useState(false); // 꿈꾼 사람 직접 입력 모드
  const { user } = useAuth();
  const isAuthenticated = !!user;
  const [, navigate] = useLocation();
  const { toast } = useToast();
  
  // 이미지 스타일 목록 가져오기
  const { data: imageStyles, isLoading: isLoadingStyles } = useQuery({
    queryKey: ['/api/image-styles'],
    queryFn: async () => {
      const response = await fetch('/api/image-styles');
      if (!response.ok) throw new Error('이미지 스타일을 불러오는데 실패했습니다.');
      return response.json();
    }
  });

  // 타입 정의를 추가하여 TS 오류 해결 - 스타일 ID를 문자열로 수정
  type FormValues = {
    babyName: string;
    dreamer: string;
    prompts: string[];
    style: string; // 문자열 ID로 변경 ('ghibli', 'disney' 등)
  };

  const form = useForm<FormValues>({
    resolver: zodResolver(createDreamBookSchema),
    defaultValues: {
      babyName: '',
      dreamer: 'mother',
      prompts: [''], // 초기에는 1개의 빈 프롬프트 입력란
      style: 'ghibli', // 기본값으로 '지브리풍' 스타일 선택 (문자열 ID)
    },
  });

  React.useEffect(() => {
    if (!isAuthenticated) {
      toast({
        title: "로그인이 필요합니다",
        description: "태몽동화를 만들기 위해 로그인해주세요.",
        variant: "destructive",
      });
      navigate('/login');
    }
  }, [isAuthenticated, navigate, toast]);
  
  // 스타일 목록이 로드되면 기본값 설정
  // 프롬프트 추가 함수
  const addPrompt = () => {
    if (promptsCount < 4) {
      const currentPrompts = form.getValues().prompts;
      form.setValue('prompts', [...currentPrompts, '']);
      setPromptsCount(promptsCount + 1);
    } else {
      toast({
        title: "최대 컷 수 제한",
        description: "최대 4개의 장면까지만 추가할 수 있습니다.",
        variant: "default",
      });
    }
  };
  
  // 이제 DREAM_BOOK_STYLES 상수를 직접 사용하므로 필요없는 useEffect 제거
  // 폼 기본값에서 직접 'ghibli'(지브리풍) 스타일 ID 사용

  const onSubmit = async (data: FormValues) => {
    try {
      // 빈 프롬프트 확인
      const nonEmptyPrompts = data.prompts.filter(p => p.trim() !== '');
      if (nonEmptyPrompts.length === 0) {
        toast({
          title: "입력 오류",
          description: "최소 한 개 이상의 장면 프롬프트를 입력해주세요.",
          variant: "destructive",
        });
        return;
      }

      setCreating(true);
      setProgress(0);
      setStatusMessage('태몽동화 생성을 시작합니다...');

      // 실제 제출할 데이터 준비 (빈 프롬프트 제거)
      const submitData = {
        ...data,
        prompts: nonEmptyPrompts,
        style: String(data.style)
      };

      console.log('제출 데이터:', submitData);

      // POST 요청 보내기
      const response = await fetch('/api/dream-books', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(submitData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || '태몽동화 생성 중 오류가 발생했습니다.');
      }

      // SSE(Server-Sent Events) 방식으로 진행 상황 받기
      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error('응답을 읽을 수 없습니다.');
      }

      // 응답 처리
      const decoder = new TextDecoder();
      
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        
        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split('\n\n');
        
        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.substring(6));
              setProgress(data.progress);
              setStatusMessage(data.message);
              
              // 타입별 토스트 메시지 표시 (warning, error 등)
              if (data.type === 'error') {
                toast({
                  title: "알림",
                  description: data.message,
                  variant: "destructive",
                });
              } else if (data.type === 'warning') {
                toast({
                  title: "주의",
                  description: data.message,
                  variant: "default",
                });
              }
              
              if (data.completed) {
                if (data.success === false) {
                  throw new Error(data.error || '태몽동화 생성 중 오류가 발생했습니다.');
                }
                
                toast({
                  title: "태몽동화 생성 완료",
                  description: "성공적으로 태몽동화를 생성했습니다!",
                });
                
                // 생성된 태몽동화 페이지로 이동
                navigate(`/dream-book/${data.result.id}`);
                return;
              }
            } catch (e) {
              console.error('이벤트 데이터 파싱 오류:', e);
            }
          }
        }
      }
    } catch (error) {
      toast({
        title: "오류 발생",
        description: error instanceof Error ? error.message : '알 수 없는 오류가 발생했습니다.',
        variant: "destructive",
      });
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="container mx-auto py-8 px-4">
      <h1 className="text-3xl font-bold text-center mb-8">태몽동화 만들기</h1>
      <div className="max-w-2xl mx-auto">
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>태몽동화란?</CardTitle>
            <CardDescription>
              임신 중 꾸었던 태몽을 아름다운 동화로 재구성해 드립니다. 
              아기의 이름, 꿈을 꾼 사람, 각 장면의 내용을 직접 입력하면 AI가 최대 4개의 장면으로 이루어진 동화를 만들어 드립니다.
            </CardDescription>
          </CardHeader>
        </Card>

        {creating ? (
          <Card>
            <CardHeader>
              <CardTitle>태몽동화 생성 중...</CardTitle>
              <CardDescription>잠시만 기다려주세요. 약 1~2분 정도 소요됩니다.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <Progress value={progress} className="w-full" />
                <p className="text-center text-muted-foreground">{statusMessage}</p>
              </div>
            </CardContent>
          </Card>
        ) : (
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <FormField
                control={form.control}
                name="babyName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>아기 이름</FormLabel>
                    <FormControl>
                      <Input placeholder="아기의 이름을 입력해주세요" {...field} />
                    </FormControl>
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
                    <div className="space-y-2">
                      <Select
                        onValueChange={(value) => {
                          if (value === "직접입력") {
                            // 직접 입력 모드
                            setCustomDreamerMode(true);
                            field.onChange(""); // 값을 초기화
                          } else {
                            setCustomDreamerMode(false);
                            field.onChange(value);
                          }
                        }}
                        defaultValue={customDreamerMode ? "직접입력" : field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="꿈을 꾼 사람을 선택해주세요" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {DREAM_BOOK_DREAMERS.map((dreamer) => (
                            <SelectItem key={dreamer.id} value={dreamer.id}>
                              {dreamer.name}
                            </SelectItem>
                          ))}
                          <SelectItem value="직접입력">직접 입력하기</SelectItem>
                        </SelectContent>
                      </Select>

                      {customDreamerMode && (
                        <FormControl>
                          <Input
                            placeholder="꿈을 꾼 사람을 직접 입력해주세요"
                            value={field.value}
                            onChange={(e) => field.onChange(e.target.value)}
                          />
                        </FormControl>
                      )}
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* 장면 프롬프트 입력 - 동적으로 표시 */}
              {Array.from({ length: promptsCount }).map((_, index) => (
                <FormField
                  key={`prompt-${index}`}
                  control={form.control}
                  name={`prompts.${index}`}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>장면 {index + 1} 프롬프트 입력</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder={index === 0 
                            ? "첫 번째 장면 프롬프트를 입력해주세요 (예: 하늘을 나는 흰 토끼가 분홍 구름 사이를 헤엄치는 장면)" 
                            : `${index + 1}번째 장면 프롬프트를 입력해주세요 (선택사항)`}
                          className="min-h-[100px]"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              ))}
              
              {/* 컷 추가 버튼 */}
              <div className="flex justify-center">
                <Button 
                  type="button"
                  variant="outline"
                  className="mt-2"
                  onClick={addPrompt}
                  disabled={promptsCount >= 4}
                >
                  + 컷 추가 (현재 {promptsCount}/4)
                </Button>
              </div>

              <FormField
                control={form.control}
                name="style"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>동화 스타일</FormLabel>
                    <Select
                      onValueChange={(val) => field.onChange(val)}
                      defaultValue={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="동화 이미지 스타일을 선택해주세요" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {isLoadingStyles ? (
                          <SelectItem value="loading">불러오는 중...</SelectItem>
                        ) : (
                          // DREAM_BOOK_STYLES에서 직접 가져온 스타일 ID 사용 (데이터베이스 ID 대신)
                          DREAM_BOOK_STYLES.map((style) => (
                            <SelectItem key={style.id} value={style.id}>
                              {style.name} - {style.description}
                            </SelectItem>
                          ))
                        )}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <Button type="submit" className="w-full" disabled={creating}>
                {creating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                태몽동화 만들기
              </Button>
            </form>
          </Form>
        )}
      </div>
    </div>
  );
}