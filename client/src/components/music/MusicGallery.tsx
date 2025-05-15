import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Music, Filter, RefreshCw, AlertTriangle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import MusicPlayer from "./MusicPlayer";
import { Skeleton } from "@/components/ui/skeleton";
import { Pagination } from "@/components/ui/pagination";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";

type Music = {
  id: number;
  title: string;
  prompt: string;
  translatedPrompt?: string;
  tags: string[];
  url: string;
  instrumental: boolean;
  lyrics?: string;
  userId: number;
  duration: number;
  createdAt: string;
};

interface MusicGalleryProps {
  limit?: number;
  userId?: number;
  showFilters?: boolean;
  onMusicSelect?: (music: Music) => void;
  className?: string;
}

export default function MusicGallery({
  limit = 10,
  userId,
  showFilters = true,
  onMusicSelect,
  className = "",
}: MusicGalleryProps) {
  const { toast } = useToast();
  const [page, setPage] = useState(1);
  const [activeTab, setActiveTab] = useState<string>("all");
  const [selectedStyle, setSelectedStyle] = useState<string>("");
  const [selectedMusic, setSelectedMusic] = useState<Music | null>(null);
  
  // 음악 스타일 목록 가져오기
  const { data: musicStyles = [
    "lullaby", "classical", "ambient", "relaxing", "piano", 
    "orchestral", "korean-traditional", "nature-sounds", "meditation", "prenatal"
  ] } = useQuery({
    queryKey: ["/api/music/styles"],
    enabled: true, // API가 준비되어 활성화
    queryFn: async () => {
      try {
        const res = await apiRequest("/api/music/styles");
        
        if (!res.ok) {
          console.warn("음악 스타일 목록을 가져오는데 실패했습니다. 기본값 사용");
          return [
            "lullaby", "classical", "ambient", "relaxing", "piano", 
            "orchestral", "korean-traditional", "nature-sounds", "meditation", "prenatal"
          ];
        }
        
        const data = await res.json();
        return data || [
          "lullaby", "classical", "ambient", "relaxing", "piano", 
          "orchestral", "korean-traditional", "nature-sounds", "meditation", "prenatal"
        ];
      } catch (error) {
        console.error("음악 스타일 목록 요청 오류:", error);
        return [
          "lullaby", "classical", "ambient", "relaxing", "piano", 
          "orchestral", "korean-traditional", "nature-sounds", "meditation", "prenatal"
        ]; // 오류 발생 시 기본값 사용
      }
    }
  });
  
  // 임시 음악 데이터 (오디오 재생 테스트용)
  const mockMusicData = {
    music: [
      {
        id: 1,
        title: "아기를 위한 편안한 자장가",
        prompt: "아기가 깊은 수면을 취할 수 있는 부드러운 멜로디의 자장가",
        tags: ["자장가", "수면", "편안함"],
        url: "https://soundssamples.s3.ap-northeast-2.amazonaws.com/Lullaby1.mp3",
        instrumental: false,
        lyrics: "잘 자라 우리 아가\n별빛이 내리는 밤\n엄마 품에 안겨서\n달콤한 꿈을 꾸렴",
        userId: 1,
        duration: 180,
        createdAt: new Date().toISOString()
      },
      {
        id: 2,
        title: "태교를 위한 클래식 멜로디",
        prompt: "태교에 좋은 평온한, 서정적인 클래식 피아노 멜로디",
        tags: ["태교", "클래식", "피아노"],
        url: "https://soundssamples.s3.ap-northeast-2.amazonaws.com/Lullaby2.mp3",
        instrumental: true,
        userId: 1,
        duration: 210,
        createdAt: new Date().toISOString()
      },
      {
        id: 3,
        title: "아기와 함께하는 동요",
        prompt: "아기와 함께 불러볼 수 있는 밝고 경쾌한 동요",
        tags: ["동요", "밝은", "아기"],
        url: "https://soundssamples.s3.ap-northeast-2.amazonaws.com/Lullaby3.mp3",
        instrumental: false,
        lyrics: "아기야 안녕\n뭐하고 놀까\n같이 춤을 추자\n손뼉을 치자",
        userId: 1,
        duration: 160,
        createdAt: new Date().toISOString()
      }
    ],
    meta: {
      currentPage: page,
      totalPages: 1,
      totalItems: 3,
      itemsPerPage: limit
    }
  };
  
  // 음악 목록 가져오기
  const { 
    data: serverMusicData, 
    isLoading: isServerLoading, 
    isError: isServerError, 
    error: serverError,
    refetch
  } = useQuery({
    queryKey: ["/api/music/list", page, limit, activeTab, selectedStyle, userId],
    enabled: true, // API 경로가 준비되어 활성화
    queryFn: async () => {
      // 쿼리 파라미터 구성
      const params = new URLSearchParams();
      params.append("page", page.toString());
      params.append("limit", limit.toString());
      
      if (activeTab === "instrumental") {
        params.append("instrumental", "true");
      } else if (activeTab === "vocal") {
        params.append("instrumental", "false");
      }
      
      if (selectedStyle) {
        params.append("style", selectedStyle);
      }
      
      if (userId) {
        params.append("userId", userId.toString());
      }
      
      console.log(`음악 목록 요청: /api/music/list?${params.toString()}`);
      
      try {
        const res = await apiRequest(`/api/music/list`, {
          params: Object.fromEntries(params.entries())
        });
        
        // Content-Type 헤더 확인
        const contentType = res.headers.get('content-type');
        if (!contentType || !contentType.includes('application/json')) {
          console.error(`음악 목록 API가 JSON이 아닌 응답을 반환했습니다:`, contentType);
          throw new Error('서버가 유효하지 않은 응답 형식을 반환했습니다');
        }
        
        const data = await res.json();
        console.log('API 응답 데이터:', data);
        
        // 데이터가 없거나 음악 목록이 비어있는 경우 빈 배열로 초기화
        if (!data || !data.music) {
          return { music: [], meta: { page: 1, totalPages: 0, totalItems: 0 } };
        }
        
        return data;
      } catch (error) {
        console.error("음악 목록 요청 오류:", error);
        throw error; // 오류를 상위로 전파하여 UI에 표시
      }
    }
  });
  
  // 서버 데이터 사용 - 더 엄격한 타입 체크와 기본값 적용
  const musicData = 
    serverMusicData && 
    typeof serverMusicData === 'object' && 
    Array.isArray(serverMusicData.music) ? 
    serverMusicData : 
    { 
      music: [], 
      meta: { 
        page: 1, 
        totalPages: 0, 
        totalItems: 0,
        itemsPerPage: limit
      } 
    };
  
  // 서버에서 데이터를 가져오는 중인지 여부
  const isLoading = isServerLoading;
  const isError = isServerError;
  const error = serverError;
  
  const handleRetry = () => {
    refetch();
  };
  
  const handleMusicClick = (music: Music) => {
    setSelectedMusic(music);
    if (onMusicSelect) {
      onMusicSelect(music);
    }
  };
  
  const handleAddToFavorites = (id: number) => {
    toast({
      title: "즐겨찾기에 추가됨",
      description: "선택한 음악이 즐겨찾기에 추가되었습니다.",
    });
  };
  
  const handleShare = async (id: number) => {
    try {
      // 공유 API 호출
      const response = await apiRequest('/api/music/share', {
        method: 'POST',
        data: { musicId: id }
      });
      
      if (!response.ok) {
        throw new Error("음악 공유 설정 실패");
      }
      
      // 성공적으로 공유 상태로 설정됨
      const shareUrl = `${window.location.origin}/shared/music/${id}`;
      
      // Web Share API 지원 확인
      if (navigator.share) {
        navigator.share({
          title: "음악 공유",
          text: "창조트리 AI가 생성한 음악을 들어보세요!",
          url: shareUrl,
        }).catch(error => {
          console.error("공유 실패:", error);
        });
      } else {
        // 공유 API를 지원하지 않는 브라우저의 경우 클립보드에 복사
        navigator.clipboard.writeText(shareUrl).then(() => {
          toast({
            title: "링크가 복사되었습니다",
            description: "공유 링크가 클립보드에 복사되었습니다.",
          });
        }).catch(err => {
          console.error("클립보드 복사 실패:", err);
        });
      }
    } catch (error) {
      console.error("공유 기능 오류:", error);
      toast({
        title: "공유 실패",
        description: "음악을 공유할 수 없습니다. 다시 시도해주세요.",
        variant: "destructive"
      });
    }
  };
  
  const handlePageChange = (newPage: number) => {
    setPage(newPage);
  };
  
  // 에러 표시
  if (isError) {
    return (
      <Alert variant="destructive" className={className}>
        <AlertTriangle className="h-4 w-4" />
        <AlertTitle>음악 목록을 불러오는데 실패했습니다</AlertTitle>
        <AlertDescription>
          {error instanceof Error ? error.message : "서버에 접속할 수 없습니다. 잠시 후 다시 시도해주세요."}
          <Button 
            variant="outline" 
            size="sm" 
            onClick={handleRetry} 
            className="mt-2"
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            다시 시도
          </Button>
        </AlertDescription>
      </Alert>
    );
  }
  
  // 필터 및 탭 UI 렌더링
  const renderFilters = () => {
    if (!showFilters) return null;
    
    return (
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <Tabs
          value={activeTab}
          onValueChange={setActiveTab}
          className="w-full sm:w-auto"
        >
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="all">전체</TabsTrigger>
            <TabsTrigger value="vocal">가사 있음</TabsTrigger>
            <TabsTrigger value="instrumental">반주만</TabsTrigger>
          </TabsList>
        </Tabs>
        
        <div className="flex items-center gap-2">
          <p className="text-sm whitespace-nowrap">스타일 필터:</p>
          <select 
            className="w-[180px] h-10 rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none"
            value={selectedStyle || ""}
            onChange={(e) => setSelectedStyle(e.target.value)}
          >
            <option value="">전체</option>
            {Array.isArray(musicStyles) && musicStyles
              .filter((style) => typeof style === 'string' && style.trim() !== '')
              .map((style) => {
                // 스타일에 따른 표시 이름 결정
                let displayName = style;
                
                switch(style) {
                  case "lullaby": displayName = "자장가"; break;
                  case "classical": displayName = "클래식"; break;
                  case "ambient": displayName = "앰비언트"; break;
                  case "relaxing": displayName = "릴렉싱"; break;
                  case "piano": displayName = "피아노"; break;
                  case "orchestral": displayName = "오케스트라"; break;
                  case "korean-traditional": displayName = "국악"; break;
                  case "nature-sounds": displayName = "자연의 소리"; break;
                  case "meditation": displayName = "명상음악"; break;
                  case "prenatal": displayName = "태교음악"; break;
                  default: displayName = style;
                }
                
                return (
                  <option key={style} value={style}>
                    {displayName}
                  </option>
                );
            })}
          </select>
        </div>
      </div>
    );
  };
  
  // 로딩 UI 렌더링
  const renderLoading = () => {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {Array(limit).fill(0).map((_, i) => (
          <Card key={i} className="overflow-hidden">
            <CardHeader>
              <Skeleton className="h-6 w-3/4" />
              <Skeleton className="h-4 w-1/2 mt-2" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-32 w-full rounded-md" />
            </CardContent>
            <CardFooter>
              <Skeleton className="h-10 w-full" />
            </CardFooter>
          </Card>
        ))}
      </div>
    );
  };
  
  // 현재 선택된 음악 렌더링
  const renderSelectedMusic = () => {
    if (!selectedMusic) return null;
    
    return (
      <div className="mb-8">
        <h2 className="text-xl font-semibold mb-4">현재 재생 중</h2>
        <MusicPlayer
          music={selectedMusic}
          onAddToFavorites={handleAddToFavorites}
          onShare={handleShare}
          autoPlay
        />
      </div>
    );
  };
  
  // 음악 목록 렌더링
  const renderMusicList = () => {
    if (isLoading) {
      return renderLoading();
    }
    
    if (!musicData?.music || musicData.music.length === 0) {
      return (
        <div className="text-center p-8 bg-muted rounded-lg">
          <Music className="h-16 w-16 mx-auto text-muted-foreground" />
          <h3 className="mt-4 text-lg font-medium">음악이 없습니다</h3>
          <p className="text-muted-foreground mt-2">
            아직 생성된 음악이 없습니다. 음악을 생성해보세요!
          </p>
        </div>
      );
    }
    
    return (
      <>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {musicData.music.map((music: Music) => (
            <Card 
              key={music.id} 
              className={`overflow-hidden cursor-pointer transition-all hover:shadow-md ${selectedMusic?.id === music.id ? 'ring-2 ring-primary' : ''}`}
              onClick={() => handleMusicClick(music)}
            >
              <CardHeader className="pb-4">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Music className="h-4 w-4" />
                  {music.title || "제목 없음"}
                </CardTitle>
                <p className="text-sm text-muted-foreground line-clamp-2">
                  {music.prompt}
                </p>
              </CardHeader>
              
              <CardContent className="pb-2">
                <div className="flex flex-wrap gap-2 mb-4">
                  {music.tags?.slice(0, 3).map((tag, index) => (
                    <Badge key={index} variant="secondary" className="text-xs">
                      {tag}
                    </Badge>
                  ))}
                  {music.tags?.length > 3 && (
                    <Badge variant="outline" className="text-xs">
                      +{music.tags.length - 3}
                    </Badge>
                  )}
                </div>
                
                <div className="bg-muted h-1 w-full rounded-full">
                  <div className="bg-primary h-1 rounded-full w-0 animate-pulse"></div>
                </div>
              </CardContent>
              
              <CardFooter>
                <Button 
                  variant="default" 
                  size="sm" 
                  className="w-full"
                >
                  <Music className="h-4 w-4 mr-2" />
                  재생하기
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>
        
        {/* 페이지네이션 */}
        {musicData?.meta && musicData.meta.totalPages > 1 && (
          <div className="mt-8 flex justify-center">
            <Pagination
              currentPage={page}
              totalPages={musicData.meta.totalPages}
              onPageChange={handlePageChange}
            />
          </div>
        )}
      </>
    );
  };
  
  return (
    <div className={className}>
      {renderSelectedMusic()}
      {renderFilters()}
      {renderMusicList()}
    </div>
  );
}