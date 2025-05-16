import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery } from "@tanstack/react-query";
import { z } from "zod";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Loader2, Music, MusicIcon } from "lucide-react";

// 음악 생성 폼 검증 스키마
const musicFormSchema = z.object({
  title: z.string().min(1, "제목을 입력해주세요"),
  prompt: z.string().min(3, "최소 3글자 이상의 내용을 입력해주세요"),
  lyrics: z.string().optional(),
  voice: z.enum(["female_kr", "male_kr"]).default("female_kr"),
  style: z.string().optional(),
  useLyrics: z.boolean().default(true)
});

type MusicFormValues = z.infer<typeof musicFormSchema>;

interface MusicFormProps {
  onMusicGenerated?: (music: any) => void;
}

export default function MusicForm({ onMusicGenerated }: MusicFormProps) {
  const { toast } = useToast();
  const [isAdvancedMode, setIsAdvancedMode] = useState(false);
  const [generatingLyrics, setGeneratingLyrics] = useState(false);
  
  // 음악 스타일 정의 - Suno AI 스타일 참고하여 구성
  const musicStyleMap = {
    "lullaby": "자장가",
    "classical": "클래식",
    "ambient": "앰비언트",
    "relaxing": "릴렉싱",
    "piano": "피아노",
    "orchestral": "오케스트라",
    "korean-traditional": "국악",
    "nature-sounds": "자연의 소리", 
    "meditation": "명상음악",
    "prenatal": "태교음악"
  };
  
  // Object.keys를 사용하여 musicStyleMap의 키 배열 생성
  const musicStyleKeys = Object.keys(musicStyleMap);
  
  // 음악 스타일 목록 가져오기
  const { data: musicStyles = musicStyleKeys } = useQuery({
    queryKey: ["/api/music/styles"],
    enabled: true,
    queryFn: async () => {
      try {
        const res = await apiRequest("/api/music/styles");
        
        if (!res.ok) {
          console.warn("음악 스타일 목록을 가져오는데 실패했습니다. 기본값 사용");
          return musicStyleKeys;
        }
        
        const data = await res.json();
        return data || musicStyleKeys;
      } catch (error) {
        console.error("음악 스타일 목록 요청 오류:", error);
        return musicStyleKeys; // 오류 발생 시 기본값 사용
      }
    }
  });
  
  // 폼 설정
  const form = useForm<MusicFormValues>({
    resolver: zodResolver(musicFormSchema),
    defaultValues: {
      title: "",
      prompt: "",
      lyrics: "",
      voice: "female_kr",
      style: "lullaby",
      useLyrics: true,
    }
  });
  
  // 가사 생성 뮤테이션
  const generateLyricsMutation = useMutation({
    mutationFn: async (prompt: string) => {
      const res = await apiRequest("/api/lyrics/generate", {
        method: "POST",
        data: { 
          prompt,
          style: form.getValues().style || "lullaby",
          includeChorus: true
        }
      });
      
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || "가사 생성에 실패했습니다.");
      }
      
      return await res.json();
    },
    onSuccess: (data) => {
      console.log("가사 생성 응답:", data);
      if (data.lyrics) {
        // 타이틀에 프롬프트 추가
        if (!form.getValues().title) {
          form.setValue("title", `${form.getValues().prompt}를 위한 자장가`);
        }
        
        // 생성된 가사를 lyrics 필드에 설정
        form.setValue("lyrics", data.lyrics);
        
        toast({
          title: "가사가 생성되었습니다",
          description: "GPT가 생성한 가사가 추가되었습니다.",
        });
      } else if (data.error) {
        toast({
          title: "가사 생성 실패",
          description: data.error,
          variant: "destructive",
        });
      }
    },
    onError: (error) => {
      console.error("가사 생성 오류:", error);
      toast({
        title: "가사 생성 실패",
        description: error instanceof Error ? error.message : "가사 생성에 실패했습니다.",
        variant: "destructive",
      });
    },
    onSettled: () => {
      setGeneratingLyrics(false);
    }
  });
  
  // 음악 생성 뮤테이션
  const createMusicMutation = useMutation({
    mutationFn: async (values: MusicFormValues) => {
      // FormData 생성
      const formData = new FormData();
      formData.append('prompt', values.prompt);
      formData.append('voice', values.voice);
      
      // 가사가 있고, 가사 사용 옵션이 켜져있으면 가사 추가
      if (values.lyrics && values.useLyrics) {
        formData.append('lyrics', values.lyrics);
      }
      
      // 음악 생성 API 호출
      const res = await fetch('/api/music-generate', {
        method: 'POST',
        body: formData,
      });
      
      if (!res.ok) {
        const errorData = await res.text();
        console.error('음악 생성 응답 오류:', errorData);
        throw new Error(errorData || "음악 생성에 실패했습니다.");
      }
      
      // 바이너리 데이터로 받기
      return await res.blob();
    },
    onSuccess: (blob) => {
      // Blob URL 생성
      const audioUrl = URL.createObjectURL(blob);
      console.log("음악 생성 완료, URL:", audioUrl);
      
      toast({
        title: "음악 생성 성공",
        description: "음악이 성공적으로 생성되었습니다.",
      });
      
      if (onMusicGenerated) {
        onMusicGenerated({
          id: Date.now(),
          title: form.getValues().title || "새로운 음악",
          url: audioUrl,
          createdAt: new Date().toISOString()
        });
      }
      
      // 폼 초기화
      form.reset();
    },
    onError: (error) => {
      console.error("음악 생성 오류:", error);
      toast({
        title: "음악 생성 실패",
        description: error instanceof Error ? error.message : "음악 생성에 실패했습니다. 잠시 후 다시 시도해주세요.",
        variant: "destructive",
      });
    }
  });
  
  // 가사 생성 핸들러
  const handleGenerateLyrics = () => {
    const prompt = form.getValues().prompt;
    if (!prompt || prompt.length < 3) {
      toast({
        title: "프롬프트 필요",
        description: "가사를 생성하려면 먼저 프롬프트를 입력해주세요.",
        variant: "destructive",
      });
      return;
    }
    
    setGeneratingLyrics(true);
    generateLyricsMutation.mutate(prompt);
  };
  
  // 폼 제출 핸들러
  const onSubmit = (values: MusicFormValues) => {
    createMusicMutation.mutate(values);
  };
  
  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MusicIcon className="h-6 w-6" />
          음악 만들기
        </CardTitle>
        <CardDescription>
          프롬프트를 입력하고 음악 스타일을 선택하여 AI로 음악을 생성해보세요.
        </CardDescription>
        <div className="flex items-center justify-end space-x-2 mt-2">
          <Label htmlFor="advanced-mode" className="text-sm">고급 모드</Label>
          <Switch
            id="advanced-mode"
            checked={isAdvancedMode}
            onCheckedChange={setIsAdvancedMode}
          />
        </div>
      </CardHeader>
      
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <Tabs defaultValue="basic" className="w-full">
              <TabsList className="grid grid-cols-3 mb-4">
                <TabsTrigger value="basic">기본 정보</TabsTrigger>
                <TabsTrigger value="lyrics">가사</TabsTrigger>
                <TabsTrigger value="voice">음성 설정</TabsTrigger>
              </TabsList>
              
              {/* 기본 정보 탭 */}
              <TabsContent value="basic" className="space-y-4">
                <FormField
                  control={form.control}
                  name="title"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>제목</FormLabel>
                      <FormControl>
                        <Input placeholder="음악 제목을 입력하세요" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="prompt"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>프롬프트</FormLabel>
                      <FormControl>
                        <Textarea 
                          placeholder="음악에 대한 설명을 입력하세요. (예: '아기를 위한 편안한 자장가', '태교에 좋은 피아노 멜로디')" 
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
                      <FormLabel>음악 스타일</FormLabel>
                      <Select 
                        onValueChange={field.onChange} 
                        defaultValue={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="음악 스타일을 선택하세요" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {musicStyles.map((style: string) => (
                            <SelectItem key={style} value={style}>
                              {musicStyleMap[style as keyof typeof musicStyleMap] || style}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </TabsContent>
              
              {/* 가사 탭 */}
              <TabsContent value="lyrics" className="space-y-4">
                <div className="flex justify-end mb-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={generatingLyrics}
                    onClick={handleGenerateLyrics}
                  >
                    {generatingLyrics && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    프롬프트로 가사 생성
                  </Button>
                </div>
                
                <FormField
                  control={form.control}
                  name="lyrics"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>가사</FormLabel>
                      <FormControl>
                        <Textarea 
                          placeholder="가사를 입력하거나 위 버튼을 눌러 자동 생성하세요" 
                          className="min-h-[200px]"
                          {...field} 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                {isAdvancedMode && (
                  <FormField
                    control={form.control}
                    name="useLyrics"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                        <FormControl>
                          <Checkbox
                            checked={field.value}
                            onCheckedChange={field.onChange}
                          />
                        </FormControl>
                        <div className="space-y-1 leading-none">
                          <FormLabel>
                            가사 사용하기 (체크 해제시 반주만 생성)
                          </FormLabel>
                        </div>
                      </FormItem>
                    )}
                  />
                )}
              </TabsContent>
              
              {/* 음성 설정 탭 */}
              <TabsContent value="voice" className="space-y-4">
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
                          <SelectItem value="female_kr">여성 목소리 (한국어)</SelectItem>
                          <SelectItem value="male_kr">남성 목소리 (한국어)</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <div className="p-4 rounded-md bg-muted">
                  <p className="text-sm">
                    선택한 목소리로 가사를 노래합니다. 
                    MusicGen과 Bark TTS를 조합하여 배경 음악과 음성을 합성합니다.
                  </p>
                </div>
              </TabsContent>
            </Tabs>
          </form>
        </Form>
      </CardContent>
      
      <CardFooter className="flex justify-between">
        <Button
          variant="outline"
          onClick={() => form.reset()}
          disabled={createMusicMutation.isPending}
        >
          취소
        </Button>
        <Button 
          onClick={form.handleSubmit(onSubmit)}
          disabled={createMusicMutation.isPending}
        >
          {createMusicMutation.isPending ? (
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
      </CardFooter>
    </Card>
  );
}