import { useParams } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { MusicPlayer } from "@/components/music/MusicPlayer";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { 
  Share2, 
  Download, 
  Loader2, 
  Check,
  AlertCircle
} from "lucide-react";
import { 
  Alert,
  AlertDescription,
  AlertTitle,
} from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import { useState } from "react";

// Shared music data interface
interface SharedMusicData {
  id: number;
  title: string;
  prompt?: string;
  url: string;
  duration: number;
  createdAt: string;
  style?: string;
  tags?: string[];
  lyrics?: string;
}

const SharedMusic = () => {
  const { id } = useParams();
  const { toast } = useToast();
  const [copiedLink, setCopiedLink] = useState(false);

  // 공유된 음악 정보 가져오기
  const { data: music, isLoading, error } = useQuery<SharedMusicData>({
    queryKey: [`/api/music/shared/${id}`],
    retry: 1,
  });

  // 음악 다운로드 함수
  const handleDownload = async () => {
    if (!music?.url) return;

    try {
      const response = await fetch(`/api/music/download/${id}`);
      if (!response.ok) {
        throw new Error('다운로드 중 오류가 발생했습니다.');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${music.title || '음악'}.mp3`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      toast({
        title: "다운로드 성공",
        description: "음악 파일이 다운로드되었습니다.",
      });
    } catch (error) {
      console.error('다운로드 오류:', error);
      toast({
        title: "다운로드 실패",
        description: "음악 파일을 다운로드할 수 없습니다.",
        variant: "destructive"
      });
    }
  };

  // 현재 링크 공유하기
  const handleShareLink = async () => {
    const shareUrl = window.location.href;
    
    try {
      // Web Share API 지원 확인
      if (navigator.share) {
        await navigator.share({
          title: music?.title || '공유된 음악',
          text: '창조트리 음악을 확인해보세요!',
          url: shareUrl,
        });
      } else {
        // 클립보드에 복사
        await navigator.clipboard.writeText(shareUrl);
        setCopiedLink(true);
        toast({
          title: "링크 복사됨",
          description: "공유 링크가 클립보드에 복사되었습니다.",
        });
        
        // 3초 후 상태 초기화
        setTimeout(() => setCopiedLink(false), 3000);
      }
    } catch (error) {
      console.error('공유 오류:', error);
      toast({
        title: "공유 실패",
        description: "링크를 공유할 수 없습니다.",
        variant: "destructive"
      });
    }
  };
  
  // 로딩 중 UI
  if (isLoading) {
    return (
      <div className="w-full max-w-md mx-auto mt-8 p-4">
        <Card className="p-6 flex flex-col items-center">
          <Skeleton className="h-16 w-16 rounded-full mb-4" />
          <Skeleton className="h-8 w-3/4 mb-2" />
          <Skeleton className="h-4 w-1/2 mb-6" />
          <Skeleton className="h-12 w-full mb-4" />
          <div className="flex gap-4 mt-4">
            <Skeleton className="h-10 w-24" />
            <Skeleton className="h-10 w-24" />
          </div>
        </Card>
      </div>
    );
  }
  
  // 오류 발생 시 UI
  if (error || !music) {
    return (
      <div className="w-full max-w-md mx-auto mt-8 p-4">
        <Alert variant="destructive" className="mb-6">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>음악을 찾을 수 없습니다</AlertTitle>
          <AlertDescription>
            이 링크는 만료되었거나 잘못된 링크입니다. 음악 공유 링크를 확인해주세요.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="w-full max-w-md mx-auto mt-4 p-4 text-center">
      <Card className="p-6 flex flex-col items-center">
        <h1 className="text-2xl font-bold mb-2">{music.title}</h1>
        <p className="text-muted-foreground mb-6">
          {music.prompt || "창조트리 AI 룰라바이"}
        </p>
        
        {/* 오디오 플레이어 */}
        <div className="w-full mb-6">
          <MusicPlayer
            src={music.url || ""}
            title={music.title || "음악"}
            duration={music.duration || 0}
          />
        </div>
        
        {/* 액션 버튼 */}
        <div className="flex gap-4 mt-4">
          <Button
            variant="outline"
            className="flex items-center gap-2"
            onClick={handleShareLink}
          >
            {copiedLink ? (
              <>
                <Check size={16} /> 복사됨
              </>
            ) : (
              <>
                <Share2 size={16} /> 공유하기
              </>
            )}
          </Button>
          
          <Button
            variant="default"
            className="flex items-center gap-2"
            onClick={handleDownload}
          >
            <Download size={16} /> 다운로드
          </Button>
        </div>
        
        {/* 제공 정보 */}
        <div className="mt-8 text-sm text-muted-foreground">
          <p>창조트리 AI가 제공하는 음악입니다.</p>
        </div>
      </Card>
    </div>
  );
};

export default SharedMusic;