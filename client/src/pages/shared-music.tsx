import { useState, useEffect } from "react";
import { useLocation, useParams } from "wouter";
import { Loader2, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import MusicPlayer from "@/components/music/MusicPlayer";
import { useToast } from "@/hooks/use-toast";

type SharedMusic = {
  id: number;
  title: string;
  prompt: string;
  url: string;
  tags?: unknown;
  lyrics?: string;
  duration: number;
  createdAt: string;
};

export default function SharedMusic() {
  const { id } = useParams<{ id: string }>();
  const [location, setLocation] = useLocation();
  const { toast } = useToast();
  const [music, setMusic] = useState<SharedMusic | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // 공유된 음악 데이터 불러오기
    const fetchSharedMusic = async () => {
      try {
        setLoading(true);
        const response = await fetch(`/api/music/shared/${id}`);
        
        if (!response.ok) {
          if (response.status === 404) {
            throw new Error("음악을 찾을 수 없습니다.");
          } else if (response.status === 403) {
            throw new Error("이 음악은 공개되지 않았습니다.");
          } else {
            throw new Error("음악을 불러오는데 문제가 발생했습니다.");
          }
        }
        
        const data = await response.json();
        setMusic(data);
      } catch (error) {
        const message = error instanceof Error ? error.message : "알 수 없는 오류가 발생했습니다.";
        setError(message);
        toast({
          title: "음악 로드 오류",
          description: message,
          variant: "destructive"
        });
      } finally {
        setLoading(false);
      }
    };
    
    if (id) {
      fetchSharedMusic();
    }
  }, [id, toast]);
  
  const goBack = () => {
    // 브라우저 히스토리에 이전 페이지가 있으면 뒤로가기, 없으면 홈으로
    if (window.history.length > 1) {
      window.history.back();
    } else {
      setLocation("/");
    }
  };
  
  return (
    <div className="container max-w-4xl py-6 md:py-10">
      <Button 
        variant="ghost" 
        size="sm" 
        onClick={goBack}
        className="mb-4"
      >
        <ArrowLeft className="h-4 w-4 mr-2" />
        뒤로 가기
      </Button>
      
      <h1 className="text-2xl font-bold mb-6">공유된 음악</h1>
      
      {loading ? (
        <div className="flex justify-center items-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <span className="ml-2">음악을 불러오는 중...</span>
        </div>
      ) : error ? (
        <Card className="p-8 text-center">
          <CardContent>
            <p className="text-lg text-muted-foreground">{error}</p>
            <Button 
              variant="outline" 
              className="mt-4" 
              onClick={goBack}
            >
              뒤로 가기
            </Button>
          </CardContent>
        </Card>
      ) : music ? (
        <div>
          <MusicPlayer 
            music={{
              id: music.id,
              title: music.title,
              url: music.url,
              tags: Array.isArray(music.tags) ? music.tags : [],
              lyrics: music.lyrics,
              prompt: music.prompt,
              duration: music.duration
            }} 
            autoPlay={false}
          />
          
          <div className="mt-8 bg-muted p-6 rounded-lg">
            <h2 className="text-lg font-semibold mb-2">음악 소개</h2>
            <p className="text-muted-foreground">{music.prompt}</p>
            
            <div className="mt-6 text-xs text-muted-foreground">
              <p>이 음악은 CreateTree Culture Center에서 AI를 통해 생성되었습니다.</p>
              <p className="mt-1">생성일: {new Date(music.createdAt).toLocaleDateString('ko-KR', {
                year: 'numeric',
                month: 'long',
                day: 'numeric'
              })}</p>
            </div>
          </div>
          
          <div className="mt-6 flex justify-center">
            <Button onClick={() => setLocation("/music")}>
              나만의 음악 만들기
            </Button>
          </div>
        </div>
      ) : (
        <Card className="p-8 text-center">
          <CardContent>
            <p className="text-lg text-muted-foreground">음악을 찾을 수 없습니다.</p>
            <Button 
              variant="outline" 
              className="mt-4" 
              onClick={goBack}
            >
              뒤로 가기
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}