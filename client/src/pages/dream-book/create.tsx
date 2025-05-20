import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { createDreamBookSchema, DREAM_BOOK_DREAMERS, CreateDreamBookRequest } from '@shared/dream-book';
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

  const form = useForm<CreateDreamBookRequest>({
    resolver: zodResolver(createDreamBookSchema),
    defaultValues: {
      babyName: '',
      dreamer: 'mother',
      prompts: ['', '', '', ''],  // 4개의 빈 프롬프트 입력란
      style: 'watercolor', // 기본값 (API로부터 스타일 목록이 로드된 후 첫 번째 스타일로 업데이트됩니다)
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
  React.useEffect(() => {
    if (imageStyles && imageStyles.length > 0) {
      // 기본 스타일 찾기 (수채화풍 또는 첫 번째 스타일)
      const defaultStyle = imageStyles.find(style => 
        style.name === '수채화풍' || style.name.includes('수채화')
      ) || imageStyles[0];
      
      form.setValue('style', defaultStyle.name.toLowerCase());
    }
  }, [imageStyles, form]);

  const onSubmit = async (data: CreateDreamBookRequest) => {
    try {
      setCreating(true);
      setProgress(0);
      setStatusMessage('태몽동화 생성을 시작합니다...');

      // POST 요청 보내기
      const response = await fetch('/api/dream-books', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
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
              아기의 이름, 꿈을 꾼 사람, 꿈의 내용을 입력하면 AI가 5장면의 동화를 만들어 드립니다.
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
                    <Select
                      onValueChange={field.onChange}
                      defaultValue={field.value}
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
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="dreamContent"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>꿈 내용</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="태몽 내용을 자세히 적어주세요 (최소 10자 이상)"
                        className="min-h-[120px]"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="style"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>동화 스타일</FormLabel>
                    <Select
                      onValueChange={field.onChange}
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
                        ) : imageStyles && imageStyles.length > 0 ? (
                          imageStyles.map(style => (
                            <SelectItem key={style.id} value={String(style.id)}>
                              {style.name} - {style.description}
                            </SelectItem>
                          ))
                        ) : (
                          <SelectItem value="none">스타일 없음</SelectItem>
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