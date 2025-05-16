/**
 * 음악 생성 페이지 (MusicGen + Bark)
 * 사용자가 입력한 가사와 프롬프트를 활용하여 
 * 배경음악과 목소리를 합성한 음악을 생성합니다.
 */
import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { useQuery, useMutation } from '@tanstack/react-query';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Slider } from '@/components/ui/slider';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Music, Mic, Play, Save, RefreshCw } from 'lucide-react';

// 음악 생성 폼 스키마
const musicFormSchema = z.object({
  prompt: z.string().min(3, '음악 설명은 최소 3자 이상이어야 합니다'),
  lyrics: z.string().min(10, '가사는 최소 10자 이상이어야 합니다'),
  voice: z.string().min(1, '목소리를 선택해주세요'),
  duration: z.number().min(30).max(240),
  styleTags: z.array(z.string()).optional(),
  translateToEnglish: z.boolean().default(true)
});

type MusicFormValues = z.infer<typeof musicFormSchema>;

// 사용 가능한 음악 스타일
const availableStyles = [
  { id: 'lullaby', name: '자장가', tags: ['soft', 'gentle', 'peaceful', 'calm', 'lullaby'] },
  { id: 'classical', name: '클래식', tags: ['classical', 'orchestra', 'symphony', 'piano'] },
  { id: 'pop', name: '팝', tags: ['pop', 'upbeat', 'cheerful', 'catchy'] },
  { id: 'folk', name: '포크', tags: ['folk', 'acoustic', 'guitar', 'traditional'] },
  { id: 'ambient', name: '앰비언트', tags: ['ambient', 'chill', 'relaxing', 'atmospheric'] },
  { id: 'korean-traditional', name: '국악', tags: ['korean traditional', 'gayageum', 'haegeum', 'traditional korean'] }
];

