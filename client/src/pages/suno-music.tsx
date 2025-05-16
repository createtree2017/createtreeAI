import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useLocation } from 'wouter';
import { apiRequest } from '@/lib/queryClient';

// UI 컴포넌트 가져오기
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Music, Check, RefreshCcw } from 'lucide-react';

// 음악 생성 폼 스키마
const formSchema = z.object({
  prompt: z.string().min(5, '프롬프트는 최소 5자 이상 입력해주세요'),
  style: z.string().optional(),
  lyrics: z.string().optional(),
  vocalGender: z.enum(['male', 'female', 'none']).default('female'),
  duration: z.enum(['60', '120', '180', '240']).default('120'),
  title: z.string().optional(),
  language: z.enum(['english', 'korean', 'japanese', 'chinese', 'spanish']).default('korean'),
});

// 음악 스타일 옵션
const styleOptions = [
  { value: 'lullaby', label: '자장가' },
  { value: 'kpop', label: 'K-POP' },
  { value: 'ballad', label: '발라드' },
  { value: 'jazz', label: '재즈' },
  { value: 'classical', label: '클래식' },
  { value: 'hiphop', label: '힙합' },
  { value: 'traditional_korean', label: '전통 한국음악' },
  { value: 'rock', label: '록' },
  { value: 'anime', label: '애니메이션' },
  { value: 'cinematic', label: '시네마틱' },
];

// 보컬 성별 옵션
const vocalOptions = [
  { value: 'female', label: '여성' },
  { value: 'male', label: '남성' },
  { value: 'none', label: '없음 (연주곡)' },
];

// 음악 길이 옵션
const durationOptions = [
  { value: '60', label: '1분' },
  { value: '120', label: '2분' },
  { value: '180', label: '3분' },
  { value: '240', label: '4분' },
];

// 언어 옵션
const languageOptions = [
  { value: 'korean', label: '한국어' },
  { value: 'english', label: '영어' },
  { value: 'japanese', label: '일본어' },
  { value: 'chinese', label: '중국어' },
  { value: 'spanish', label: '스페인어' },
];

type FormValues = z.infer<typeof formSchema>;

// 음악 생성 요청 함수
const createMusic = async (data: FormValues) => {
  const response = await apiRequest('/api/suno/create', {
    method: 'POST',
    body: JSON.stringify(data),
  });
  
  return response;
};

// 음악 생성 상태 확인 함수
const checkMusicStatus = async (jobId: string) => {
  const response = await apiRequest(`/api/suno/status/${jobId}`, {
    method: 'GET',
  });
  
  return response;
};

// 음악 목록 조회 함수
const getMusicList = async () => {
  const response = await apiRequest('/api/suno/list', {
    method: 'GET',
  });
  
  return response.data;
};

