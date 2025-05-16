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
import { Music as MusicIcon, PlayCircle, MoreVertical } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { AudioPlayer } from "@/components/ui/audio-player";
import { generateMusic, getMusicList, shareMedia, apiRequest } from "@/lib/api";

const formSchema = z.object({
  babyName: z.string().min(1, "Name or theme is required"),
  musicStyle: z.string().min(1, "Please select a music style"),
  duration: z.string().min(1, "Please select a duration"),
});

type FormValues = z.infer<typeof formSchema>;

interface MusicItem {
  id: number;
  title: string;
  duration: number;
  style: string;
  url: string;
  createdAt: string;
}

export default function Music() {
  const [location, setLocation] = useLocation();
  const { toast } = useToast();
  const [generatedMusic, setGeneratedMusic] = useState<MusicItem | null>(null);
  
  // Extract music ID from URL if any
  const query = new URLSearchParams(location.split("?")[1] || "");
  const musicId = query.get("id");
  
  // Form setup
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      babyName: "",
      musicStyle: "lullaby",
      duration: "60",
    },
  });
  
  // Fetch music list
  const { data: musicList, isLoading: isLoadingMusic } = useQuery({
    queryKey: ["/api/music"],
    queryFn: getMusicList,
  });
  
  // Fetch individual music if ID is provided
  useEffect(() => {
    if (musicId && musicList) {
      const foundMusic = musicList.find((item: MusicItem) => item.id === Number(musicId));
      if (foundMusic) {
        setGeneratedMusic(foundMusic);
      }
    }
  }, [musicId, musicList]);
  
  // Generate music mutation
  const { mutate: generateMusicMutation, isPending: isGenerating } = useMutation({
    mutationFn: (data: { babyName: string; style: string; duration: number }) => generateMusic({
      ...data,
      prompt: `아기 ${data.babyName}를 위한 ${data.style} 스타일의 음악`,
      title: `${data.babyName}의 ${data.style}`,
      voiceOption: 'ai',
      gender: 'female_kr'
    }),
    onSuccess: (data) => {
      setGeneratedMusic(data);
      queryClient.invalidateQueries({ queryKey: ["/api/music"] });
      toast({
        title: "Success!",
        description: "Your melody has been created",
      });
    },
    onError: (error) => {
      toast({
        title: "Error generating music",
        description: error.message,
        variant: "destructive",
      });
    },
  });
  
  const onSubmit = (values: FormValues) => {
    generateMusicMutation({
      babyName: values.babyName,
      style: values.musicStyle,
      duration: parseInt(values.duration),
    });
  };
  
  const handleDownload = async (id: number) => {
    try {
      const response = await apiRequest(`/api/music/${id}/download`);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `music-${id}.mp3`;
      document.body.appendChild(link);
      link.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(link);
      
      toast({
        title: "다운로드 성공",
        description: "음악 파일이 성공적으로 다운로드되었습니다.",
      });
    } catch (error) {
      console.error('다운로드 오류:', error);
      toast({
        title: "다운로드 실패",
        description: "음악 파일을 다운로드하는 중 오류가 발생했습니다.",
        variant: "destructive",
      });
    }
  };
  
  const handleShare = async (id: number) => {
    try {
      const response = await apiRequest(`/api/music/${id}/share`, {
        method: "POST"
      });
      const shareData = await response.json();
      
      const shareUrl = shareData.shareUrl || `${window.location.origin}/shared/music/${id}`;
      const shareTitle = "CreateTree Culture Center - AI 태교 음악";
      const foundMusic = musicList.find((item: MusicItem) => item.id === id);
      const shareText = foundMusic ? `${foundMusic.title} - CreateTree Culture Center` : shareTitle;
      
      // 네이티브 공유 API 사용 (모바일)
      if (navigator.share) {
        try {
          await navigator.share({
            title: shareText,
            url: shareUrl
          });
          toast({
            title: "공유되었습니다",
            description: "음악이 공유되었습니다!",
          });
        } catch (shareError) {
          console.error('공유 API 오류:', shareError);
          // 클립보드 폴백
          await navigator.clipboard.writeText(shareUrl);
          toast({
            title: "공유 링크가 생성되었습니다",
            description: "클립보드에 링크가 복사되었습니다!",
          });
        }
      } else {
        // 공유 URL을 클립보드에 복사 (데스크톱)
        await navigator.clipboard.writeText(shareUrl);
        toast({
          title: "공유 링크가 생성되었습니다",
          description: "클립보드에 링크가 복사되었습니다!",
        });
      }
    } catch (error) {
      console.error('음악 공유 오류:', error);
      toast({
        title: "공유 링크 생성 오류",
        description: "나중에 다시 시도해주세요",
        variant: "destructive",
      });
    }
  };
  
  const handlePlayAudio = (musicItem: MusicItem) => {
    setGeneratedMusic(musicItem);
  };
  
  // Music styles data
  const musicStyles = [
    { value: "lullaby", label: "Lullaby" },
    { value: "taegyo", label: "태교 (Prenatal)" },
    { value: "celebration", label: "Celebration" },
    { value: "love", label: "Love Song" },
    { value: "playful", label: "Playful" },
    { value: "classical", label: "Classical" },
  ];
  
  // Duration options
  const durationOptions = [
    { value: "30", label: "30 seconds" },
    { value: "60", label: "1 minute" },
    { value: "120", label: "2 minutes" },
    { value: "180", label: "3 minutes" },
  ];
  
  return (
    <div className="p-5 animate-fadeIn">
      <div className="text-center mb-6">
        <h2 className="font-heading font-bold text-2xl mb-2">Family Music Creator</h2>
        <p className="text-neutral-dark">Create personalized songs for special family moments and memories</p>
      </div>
      
      {/* Music Form */}
      <div className="bg-white rounded-xl p-5 shadow-soft border border-neutral-light overflow-hidden relative">
        <div className="absolute -top-16 -right-16 w-32 h-32 bg-primary-light/20 rounded-full"></div>
        <div className="absolute -bottom-8 -left-8 w-24 h-24 bg-primary-light/10 rounded-full"></div>
        
        <div className="text-center mb-6 relative">
          <div className="inline-block p-3 bg-primary-light/30 rounded-full mb-3">
            <MusicIcon className="h-6 w-6 text-primary-dark" />
          </div>
          <h3 className="font-heading font-semibold text-lg text-primary-dark">Create a Musical Memory</h3>
          <p className="text-sm text-neutral-dark mt-1 max-w-md mx-auto">
            Our AI will compose a beautiful melody for family memories - from lullabies to celebration songs
          </p>
        </div>
        
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5 relative">
            <FormField
              control={form.control}
              name="babyName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="block font-medium mb-2 text-neutral-darkest">
                    Name or Theme
                  </FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Enter your baby's taemyeong (태명), e.g. 'Sarang-i', 'Mini-Mom'"
                      className="w-full p-3 rounded-lg border border-neutral focus:border-primary-dark focus:ring focus:ring-primary-light focus:ring-opacity-50 outline-none transition"
                      {...field}
                    />
                  </FormControl>
                  <p className="text-xs text-neutral-dark mt-1">
                    In Korea, many parents use a taemyeong to connect emotionally with their baby before birth. You can enter that name or any special theme you want.
                  </p>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="musicStyle"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="block font-medium mb-2 text-neutral-darkest">
                    Music Style
                  </FormLabel>
                  <div className="grid grid-cols-2 gap-3">
                    {musicStyles.map((style) => (
                      <label 
                        key={style.value}
                        className={`flex flex-col items-center border border-neutral rounded-xl p-4 cursor-pointer hover:bg-neutral-lightest transition-colors ${
                          field.value === style.value ? "bg-primary-light/20 border-primary shadow-sm" : ""
                        }`}
                      >
                        <div className={`p-2 rounded-full mb-2 ${
                          field.value === style.value ? "bg-primary-light text-primary-dark" : "bg-neutral-lightest text-neutral-dark"
                        }`}>
                          {style.value === "lullaby" && <span className="block text-lg">🌙</span>}
                          {style.value === "taegyo" && <span className="block text-lg">👶</span>}
                          {style.value === "celebration" && <span className="block text-lg">🎉</span>}
                          {style.value === "love" && <span className="block text-lg">❤️</span>}
                          {style.value === "playful" && <span className="block text-lg">🎪</span>}
                          {style.value === "classical" && <span className="block text-lg">🎻</span>}
                        </div>
                        <input
                          type="radio"
                          className="sr-only"
                          value={style.value}
                          checked={field.value === style.value}
                          onChange={() => field.onChange(style.value)}
                        />
                        <span className="font-medium text-center">{style.label}</span>
                      </label>
                    ))}
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="duration"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="block font-medium mb-2 text-neutral-darkest">
                    Song Duration
                  </FormLabel>
                  <Select 
                    onValueChange={field.onChange} 
                    defaultValue={field.value}
                  >
                    <FormControl>
                      <SelectTrigger className="w-full p-3 rounded-lg border border-neutral focus:border-primary-dark focus:ring focus:ring-primary-light focus:ring-opacity-50 outline-none transition">
                        <SelectValue placeholder="Select duration" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {durationOptions.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-neutral-dark mt-1">
                    Shorter songs are perfect for quick moments, longer ones for naptime
                  </p>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <div className="pt-2">
              <Button 
                type="submit" 
                className="w-full bg-primary hover:bg-primary-dark text-white font-medium py-3.5 px-4 rounded-lg transition-colors shadow-md"
                disabled={isGenerating}
              >
                <MusicIcon className="mr-2 h-4 w-4" />
                {isGenerating ? "Creating your melody..." : "Create Your Special Melody"}
              </Button>
            </div>
          </form>
        </Form>
      </div>
      
      {/* Generated Music Section */}
      {generatedMusic && (
        <div className="mt-8">
          <div className="flex items-center mb-3">
            <h3 className="font-heading font-semibold text-lg">Your Musical Memory</h3>
            <div className="ml-2 bg-primary-light rounded-full px-2 py-0.5">
              <span className="text-xs font-medium text-primary-dark">New</span>
            </div>
          </div>
          
          <div className="bg-white rounded-xl p-5 shadow-soft border border-neutral-light">
            <div className="text-center mb-4">
              <h4 className="font-medium text-lg">{generatedMusic.title}</h4>
              <p className="text-sm text-neutral-dark">A special melody for your family moments</p>
            </div>
            
            <AudioPlayer
              src={generatedMusic.url}
              title={generatedMusic.title}
              duration={generatedMusic.duration}
              style={generatedMusic.style}
              onDownload={() => handleDownload(generatedMusic.id)}
              onShare={() => handleShare(generatedMusic.id)}
            />
            
            <div className="mt-4 text-center">
              <p className="text-sm text-neutral-dark">
                This melody was created specially for your family. Play it during special moments to create beautiful memories together.
              </p>
            </div>
          </div>
        </div>
      )}
      
      {/* Previous Melodies */}
      <div className="mt-8">
        <div className="flex justify-between items-center mb-4">
          <h3 className="font-heading font-semibold text-lg">Your Music Collection</h3>
          {musicList && musicList.length > 0 && (
            <span className="text-xs bg-neutral-lightest rounded-full px-3 py-1 text-neutral-dark">
              {musicList.length} melodies
            </span>
          )}
        </div>
        
        {isLoadingMusic ? (
          <div className="space-y-3">
            <div className="bg-neutral-lightest h-20 rounded-xl animate-pulse"></div>
            <div className="bg-neutral-lightest h-20 rounded-xl animate-pulse"></div>
          </div>
        ) : musicList && musicList.length > 0 ? (
          <div className="space-y-3">
            {musicList.map((melody: MusicItem) => (
              <div 
                key={melody.id}
                className="bg-white rounded-xl p-4 shadow-soft flex items-center border border-neutral-light hover:shadow-md transition-shadow"
              >
                <div className="mr-4 p-3 bg-primary-light/30 rounded-full text-primary-dark">
                  <MusicIcon className="h-5 w-5" />
                </div>
                <div className="flex-1">
                  <p className="font-medium">{melody.title}</p>
                  <div className="flex items-center text-xs text-neutral-dark mt-1">
                    <span className="bg-neutral-lightest rounded-full px-2 py-0.5 mr-2">
                      {melody.style}
                    </span>
                    <span>
                      {Math.floor(melody.duration / 60)}:{(melody.duration % 60).toString().padStart(2, '0')} • {melody.createdAt}
                    </span>
                  </div>
                </div>
                <button 
                  className="mr-3 p-2 rounded-full text-neutral-dark hover:text-primary hover:bg-primary-light/20 transition-colors"
                  onClick={() => handlePlayAudio(melody)}
                  title="Play melody"
                >
                  <PlayCircle className="h-6 w-6" />
                </button>
                <button 
                  className="p-2 rounded-full text-neutral-dark hover:text-neutral-darkest hover:bg-neutral-lightest transition-colors"
                  title="More options"
                >
                  <MoreVertical className="h-5 w-5" />
                </button>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8 bg-neutral-lightest rounded-xl border border-dashed border-neutral-light">
            <MusicIcon className="h-8 w-8 mx-auto mb-2 text-neutral" />
            <p className="text-neutral-dark font-medium">No melodies created yet</p>
            <p className="text-sm mt-1 mb-4 text-neutral-dark">Create your first family melody to begin your collection</p>
            <Button
              variant="outline"
              size="sm"
              className="bg-white hover:bg-neutral-lightest"
              onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
            >
              Create a Melody
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