const MusicGeneratorPage: React.FC = () => {
  const { toast } = useToast();
  const [generatedAudio, setGeneratedAudio] = useState<string | null>(null);
  const [selectedStyle, setSelectedStyle] = useState<string>('lullaby');
  const [isPlaying, setIsPlaying] = useState(false);
  const [isGeneratingLyrics, setIsGeneratingLyrics] = useState(false);
  const audioRef = React.useRef<HTMLAudioElement>(null);

  // 음성 목록 가져오기
  const { data: voicesData, isLoading: isLoadingVoices } = useQuery({
    queryKey: ['/api/music-generation/voices'],
    queryFn: async () => {
      try {
        const response = await fetch('/api/music-generation/voices');
        return response.json();
      } catch (error) {
        console.error('음성 목록 조회 중 오류:', error);
        throw error;
      }
    }
  });

  // 폼 설정
  const form = useForm<MusicFormValues>({
    resolver: zodResolver(musicFormSchema),
    defaultValues: {
      prompt: '',
      lyrics: '',
      voice: 'female',
      duration: 120,
      styleTags: [],
      translateToEnglish: true
    }
  });

  // 음악 생성 요청 함수
  const generateMusicMutation = useMutation({
    mutationFn: async (data: MusicFormValues) => {
      // 선택한 스타일의 태그 설정
      const selectedStyleObj = availableStyles.find(style => style.id === selectedStyle);
      data.styleTags = selectedStyleObj?.tags || [];
      
      try {
        const response = await fetch('/api/music-generation/generate', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(data)
        });
        return response.json();
      } catch (error) {
        console.error('음악 생성 요청 중 오류:', error);
        throw error;
      }
    },
    onSuccess: (data) => {
      setGeneratedAudio(data.audioUrl);
      toast({
        title: '음악 생성 완료',
        description: '음악이 성공적으로 생성되었습니다.'
      });
      
      // 캐시 무효화
      queryClient.invalidateQueries({ queryKey: ['/api/music'] });
    },
    onError: (error: any) => {
      toast({
        variant: 'destructive',
        title: '음악 생성 실패',
        description: error.message || '음악 생성 중 오류가 발생했습니다.'
      });
    }
  });

  // 폼 제출 처리
  const onSubmit = (values: MusicFormValues) => {
    generateMusicMutation.mutate(values);
  };

  // 오디오 재생/정지 토글
  const togglePlay = () => {
    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.pause();
      } else {
        audioRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  // 오디오 종료 시 상태 업데이트
  const handleAudioEnded = () => {
    setIsPlaying(false);
  };

  // 가사 생성 기능 추가
  const generateLyricsMutation = useMutation({
    mutationFn: async () => {
      const prompt = form.getValues('prompt');
      
      if (!prompt || prompt.length < 3) {
        throw new Error('음악 설명을 3자 이상 입력해주세요');
      }
      
      const style = availableStyles.find(s => s.id === selectedStyle);
      
      try {
        const response = await fetch('/api/lyrics/generate', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            prompt,
            style: style?.name || '',
            includeChorus: true
          })
        });
        
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.message || '가사 생성 중 오류가 발생했습니다');
        }
        
        return response.json();
      } catch (error) {
        console.error('가사 생성 요청 중 오류:', error);
        throw error;
      }
    },
    onSuccess: (data) => {
      if (data.lyrics) {
        form.setValue('lyrics', data.lyrics);
        toast({
          title: '가사 생성 완료',
          description: '프롬프트를 기반으로 가사가 생성되었습니다.'
        });
      }
    },
    onError: (error: any) => {
      toast({
        variant: 'destructive',
        title: '가사 생성 실패',
        description: error.message || '가사 생성 중 오류가 발생했습니다.'
      });
    }
  });
  
  // 가사 생성 처리
  const handleGenerateLyrics = () => {
    setIsGeneratingLyrics(true);
    generateLyricsMutation.mutate(undefined, {
      onSettled: () => {
        setIsGeneratingLyrics(false);
      }
    });
  };

  // 스타일 선택 처리
  const handleStyleSelect = (styleId: string) => {
    setSelectedStyle(styleId);
    // 선택한 스타일의 특성을 프롬프트에 추가
    const style = availableStyles.find(s => s.id === styleId);
    if (style) {
      form.setValue('prompt', 
        form.getValues('prompt') ? 
        `${form.getValues('prompt')}, ${style.name} 스타일` : 
        `${style.name} 스타일`
      );
    }
  };

  return (
    <div className="container py-8">
      <h1 className="text-3xl font-bold mb-6">음악 생성 도구</h1>
      <p className="text-muted-foreground mb-8">
        MusicGen으로 배경음악을 생성하고 Bark로 보컬을 추가하여 완성된 음악을 만들어보세요.
      </p>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* 입력 폼 */}
        <Card>
          <CardHeader>
            <CardTitle>음악 생성 정보 입력</CardTitle>
            <CardDescription>
              음악 스타일, 가사, 목소리 등을 설정하여 AI 음악을 생성합니다.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                <Tabs defaultValue="style" className="w-full">
                  <TabsList className="grid grid-cols-3 mb-4">
                    <TabsTrigger value="style">스타일</TabsTrigger>
                    <TabsTrigger value="lyrics">가사</TabsTrigger>
                    <TabsTrigger value="settings">설정</TabsTrigger>
                  </TabsList>
                  
                  {/* 스타일 탭 */}
                  <TabsContent value="style" className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      {availableStyles.map(style => (
                        <Button
                          key={style.id}
                          type="button"
                          variant={selectedStyle === style.id ? "default" : "outline"}
                          className="h-24 flex flex-col justify-center items-center"
                          onClick={() => handleStyleSelect(style.id)}
                        >
                          <Music className="mb-2 h-5 w-5" />
                          <span>{style.name}</span>
                        </Button>
                      ))}
                    </div>
                    
                    <FormField
                      control={form.control}
                      name="prompt"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>음악 프롬프트</FormLabel>
                          <FormControl>
                            <Textarea
                              placeholder="음악의 분위기, 감정, 악기 등을 자세히 설명해주세요"
                              {...field}
                              className="min-h-[100px]"
                            />
                          </FormControl>
                          <FormDescription>
                            더 구체적인 설명일수록 원하는 스타일의 음악이 생성됩니다.
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </TabsContent>
                  
                  {/* 가사 탭 */}
                  <TabsContent value="lyrics" className="space-y-4">
                    <FormField
                      control={form.control}
                      name="lyrics"
                      render={({ field }) => (
                        <FormItem>
                          <div className="flex justify-between items-center">
                            <FormLabel>가사</FormLabel>
                            <Button 
                              type="button" 
                              variant="outline" 
                              size="sm"
                              onClick={handleGenerateLyrics}
                              disabled={isGeneratingLyrics || !form.getValues('prompt')}
                              className="mb-2"
                            >
                              {isGeneratingLyrics ? (
                                <>
                                  <Loader2 className="mr-2 h-3 w-3 animate-spin" />
                                  가사 생성 중...
                                </>
                              ) : (
                                <>
                                  <Mic className="mr-2 h-3 w-3" />
                                  프롬프트로 가사 생성
                                </>
                              )}
                            </Button>
                          </div>
                          <FormControl>
                            <Textarea
                              placeholder="[verse]
자장자장 우리 아가
달빛 아래 잠들어요
[chorus]
엄마 품에 안겨서
꿈나라로 가요"
                              className="min-h-[200px]"
                              {...field}
                            />
                          </FormControl>
                          <FormDescription>
                            <p>위 '프롬프트로 가사 생성' 버튼을 클릭하면 음악 설명을 기반으로 가사를 자동으로 생성합니다.</p>
                            <p>[verse], [chorus] 등의 태그를 사용하여 가사 구조를 명시할 수 있습니다.</p>
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="translateToEnglish"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                          <FormControl>
                            <input
                              type="checkbox"
                              checked={field.value}
                              onChange={field.onChange}
                              className="mt-1"
                            />
                          </FormControl>
                          <div className="space-y-1 leading-none">
                            <FormLabel>영어로 번역</FormLabel>
                            <FormDescription>
                              한국어 가사를 영어로 번역하여 AI 음성 생성에 사용합니다.
                            </FormDescription>
                          </div>
                        </FormItem>
                      )}
                    />
                  </TabsContent>
                  
                  {/* 설정 탭 */}
                  <TabsContent value="settings" className="space-y-4">
                    <FormField
                      control={form.control}
                      name="voice"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>목소리 선택</FormLabel>
                          <Select 
                            onValueChange={field.onChange} 
                            defaultValue={field.value}
                          >
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="목소리를 선택하세요" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {isLoadingVoices ? (
                                <SelectItem value="loading" disabled>로딩 중...</SelectItem>
                              ) : (
                                voicesData?.voices.map((voice: any) => (
                                  <SelectItem key={voice.id} value={voice.id}>
                                    {voice.name}
                                  </SelectItem>
                                )) || [
                                  <SelectItem key="female" value="female">여성</SelectItem>,
                                  <SelectItem key="male" value="male">남성</SelectItem>,
                                  <SelectItem key="child" value="child">아이</SelectItem>
                                ]
                              )}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="duration"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>음악 길이: {field.value}초</FormLabel>
                          <FormControl>
                            <Slider
                              min={30}
                              max={240}
                              step={30}
                              defaultValue={[field.value]}
                              onValueChange={(vals) => field.onChange(vals[0])}
                            />
                          </FormControl>
                          <div className="flex justify-between text-xs text-muted-foreground">
                            <span>30초</span>
                            <span>240초</span>
                          </div>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </TabsContent>
                </Tabs>
                
                <div className="pt-4 border-t">
                  <Button 
                    type="submit"
                    disabled={generateMusicMutation.isPending}
                    className="w-full"
                  >
                    {generateMusicMutation.isPending ? (
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
                </div>
              </form>
            </Form>
          </CardContent>
        </Card>

        {/* 결과 및 재생 */}
        <Card>
          <CardHeader>
            <CardTitle>생성된 음악</CardTitle>
            <CardDescription>
              생성된 음악을 듣고 저장할 수 있습니다.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col items-center justify-center min-h-[400px]">
            {generateMusicMutation.isPending ? (
              <div className="flex flex-col items-center justify-center text-center p-8">
                <Loader2 className="h-16 w-16 animate-spin text-primary mb-4" />
                <h3 className="text-xl font-medium mb-2">음악을 생성하고 있습니다</h3>
                <p className="text-muted-foreground max-w-md">
                  배경 음악 생성과 가사 음성 합성, 믹싱까지 진행됩니다.
                  완료까지 1-3분 정도 소요될 수 있습니다.
                </p>
              </div>
            ) : generatedAudio ? (
              <div className="w-full space-y-6">
                <div className="rounded-lg bg-muted p-6 flex flex-col items-center">
                  <div className={`w-32 h-32 rounded-full flex items-center justify-center mb-4 cursor-pointer transition-all ${isPlaying ? 'bg-primary text-primary-foreground scale-110' : 'bg-secondary text-secondary-foreground'}`}
                    onClick={togglePlay}>
                    {isPlaying ? (
                      <span className="h-10 w-10 rounded-sm bg-primary-foreground" />
                    ) : (
                      <Play className="h-12 w-12" />
                    )}
                  </div>
                  
                  <audio
                    ref={audioRef}
                    src={generatedAudio}
                    onEnded={handleAudioEnded}
                    className="w-full mt-4"
                    controls
                  />
                </div>
                
                <div className="flex gap-2 justify-center mt-4">
                  <Button variant="outline" onClick={() => window.open(generatedAudio, '_blank')}>
                    <Save className="mr-2 h-4 w-4" />
                    저장하기
                  </Button>
                  <Button variant="outline" onClick={() => setGeneratedAudio(null)}>
                    <RefreshCw className="mr-2 h-4 w-4" />
                    새로 만들기
                  </Button>
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center text-center p-8">
                <Music className="h-16 w-16 text-muted-foreground mb-4" />
                <h3 className="text-xl font-medium mb-2">음악을 생성해보세요</h3>
                <p className="text-muted-foreground max-w-md">
                  왼쪽 폼에서 원하는 스타일, 가사, 목소리 등을 설정하고
                  음악 생성 버튼을 눌러 AI 음악을 만들어보세요.
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default MusicGeneratorPage;