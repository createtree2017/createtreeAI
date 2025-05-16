import { useState, useEffect, useCallback, useRef } from "react";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Loader2, Music, MusicIcon, Plus, Trash, Upload, Mic } from "lucide-react";

// 음악 생성 폼 검증 스키마
const musicFormSchema = z.object({
  title: z.string().min(1, "제목을 입력해주세요"),
  prompt: z.string().min(3, "최소 3글자 이상의 내용을 입력해주세요"),
  lyrics: z.string().optional(),
  duration: z.number().default(60),
  styleTags: z.array(z.string()).default([]),
  voiceMode: z.enum(["ai", "clone"]).default("ai"),
  voiceGender: z.enum(["female_kr", "male_kr"]).default("female_kr"),
  voiceId: z.string().optional(),
  useLyrics: z.boolean().default(true)
});

type MusicFormValues = z.infer<typeof musicFormSchema>;

interface MusicFormProps {
  onMusicGenerated?: (music: any) => void;
}

export default function MusicForm({ onMusicGenerated }: MusicFormProps) {
  const { toast } = useToast();
  const [generatingLyrics, setGeneratingLyrics] = useState(false);
  const [showVoiceUploadDialog, setShowVoiceUploadDialog] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [formMode, setFormMode] = useState<"simple" | "custom">("simple");
  
  // 보이스 목록 관련 상태
  const [userVoices, setUserVoices] = useState<Array<{ id: string, name: string }>>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [voiceFile, setVoiceFile] = useState<File | null>(null);
  
  // 사용자 음성 목록 불러오기
  const fetchUserVoices = useCallback(async () => {
    try {
      const response = await fetch('/api/voice/list');
      if (response.ok) {
        const data = await response.json();
        setUserVoices(data.voices || []);
      }
    } catch (error) {
      console.error('음성 목록 조회 오류:', error);
    }
  }, []);
  
  // 컴포넌트 마운트 시 음성 목록 불러오기
  useEffect(() => {
    fetchUserVoices();
  }, [fetchUserVoices]);
  
  // 음악 스타일 태그 정의
  const availableStyleTags = [
    { id: "lullaby", name: "자장가" },
    { id: "korean-nursery", name: "한국동요" },
    { id: "anime", name: "애니메이션" },
    { id: "kpop", name: "K-pop" },
    { id: "ballad", name: "발라드" },
    { id: "hiphop", name: "힙합" },
    { id: "classical", name: "클래식" },
    { id: "new-age", name: "뉴에이지" },
    { id: "prenatal", name: "태교음악" },
    { id: "relaxing", name: "릴렉싱" },
  ];

  // 음악 길이 옵션
  const durationOptions = [
    { value: 30, label: "30초" },
    { value: 60, label: "1분" },
    { value: 120, label: "2분" },
    { value: 180, label: "3분" },
    { value: 240, label: "4분" },
  ];

  // 폼 설정
  const form = useForm<MusicFormValues>({
    resolver: zodResolver(musicFormSchema),
    defaultValues: {
      title: "",
      prompt: "",
      lyrics: "",
      duration: 60,
      styleTags: ["lullaby"],
      voiceMode: "ai",
      voiceGender: "female_kr",
      voiceId: "",
      useLyrics: true,
    }
  });
  
  // 선택된 스타일 태그 관리
  const selectedStyleTags = form.watch("styleTags");
  
  // 스타일 태그 선택/해제 처리
  const toggleStyleTag = (tagId: string) => {
    const currentTags = [...selectedStyleTags];
    const index = currentTags.indexOf(tagId);
    
    if (index === -1) {
      // 태그 추가 (최대 3개까지)
      if (currentTags.length < 3) {
        form.setValue("styleTags", [...currentTags, tagId]);
      } else {
        toast({
          title: "최대 3개 태그",
          description: "스타일 태그는 최대 3개까지만 선택 가능합니다.",
          variant: "destructive",
        });
      }
    } else {
      // 태그 제거 (최소 1개는 유지)
      if (currentTags.length > 1) {
        currentTags.splice(index, 1);
        form.setValue("styleTags", currentTags);
      } else {
        toast({
          description: "최소 하나의 스타일 태그는 선택해야 합니다.",
          variant: "destructive",
        });
      }
    }
  };
  
  // 음성 모드 상태 관찰
  const voiceMode = form.watch("voiceMode");
  
  // 파일 선택 처리
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setVoiceFile(e.target.files[0]);
    }
  };
  
  // 파일 선택 버튼 클릭
  const handleFileButtonClick = () => {
    fileInputRef.current?.click();
  };
  
  // 음성 파일 업로드 처리
  const handleVoiceUpload = async () => {
    if (!voiceFile) {
      toast({
        title: "파일 필요",
        description: "업로드할 음성 파일을 선택해주세요.",
        variant: "destructive",
      });
      return;
    }
    
    setIsUploading(true);
    
    try {
      const formData = new FormData();
      formData.append('audio', voiceFile);
      
      const response = await fetch('/api/voice/upload', {
        method: 'POST',
        body: formData
      });
      
      if (!response.ok) {
        throw new Error('음성 업로드 실패');
      }
      
      const data = await response.json();
      
      // 사용자 목소리 목록 갱신
      await fetchUserVoices();
      
      // 업로드한 음성 ID를 폼에 반영
      form.setValue('voiceId', data.voiceId);
      form.setValue('voiceMode', 'clone');
      
      toast({
        title: "음성 업로드 성공",
        description: "내 목소리가 등록되었습니다.",
      });
      
      // 다이얼로그 닫기
      setShowVoiceUploadDialog(false);
    } catch (error) {
      toast({
        title: "음성 업로드 실패",
        description: error instanceof Error ? error.message : '알 수 없는 오류가 발생했습니다',
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
      setVoiceFile(null);
    }
  };
  
  // 가사 생성 뮤테이션
  const generateLyricsMutation = useMutation({
    mutationFn: async (prompt: string) => {
      const styleTags = form.getValues().styleTags.join(',');
      
      const res = await apiRequest("/api/lyrics/generate", {
        method: "POST",
        data: { 
          prompt,
          styleTags,
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
          form.setValue("title", `${form.getValues().prompt}를 위한 노래`);
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
      formData.append('title', values.title);
      formData.append('prompt', values.prompt);
      formData.append('duration', values.duration.toString());
      formData.append('styleTags', values.styleTags.join(','));
      formData.append('voiceMode', values.voiceMode);
      
      if (values.voiceMode === 'ai') {
        formData.append('voiceGender', values.voiceGender);
      } else if (values.voiceMode === 'clone' && values.voiceId) {
        formData.append('voiceId', values.voiceId);
      }
      
      // 가사가 있고, 가사 사용 옵션이 켜져있으면 가사 추가
      if (values.lyrics && values.useLyrics) {
        formData.append('lyrics', values.lyrics);
      }
      
      // 음악 생성 API 호출
      const res = await fetch('/api/music/generate', {
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
        description: `음악이 성공적으로 생성되었습니다. (${form.getValues().duration}초)`,
      });
      
      if (onMusicGenerated) {
        onMusicGenerated({
          id: Date.now(),
          title: form.getValues().title || "새로운 음악",
          url: audioUrl,
          duration: form.getValues().duration,
          createdAt: new Date().toISOString()
        });
      }
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
    // 필수 값 확인
    if (values.voiceMode === 'clone' && !values.voiceId) {
      toast({
        title: "내 목소리 선택 필요",
        description: "내 목소리 모드를 선택했을 경우 목소리를 업로드하거나 선택해주세요.",
        variant: "destructive",
      });
      return;
    }
    
    createMusicMutation.mutate(values);
  };
  
  return (
    <div className="w-full mx-auto max-w-3xl">
      <div className="bg-black rounded-xl shadow-lg text-white p-6 mb-4">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {/* 모드 선택 버튼 (Simple/Custom) */}
            <div className="flex justify-center mb-4">
              <div className="bg-zinc-800 rounded-full inline-flex p-1">
                <Button 
                  type="button" 
                  variant="ghost" 
                  className={`rounded-full px-6 py-1 ${formMode === "simple" ? "bg-black text-white" : "text-gray-400"}`}
                  onClick={() => setFormMode("simple")}
                >
                  Simple
                </Button>
                <Button 
                  type="button" 
                  variant="ghost"
                  className={`rounded-full px-6 py-1 ${formMode === "custom" ? "bg-black text-white" : "text-gray-400"}`}
                  onClick={() => setFormMode("custom")}
                >
                  Custom
                </Button>
              </div>
            </div>
            
            {/* 프롬프트 입력 */}
            <FormField
              control={form.control}
              name="prompt"
              render={({ field }) => (
                <FormItem>
                  <div className="flex items-center gap-2 mb-2">
                    <FormLabel className="text-white flex items-center gap-2 text-lg font-medium">
                      <MusicIcon className="h-5 w-5" />
                      프롬프트
                    </FormLabel>
                  </div>
                  <FormControl>
                    <Textarea 
                      placeholder="음악에 대한 설명을 입력하세요. (예: '아기를 위한 편안한 자장가', '태교에 좋은 피아노 멜로디')" 
                      className="min-h-[80px] bg-zinc-900 border-zinc-800 text-white placeholder:text-zinc-500 resize-none"
                      {...field} 
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            {/* 가사 섹션 */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-lg font-medium">
                  <span className="text-white flex items-center gap-2">
                    <Music className="h-5 w-5" /> 
                    가사
                  </span>
                </div>
                
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="text-white bg-zinc-800 hover:bg-zinc-700"
                    onClick={handleGenerateLyrics}
                    disabled={generatingLyrics}
                  >
                    Auto {generatingLyrics && <Loader2 className="ml-2 h-3 w-3 animate-spin" />}
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="text-white bg-zinc-800 hover:bg-zinc-700"
                  >
                    직접 작성
                  </Button>
                </div>
              </div>
              
              <FormField
                control={form.control}
                name="lyrics"
                render={({ field }) => (
                  <FormItem>
                    <FormControl>
                      <Textarea 
                        placeholder="가사를 입력하거나 Auto 버튼을 눌러 자동 생성하세요" 
                        className="min-h-[160px] bg-zinc-900 border-zinc-800 text-white placeholder:text-zinc-500 resize-none"
                        {...field} 
                      />
                    </FormControl>
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="useLyrics"
                render={({ field }) => (
                  <FormItem className="flex items-center gap-2 rounded-lg mt-2">
                    <div className="flex items-center space-x-2">
                      <Switch
                        id="instrumental-mode"
                        checked={!field.value}
                        onCheckedChange={(checked) => field.onChange(!checked)}
                        className="data-[state=checked]:bg-zinc-700"
                      />
                      <Label htmlFor="instrumental-mode" className="text-sm text-zinc-400">
                        Instrumental
                      </Label>
                    </div>
                    
                    <div className="ml-auto flex gap-2">
                      <Badge variant="outline" className="bg-zinc-800 text-zinc-400 hover:bg-zinc-700 cursor-pointer border-zinc-700">
                        By Line
                      </Badge>
                      <Badge variant="outline" className="bg-zinc-800 text-zinc-400 hover:bg-zinc-700 cursor-pointer border-zinc-700">
                        Full Song
                      </Badge>
                    </div>
                  </FormItem>
                )}
              />
            </div>
            
            {/* 스타일 섹션 */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-white flex items-center gap-2 text-lg font-medium">
                  <Music className="h-5 w-5" /> 
                  Styles
                </span>
              </div>
              
              <div className="relative">
                <Input 
                  placeholder="Enter style tags" 
                  className="bg-zinc-900 border-zinc-800 text-white placeholder:text-zinc-500"
                />
                
                <div className="mt-2 flex flex-wrap gap-2">
                  {availableStyleTags.map((tag) => (
                    <Badge 
                      key={tag.id}
                      variant={selectedStyleTags.includes(tag.id) ? "default" : "outline"}
                      className={`cursor-pointer rounded-full py-1 px-3 ${
                        selectedStyleTags.includes(tag.id) 
                          ? "bg-zinc-700 hover:bg-zinc-600 text-white" 
                          : "bg-transparent text-zinc-400 border-zinc-700 hover:bg-zinc-800"
                      }`}
                      onClick={() => toggleStyleTag(tag.id)}
                    >
                      {tag.name}
                    </Badge>
                  ))}
                </div>
              </div>
            </div>
            
            {/* 음성 설정 섹션 */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-white flex items-center gap-2 text-lg font-medium">
                  <Mic className="h-5 w-5" /> 
                  Persona
                </span>
                <Button 
                  type="button" 
                  variant="ghost" 
                  size="icon" 
                  className="rounded-full bg-zinc-800 hover:bg-zinc-700"
                  onClick={() => setShowVoiceUploadDialog(true)}
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
              
              <div className="space-y-3">
                <FormField
                  control={form.control}
                  name="voiceMode"
                  render={({ field }) => (
                    <FormItem>
                      <FormControl>
                        <RadioGroup
                          onValueChange={field.onChange}
                          defaultValue={field.value}
                          className="flex flex-col space-y-1"
                        >
                          <FormItem className="flex items-center space-x-3 space-y-0 rounded-md px-3 py-2 bg-zinc-900">
                            <FormControl>
                              <RadioGroupItem value="ai" className="text-white" />
                            </FormControl>
                            <FormLabel className="font-normal text-white cursor-pointer">
                              AI 보컬
                            </FormLabel>
                            
                            {voiceMode === 'ai' && (
                              <div className="ml-auto">
                                <Select 
                                  onValueChange={(value) => form.setValue("voiceGender", value as "female_kr" | "male_kr")} 
                                  defaultValue={form.getValues().voiceGender}
                                >
                                  <FormControl>
                                    <SelectTrigger className="w-[120px] bg-zinc-800 border-zinc-700 text-white">
                                      <SelectValue />
                                    </SelectTrigger>
                                  </FormControl>
                                  <SelectContent className="bg-zinc-800 border-zinc-700 text-white">
                                    <SelectItem value="female_kr">여성 (한국어)</SelectItem>
                                    <SelectItem value="male_kr">남성 (한국어)</SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>
                            )}
                          </FormItem>
                          
                          <FormItem className="flex items-center space-x-3 space-y-0 rounded-md px-3 py-2 bg-zinc-900">
                            <FormControl>
                              <RadioGroupItem value="clone" className="text-white" />
                            </FormControl>
                            <FormLabel className="font-normal text-white cursor-pointer">
                              내 목소리
                            </FormLabel>
                            
                            {voiceMode === 'clone' && (
                              <div className="ml-auto">
                                <Select 
                                  onValueChange={(value) => {
                                    if (value === "upload") {
                                      setShowVoiceUploadDialog(true);
                                    } else {
                                      form.setValue("voiceId", value);
                                    }
                                  }} 
                                  defaultValue={form.getValues().voiceId || ""}
                                >
                                  <FormControl>
                                    <SelectTrigger className="w-[140px] bg-zinc-800 border-zinc-700 text-white">
                                      <SelectValue placeholder="목소리 선택" />
                                    </SelectTrigger>
                                  </FormControl>
                                  <SelectContent className="bg-zinc-800 border-zinc-700 text-white">
                                    {userVoices.length > 0 ? (
                                      userVoices.map((voice) => (
                                        <SelectItem key={voice.id} value={voice.id}>
                                          {voice.name || `보이스 #${voice.id}`}
                                        </SelectItem>
                                      ))
                                    ) : (
                                      <SelectItem value="" disabled>등록된 목소리 없음</SelectItem>
                                    )}
                                    <SelectItem value="upload">+ 새 목소리 업로드</SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>
                            )}
                          </FormItem>
                        </RadioGroup>
                      </FormControl>
                    </FormItem>
                  )}
                />
              </div>
            </div>
            
            {/* 추가 옵션 섹션 */}
            <div className={`space-y-3 border-t border-zinc-800 pt-4 ${formMode === 'simple' && 'hidden'}`}>
              <div className="flex items-center justify-between">
                <span className="text-white flex items-center gap-2 font-medium">
                  More Options
                </span>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="title"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-zinc-400">Song Title</FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="Enter song title" 
                          className="bg-zinc-900 border-zinc-800 text-white placeholder:text-zinc-500"
                          {...field}
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="duration"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-zinc-400">음악 길이</FormLabel>
                      <Select 
                        onValueChange={(value) => field.onChange(parseInt(value))} 
                        defaultValue={field.value.toString()}
                      >
                        <FormControl>
                          <SelectTrigger className="bg-zinc-900 border-zinc-800 text-white">
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent className="bg-zinc-800 border-zinc-700 text-white">
                          {durationOptions.map((option) => (
                            <SelectItem key={option.value} value={option.value.toString()}>
                              {option.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </FormItem>
                  )}
                />
              </div>
            </div>
            
            {/* 하단 버튼 영역 */}
            <div className="flex justify-between pt-5 border-t border-zinc-800">
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  className="bg-zinc-900 border-zinc-700 text-zinc-400 hover:bg-zinc-800"
                >
                  <Plus className="h-4 w-4" />
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  className="bg-zinc-900 border-zinc-700 text-zinc-400 hover:bg-zinc-800"
                  onClick={() => form.reset()}
                >
                  Clear All
                </Button>
              </div>
              
              <Button 
                type="submit"
                className="bg-gradient-to-r from-amber-500 to-rose-500 hover:opacity-90 px-8 text-white font-medium"
                disabled={createMusicMutation.isPending}
              >
                {createMusicMutation.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    생성 중...
                  </>
                ) : (
                  <>
                    <Music className="mr-2 h-4 w-4" />
                    Create
                  </>
                )}
              </Button>
            </div>
          </form>
        </Form>
      </div>
      
      <div className="text-xs text-muted-foreground text-center">
        <p>MusicGen + Bark TTS 기술로 생성된 음악은 약 30초~4분 길이로 제공됩니다.</p>
        <p>생성에는 약 1~2분이 소요될 수 있습니다.</p>
      </div>
      
      {/* 목소리 업로드 다이얼로그 */}
      <Dialog open={showVoiceUploadDialog} onOpenChange={setShowVoiceUploadDialog}>
        <DialogContent className="bg-zinc-900 text-white border-zinc-800">
          <DialogHeader>
            <DialogTitle>내 목소리 샘플 업로드</DialogTitle>
            <DialogDescription className="text-zinc-400">
              60초 이상의 깨끗한 목소리 샘플을 업로드해주세요. 최대 10MB, MP3 또는 WAV 형식만 가능합니다.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="flex items-center justify-center w-full">
              <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed rounded-lg cursor-pointer bg-zinc-800/40 hover:bg-zinc-800 border-zinc-700">
                <div className="flex flex-col items-center justify-center pt-5 pb-6">
                  <Mic className="w-8 h-8 mb-3 text-zinc-400" />
                  <p className="mb-2 text-sm text-zinc-400">
                    {voiceFile ? voiceFile.name : '클릭하여 파일 선택 또는 드래그앤드롭'}
                  </p>
                  <p className="text-xs text-zinc-500">MP3 또는 WAV (최대 10MB)</p>
                </div>
                <input 
                  ref={fileInputRef}
                  type="file" 
                  className="hidden" 
                  accept=".mp3,.wav"
                  onChange={handleFileChange}
                />
              </label>
            </div>
            
            <div className="flex justify-end space-x-2">
              <Button
                variant="outline"
                onClick={() => setShowVoiceUploadDialog(false)}
                disabled={isUploading}
                className="bg-transparent border-zinc-700 text-zinc-400 hover:bg-zinc-800"
              >
                취소
              </Button>
              <Button
                onClick={handleVoiceUpload}
                disabled={!voiceFile || isUploading}
                className="bg-gradient-to-r from-amber-500 to-rose-500 hover:opacity-90"
              >
                {isUploading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    업로드 중...
                  </>
                ) : (
                  <>
                    <Upload className="mr-2 h-4 w-4" />
                    업로드
                  </>
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}