export default function SunoMusicPage() {
  const [location, setLocation] = useLocation();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState('create');
  const [currentJobId, setCurrentJobId] = useState<string | null>(null);
  const [generatedMusic, setGeneratedMusic] = useState<any | null>(null);
  
  // Form 설정
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      prompt: '',
      style: 'lullaby',
      lyrics: '',
      vocalGender: 'female',
      duration: '120',
      title: '',
      language: 'korean',
    },
  });
  
  // 음악 생성 Mutation
  const { mutate: generateMusicMutation, isPending: isGenerating } = useMutation({
    mutationFn: createMusic,
    onSuccess: (data) => {
      if (data.jobId) {
        setCurrentJobId(data.jobId);
        toast({
          title: '음악 생성 시작',
          description: '음악 생성이 시작되었습니다. 완료될 때까지 기다려주세요.',
        });
      }
    },
    onError: (error) => {
      toast({
        title: '음악 생성 오류',
        description: '음악 생성 중 오류가 발생했습니다.',
        variant: 'destructive',
      });
    },
  });
  
  // 음악 상태 조회 Query
  const { 
    data: statusData, 
    isLoading: isStatusLoading,
    refetch: refetchStatus,
    isError: isStatusError,
    error: statusError,
  } = useQuery({
    queryKey: ['musicStatus', currentJobId],
    queryFn: () => currentJobId ? checkMusicStatus(currentJobId) : null,
    enabled: !!currentJobId,
    refetchInterval: currentJobId && !generatedMusic ? 3000 : false, // 3초마다 상태 확인
  });
  
  // 음악 목록 조회 Query
  const {
    data: musicList,
    isLoading: isLoadingMusicList,
    refetch: refetchMusicList,
  } = useQuery({
    queryKey: ['musicList'],
    queryFn: getMusicList,
    enabled: activeTab === 'list',
  });
  
  // 상태 업데이트 효과
  useEffect(() => {
    if (statusData && statusData.status === 'completed' && statusData.audioUrl) {
      setGeneratedMusic(statusData);
      setCurrentJobId(null);
      toast({
        title: '음악 생성 완료',
        description: '음악이 성공적으로 생성되었습니다.',
      });
    } else if (statusData && statusData.status === 'failed') {
      setCurrentJobId(null);
      toast({
        title: '음악 생성 실패',
        description: statusData.message || '음악 생성에 실패했습니다.',
        variant: 'destructive',
      });
    }
  }, [statusData, toast]);
  
  // 폼 제출 핸들러
  const onSubmit = (values: FormValues) => {
    generateMusicMutation(values);
  };
  
  // 오디오 플레이어 컴포넌트
  const AudioPlayer = ({ url, title }: { url: string; title?: string }) => {
    return (
      <div className="flex flex-col gap-2 w-full">
        <div className="font-medium text-lg">{title || '생성된 음악'}</div>
        <audio controls className="w-full" src={url}>
          브라우저가 오디오 재생을 지원하지 않습니다.
        </audio>
      </div>
    );
  };
  
  // 음악 목록 아이템 컴포넌트
  const MusicListItem = ({ music }: { music: any }) => {
    return (
      <Card className="mb-4">
        <CardHeader>
          <CardTitle>{music.title}</CardTitle>
          <CardDescription>생성일: {new Date(music.createdAt).toLocaleString()}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="mb-3">
            <Label>프롬프트</Label>
            <p className="text-sm text-gray-500">{music.prompt}</p>
          </div>
          {music.lyrics && (
            <div className="mb-3">
              <Label>가사</Label>
              <p className="text-sm text-gray-500 whitespace-pre-line">{music.lyrics}</p>
            </div>
          )}
          <AudioPlayer url={music.audioUrl} title={music.title} />
        </CardContent>
        <CardFooter className="flex justify-between">
          <div className="flex gap-2">
            <div className="bg-primary/10 text-primary rounded-full px-2 py-1 text-xs">{music.style || '자장가'}</div>
            <div className="bg-primary/10 text-primary rounded-full px-2 py-1 text-xs">{music.duration}초</div>
          </div>
        </CardFooter>
      </Card>
    );
  };
  
  return (
    <div className="container py-8">
      <h1 className="text-3xl font-bold mb-8 text-center">Suno AI 음악 생성</h1>
      
      <Tabs defaultValue="create" className="w-full" onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-2 mb-8">
          <TabsTrigger value="create">음악 생성</TabsTrigger>
          <TabsTrigger value="list">내 음악 목록</TabsTrigger>
        </TabsList>
        
        <TabsContent value="create">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* 생성 폼 */}
            <div className="md:col-span-2">
              <Card>
                <CardHeader>
                  <CardTitle>새로운 음악 생성하기</CardTitle>
                  <CardDescription>
                    AI가 당신의 아이디어를 음악으로 변환합니다. 원하는 음악 스타일과 가사를 입력해보세요.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                      <FormField
                        control={form.control}
                        name="prompt"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>음악 프롬프트</FormLabel>
                            <FormControl>
                              <Textarea
                                placeholder="원하는 음악을 설명해주세요. (예: 잔잔한 피아노 멜로디가 있는 평화로운 자장가)"
                                {...field}
                                rows={3}
                              />
                            </FormControl>
                            <FormDescription>
                              구체적인 설명을 입력할수록 더 정확한 음악이 생성됩니다.
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <FormField
                          control={form.control}
                          name="style"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>음악 스타일</FormLabel>
                              <Select 
                                onValueChange={field.onChange} 
                                defaultValue={field.value}
                              >
                                <FormControl>
                                  <SelectTrigger>
                                    <SelectValue placeholder="스타일 선택" />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  {styleOptions.map(option => (
                                    <SelectItem key={option.value} value={option.value}>
                                      {option.label}
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
                          name="vocalGender"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>보컬 성별</FormLabel>
                              <Select 
                                onValueChange={field.onChange} 
                                defaultValue={field.value}
                              >
                                <FormControl>
                                  <SelectTrigger>
                                    <SelectValue placeholder="보컬 선택" />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  {vocalOptions.map(option => (
                                    <SelectItem key={option.value} value={option.value}>
                                      {option.label}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <FormField
                          control={form.control}
                          name="duration"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>음악 길이</FormLabel>
                              <Select 
                                onValueChange={field.onChange} 
                                defaultValue={field.value}
                              >
                                <FormControl>
                                  <SelectTrigger>
                                    <SelectValue placeholder="길이 선택" />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  {durationOptions.map(option => (
                                    <SelectItem key={option.value} value={option.value}>
                                      {option.label}
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
                          name="language"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>가사 언어</FormLabel>
                              <Select 
                                onValueChange={field.onChange} 
                                defaultValue={field.value}
                              >
                                <FormControl>
                                  <SelectTrigger>
                                    <SelectValue placeholder="언어 선택" />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  {languageOptions.map(option => (
                                    <SelectItem key={option.value} value={option.value}>
                                      {option.label}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                      
                      <FormField
                        control={form.control}
                        name="lyrics"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>가사 (선택사항)</FormLabel>
                            <FormControl>
                              <Textarea
                                placeholder="직접 가사를 입력하거나 비워두면 AI가 자동으로 생성합니다."
                                {...field}
                                rows={5}
                              />
                            </FormControl>
                            <FormDescription>
                              직접 가사를 작성하거나 비워두면 AI가 자동으로 가사를 생성합니다.
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={form.control}
                        name="title"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>제목 (선택사항)</FormLabel>
                            <FormControl>
                              <Input
                                placeholder="음악 제목을 입력하세요"
                                {...field}
                              />
                            </FormControl>
                            <FormDescription>
                              비워두면 프롬프트에서 자동으로 제목이 생성됩니다.
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <Button 
                        type="submit" 
                        className="w-full" 
                        disabled={isGenerating || !!currentJobId}
                      >
                        {isGenerating || currentJobId ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            음악 생성 중...
                          </>
                        ) : (
                          <>
                            <Music className="mr-2 h-4 w-4" />
                            음악 생성하기
                          </>
                        )}
                      </Button>
                    </form>
                  </Form>
                </CardContent>
              </Card>
            </div>
            
            {/* 생성된 음악 및 상태 표시 */}
            <div>
              <Card>
                <CardHeader>
                  <CardTitle>생성 결과</CardTitle>
                  <CardDescription>
                    {currentJobId ? '음악 생성 중...' : 
                     generatedMusic ? '음악이 생성되었습니다' : 
                     '음악을 생성해보세요'}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {currentJobId && (
                    <div className="flex flex-col items-center justify-center py-8">
                      <Loader2 className="h-16 w-16 animate-spin text-primary mb-4" />
                      <p className="text-center text-muted-foreground">
                        음악을 생성하고 있습니다. 몇 분 정도 소요될 수 있습니다.
                      </p>
                      <div className="mt-4 w-full bg-gray-200 rounded-full h-2.5">
                        <div className="bg-primary h-2.5 rounded-full" style={{ 
                          width: `${statusData?.progress || 0}%` 
                        }}></div>
                      </div>
                      <p className="mt-2 text-sm text-muted-foreground">
                        {statusData?.message || '처리 중...'}
                      </p>
                    </div>
                  )}
                  
                  {!currentJobId && !generatedMusic && (
                    <div className="flex flex-col items-center justify-center py-12 text-center">
                      <Music className="h-16 w-16 text-muted-foreground mb-4" />
                      <p className="text-muted-foreground">
                        음악을 생성하면 여기에 표시됩니다.
                      </p>
                    </div>
                  )}
                  
                  {!currentJobId && generatedMusic && (
                    <div className="space-y-6">
                      <AudioPlayer 
                        url={generatedMusic.audioUrl} 
                        title={generatedMusic.title} 
                      />
                      
                      {generatedMusic.lyrics && (
                        <div>
                          <h3 className="font-medium mb-2">가사</h3>
                          <div className="bg-muted p-3 rounded-md whitespace-pre-line text-sm">
                            {generatedMusic.lyrics}
                          </div>
                        </div>
                      )}
                      
                      <div className="flex gap-2 flex-wrap">
                        {generatedMusic.style && (
                          <div className="bg-primary/10 text-primary rounded-full px-3 py-1 text-sm">
                            {styleOptions.find(s => s.value === generatedMusic.style)?.label || generatedMusic.style}
                          </div>
                        )}
                        {generatedMusic.duration && (
                          <div className="bg-primary/10 text-primary rounded-full px-3 py-1 text-sm">
                            {generatedMusic.duration}초
                          </div>
                        )}
                        {generatedMusic.vocalGender && (
                          <div className="bg-primary/10 text-primary rounded-full px-3 py-1 text-sm">
                            {vocalOptions.find(v => v.value === generatedMusic.vocalGender)?.label || generatedMusic.vocalGender}
                          </div>
                        )}
                      </div>
                      
                      <Button variant="outline" className="w-full" onClick={() => setGeneratedMusic(null)}>
                        <RefreshCcw className="mr-2 h-4 w-4" />
                        새 음악 생성하기
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>
        
        <TabsContent value="list">
          <div className="grid gap-6">
            <div className="flex justify-between items-center">
              <h2 className="text-2xl font-bold">내 음악 목록</h2>
              <Button variant="outline" onClick={() => refetchMusicList()}>
                <RefreshCcw className="mr-2 h-4 w-4" />
                새로고침
              </Button>
            </div>
            
            {isLoadingMusicList ? (
              <div className="flex justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : musicList && musicList.length > 0 ? (
              <div className="grid gap-4">
                {musicList.map((music: any) => (
                  <MusicListItem key={music.id} music={music} />
                ))}
              </div>
            ) : (
              <div className="text-center py-12 bg-muted rounded-lg">
                <Music className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="font-medium text-lg mb-2">아직 생성된 음악이 없습니다</h3>
                <p className="text-muted-foreground mb-4">
                  음악 생성 탭에서 첫 번째 음악을 만들어보세요!
                </p>
                <Button onClick={() => setActiveTab('create')}>
                  음악 생성하기
                </Button>
              </div>
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}