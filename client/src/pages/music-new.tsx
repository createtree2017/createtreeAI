import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { queryClient } from "@/lib/queryClient";
import { Music as MusicIcon, PlayCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { AudioPlayer } from "@/components/ui/audio-player";
import { apiRequest } from "@/lib/apiClient";
import { useMusicProcessing } from "@/lib/MusicProcessingState";
import { useMusicJob } from "@/lib/MusicJobContext";

// 폼 유효성 검증 스키마
const formSchema = z.object({
  babyName: z.string().min(1, "아기 이름 또는 주제가 필요합니다"),
  musicStyle: z.string().min(1, "음악 스타일을 선택하세요"),
  duration: z.string().min(1, "음악 길이를 선택하세요"),
});

type FormValues = z.infer<typeof formSchema>;

// 음악 아이템 인터페이스
interface MusicItem {
  id: number;
  title: string;
  duration: number;
  style: string;
  url: string;
  createdAt: string;
}

// 로컬 스토리지 키
const FORM_STORAGE_KEY = "music_form_data";

export default function Music() {
  const [location] = useLocation();
  const { toast } = useToast();
  // 글로벌 음악 생성 상태 가져오기
  const { isGenerating: isGeneratingGlobal, generatedMusic: globalGeneratedMusic, startGeneration, finishGeneration } = useMusicProcessing();
  
  // 새로운 Job 기반 음악 생성 컨텍스트
  const { 
    jobId, 
    status: jobStatus, 
    resultUrl, 
    resultId,
    error: jobError,
    formData: jobFormData,
    startJob,
    clearJob,
    setFormData: setJobFormData
  } = useMusicJob();
  
  // 로컬 음악 상태 (URL에서 ID로 직접 열었을 경우 사용)
  const [localGeneratedMusic, setLocalGeneratedMusic] = useState<MusicItem | null>(null);
  
  // Job 기반 상태에서 음악 정보 구성
  const jobMusic = resultId && resultUrl ? {
    id: resultId,
    title: jobFormData.title || `${jobFormData.babyName}의 ${jobFormData.musicStyle}`,
    duration: Number(jobFormData.duration) || 60,
    style: jobFormData.musicStyle || 'lullaby',
    url: resultUrl,
    createdAt: new Date().toISOString()
  } : null;
  
  // 표시할 음악 (Job 상태가 최우선, 그 다음 글로벌 상태, 마지막으로 로컬 상태)
  const generatedMusic = jobMusic || globalGeneratedMusic || localGeneratedMusic;
  
  // URL에서 음악 ID 추출
  const query = new URLSearchParams(location.split("?")[1] || "");
  const musicId = query.get("id");
  
  // 로컬 스토리지에서 폼 데이터 가져오기
  const getSavedFormData = () => {
    try {
      const savedData = localStorage.getItem(FORM_STORAGE_KEY);
      if (savedData) {
        return JSON.parse(savedData);
      }
    } catch (error) {
      console.error("로컬 스토리지 데이터 불러오기 실패:", error);
    }
    return {
      babyName: "",
      musicStyle: "lullaby",
      duration: "60",
    };
  };
  
  // 전역 상태에서 폼 데이터 가져오기
  const { formData: globalFormData, setFormData: setGlobalFormData } = useMusicProcessing();
  
  // 폼 설정 (전역 상태 사용)
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      babyName: globalFormData.babyName || getSavedFormData().babyName,
      musicStyle: globalFormData.musicStyle || getSavedFormData().musicStyle,
      duration: globalFormData.duration || getSavedFormData().duration
    },
  });
  
  // 폼 값이 변경될 때마다 전역 상태와 로컬 스토리지에 저장
  useEffect(() => {
    const subscription = form.watch((formValues) => {
      if (formValues.babyName || formValues.musicStyle || formValues.duration) {
        const newFormData = {
          babyName: formValues.babyName || "",
          musicStyle: formValues.musicStyle || "lullaby",
          duration: formValues.duration || "60",
        };
        
        // 전역 상태와 로컬 스토리지 모두 업데이트
        setGlobalFormData(newFormData);
        localStorage.setItem(FORM_STORAGE_KEY, JSON.stringify(newFormData));
      }
    });
    
    return () => subscription.unsubscribe();
  }, [form.watch, setGlobalFormData]);
  
  // 음악 목록 가져오기
  const { data: musicList = [], isLoading: isLoadingMusic } = useQuery({
    queryKey: ["/api/music/list"],
    queryFn: async () => {
      try {
        const response = await fetch("/api/music/list");
        if (!response.ok) {
          return [];
        }
        const data = await response.json();
        return data.music || [];
      } catch (error) {
        console.error("음악 목록 불러오기 실패:", error);
        return [];
      }
    },
  });
  
  // 음악 스타일 목록 가져오기
  const { data: musicStyles = [] } = useQuery({
    queryKey: ["/api/music/styles"],
    queryFn: async () => {
      try {
        const response = await fetch("/api/music/styles");
        if (!response.ok) {
          return [];
        }
        return response.json();
      } catch (error) {
        console.error("음악 스타일 목록 불러오기 실패:", error);
        return [];
      }
    },
  });
  
  // URL에서 음악 ID가 있으면 해당 음악 로드
  useEffect(() => {
    if (musicId && Array.isArray(musicList) && musicList.length > 0) {
      const foundMusic = musicList.find((item) => item.id === Number(musicId));
      if (foundMusic) {
        setLocalGeneratedMusic(foundMusic);
      }
    }
  }, [musicId, musicList]);
  
  // 음악 생성 뮤테이션 - 새로운 Job 기반 시스템 사용
  const { mutate: generateMusicMutation, isPending: isGeneratingLocal } = useMutation({
    mutationFn: async (data: FormValues) => {
      // 이전 전역 상태와의 호환성을 위해 유지
      startGeneration(data);
      
      // 음악 생성 중임을 표시
      toast({
        title: "음악 생성 시작",
        description: "음악을 생성하는 중입니다. 다른 페이지로 이동해도 백그라운드에서 계속 처리됩니다.",
      });
      
      // Job API 요청을 위한 데이터 준비
      const jobParams = {
        babyName: data.babyName,
        title: `${data.babyName}의 ${data.musicStyle}`,
        musicStyle: data.musicStyle,
        style: data.musicStyle,
        duration: data.duration,
        prompt: `아기 ${data.babyName}를 위한 ${data.musicStyle} 스타일의 음악`,
        voiceMode: "ai",
        gender: "female_kr",
        lyrics: `아기 ${data.babyName}를 위한 자장가\n사랑스러운 우리 아기\n편안하게 잠들어요`
      };
      
      // 전역 Job 컨텍스트를 통해 작업 시작
      await startJob(jobParams);
      
      // 실제 음악이 생성될 때까지 오래 걸리므로 임시 응답 반환
      return {
        pending: true
      };
    },
    onSuccess: () => {
      // 음악 목록 업데이트
      queryClient.invalidateQueries({ queryKey: ["/api/music/list"] });
    },
    onError: (error: Error) => {
      toast({
        title: "음악 생성 요청 실패",
        description: error.message,
        variant: "destructive",
      });
    },
  });
  
  // 모든 처리 상태 통합 - Job, 전역, 로컬 중 하나라도 처리 중이면 생성 중으로 표시
  const isGenerating = isGeneratingLocal || isGeneratingGlobal || jobStatus === 'pending' || jobStatus === 'processing';
  
  // Job 오류가 있으면 토스트로 표시
  useEffect(() => {
    if (jobError) {
      toast({
        title: "음악 생성 오류",
        description: jobError,
        variant: "destructive",
      });
    }
  }, [jobError, toast]);
  
  // 음악 공유 뮤테이션
  const { mutate: shareMusicMutation, isPending: isSharing } = useMutation({
    mutationFn: async (musicId: number) => {
      const response = await fetch("/api/music/share", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ musicId }),
      });
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || "음악 공유에 실패했습니다");
      }
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "음악 공유 완료",
        description: "음악이 성공적으로 공유되었습니다.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "음악 공유 실패",
        description: error.message,
        variant: "destructive",
      });
    },
  });
  
  // 폼 제출 핸들러 - 전역 상태 활용
  const onSubmit = (data: FormValues) => {
    // 전역 상태에 폼 데이터 저장
    setGlobalFormData(data);
    // 음악 생성 시작
    generateMusicMutation(data);
  };
  
  // 공유 버튼 클릭 핸들러
  const handleShare = () => {
    if (generatedMusic?.id) {
      shareMusicMutation(generatedMusic.id);
    }
  };
  
  return (
    <div className="container mx-auto px-4 py-10">
      <h1 className="text-3xl font-bold mb-6">Family Music Creator</h1>
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2">
          <div className="bg-card rounded-lg shadow-lg p-6 mb-6">
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                <FormField
                  control={form.control}
                  name="babyName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>아기 이름 또는 주제</FormLabel>
                      <FormControl>
                        <Input placeholder="예: 하은이, 우리 가족" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="musicStyle"
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
                          {Array.isArray(musicStyles) && musicStyles.length > 0 ? (
                            musicStyles.map((style: string) => (
                              <SelectItem key={style} value={style}>
                                {style.charAt(0).toUpperCase() + style.slice(1)}
                              </SelectItem>
                            ))
                          ) : (
                            <>
                              <SelectItem value="lullaby">Lullaby</SelectItem>
                              <SelectItem value="classical">Classical</SelectItem>
                              <SelectItem value="ambient">Ambient</SelectItem>
                              <SelectItem value="relaxing">Relaxing</SelectItem>
                            </>
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
                      <FormLabel>음악 길이</FormLabel>
                      <RadioGroup 
                        onValueChange={field.onChange} 
                        defaultValue={field.value}
                        className="flex gap-4"
                      >
                        <FormItem className="flex items-center space-x-2 space-y-0">
                          <FormControl>
                            <RadioGroupItem value="60" />
                          </FormControl>
                          <FormLabel className="font-normal">1분</FormLabel>
                        </FormItem>
                        <FormItem className="flex items-center space-x-2 space-y-0">
                          <FormControl>
                            <RadioGroupItem value="120" />
                          </FormControl>
                          <FormLabel className="font-normal">2분</FormLabel>
                        </FormItem>
                        <FormItem className="flex items-center space-x-2 space-y-0">
                          <FormControl>
                            <RadioGroupItem value="180" />
                          </FormControl>
                          <FormLabel className="font-normal">3분</FormLabel>
                        </FormItem>
                        <FormItem className="flex items-center space-x-2 space-y-0">
                          <FormControl>
                            <RadioGroupItem value="240" />
                          </FormControl>
                          <FormLabel className="font-normal">4분</FormLabel>
                        </FormItem>
                      </RadioGroup>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <Button 
                  type="submit" 
                  disabled={isGenerating}
                  className="w-full bg-gradient-to-r from-purple-400 via-pink-500 to-red-500 text-white"
                >
                  {isGenerating ? (
                    <span className="flex items-center">
                      <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      음악 생성 중...
                    </span>
                  ) : (
                    <span className="flex items-center">
                      <MusicIcon className="mr-2 h-5 w-5" />
                      음악 만들기
                    </span>
                  )}
                </Button>
              </form>
            </Form>
          </div>
        </div>
        
        <div className="lg:col-span-1">
          <div className="bg-card rounded-lg shadow-lg p-6">
            <h2 className="text-xl font-bold mb-4">생성된 음악</h2>
            
            {generatedMusic ? (
              <div className="space-y-4">
                <div className="p-4 rounded-lg bg-muted">
                  <h3 className="font-medium">{generatedMusic.title}</h3>
                  <p className="text-sm text-muted-foreground">
                    {new Date(generatedMusic.createdAt).toLocaleDateString()} · {generatedMusic.duration}초
                  </p>
                </div>
                
                <AudioPlayer 
                  src={generatedMusic.url} 
                  title={generatedMusic.title}
                  duration={generatedMusic.duration}
                />
                
                <Button 
                  onClick={handleShare}
                  disabled={isSharing}
                  variant="outline"
                  className="w-full"
                >
                  {isSharing ? "공유 중..." : "음악 공유하기"}
                </Button>
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                아기를 위한 음악을 만들어 보세요
              </div>
            )}
          </div>
          
          <div className="bg-card rounded-lg shadow-lg p-6 mt-6">
            <h2 className="text-xl font-bold mb-4">최근 생성된 음악</h2>
            
            {isLoadingMusic ? (
              <div className="text-center py-4">
                <svg className="animate-spin h-6 w-6 mx-auto text-primary" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
              </div>
            ) : Array.isArray(musicList) && musicList.length > 0 ? (
              <div className="space-y-2">
                {musicList.slice(0, 5).map((item: MusicItem) => (
                  <div 
                    key={item.id}
                    className="flex items-center p-2 rounded-md hover:bg-muted cursor-pointer"
                    onClick={() => {
                      // 로컬 상태와 전역 상태 모두 업데이트
                      setLocalGeneratedMusic(item);
                      finishGeneration(item);
                    }}
                  >
                    <PlayCircle className="mr-2 h-5 w-5 text-primary" />
                    <div>
                      <p className="font-medium">{item.title}</p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(item.createdAt).toLocaleDateString()} · {item.duration}초
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-4 text-muted-foreground">
                생성된 음악이 없습니다
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}