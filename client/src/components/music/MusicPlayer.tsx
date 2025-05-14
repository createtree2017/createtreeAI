import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Play,
  Pause,
  SkipBack,
  Volume2,
  VolumeX,
  Download,
  Music2,
  Heart,
  Share2,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { formatTime } from "@/lib/utils";

interface MusicPlayerProps {
  music: {
    id: number;
    title: string;
    url: string;
    tags?: string[];
    lyrics?: string;
    prompt?: string;
    translatedPrompt?: string;
    duration?: number; // 음악 길이 (초)
  };
  onAddToFavorites?: (id: number) => void;
  onShare?: (id: number) => void;
  autoPlay?: boolean;
  className?: string;
}

export default function MusicPlayer({
  music,
  onAddToFavorites,
  onShare,
  autoPlay = false,
  className = "",
}: MusicPlayerProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [volume, setVolume] = useState(0.8); // 0-1 사이의 볼륨값
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  const [isLyricsVisible, setIsLyricsVisible] = useState(false);
  
  const audioRef = useRef<HTMLAudioElement>(null);
  const progressRef = useRef<HTMLDivElement>(null);
  
  // 음악이 변경되었을 때 초기화
  useEffect(() => {
    setCurrentTime(0);
    setIsPlaying(autoPlay);
    
    if (audioRef.current) {
      if (autoPlay) {
        audioRef.current.play().catch(err => {
          console.error("자동 재생 실패:", err);
          setIsPlaying(false);
        });
      }
    }
  }, [music.url, autoPlay]);
  
  // 오디오 이벤트 핸들러 등록
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    
    // 메타데이터 로드 완료
    const handleLoadedMetadata = () => {
      setDuration(audio.duration);
    };
    
    // 재생 시간 업데이트
    const handleTimeUpdate = () => {
      setCurrentTime(audio.currentTime);
    };
    
    // 재생 종료
    const handleEnded = () => {
      setIsPlaying(false);
      setCurrentTime(0);
      audio.currentTime = 0;
    };
    
    audio.addEventListener("loadedmetadata", handleLoadedMetadata);
    audio.addEventListener("timeupdate", handleTimeUpdate);
    audio.addEventListener("ended", handleEnded);
    
    return () => {
      audio.removeEventListener("loadedmetadata", handleLoadedMetadata);
      audio.removeEventListener("timeupdate", handleTimeUpdate);
      audio.removeEventListener("ended", handleEnded);
    };
  }, []);
  
  // 볼륨이나 음소거 상태가 변경되었을 때 오디오에 적용
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = isMuted ? 0 : volume;
    }
  }, [volume, isMuted]);
  
  // 재생/일시정지 토글
  const togglePlay = () => {
    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.pause();
      } else {
        audioRef.current.play().catch(err => {
          console.error("재생 실패:", err);
        });
      }
      setIsPlaying(!isPlaying);
    }
  };
  
  // 처음부터 다시 재생
  const restart = () => {
    if (audioRef.current) {
      audioRef.current.currentTime = 0;
      if (!isPlaying) {
        audioRef.current.play().catch(err => {
          console.error("재생 실패:", err);
        });
        setIsPlaying(true);
      }
    }
  };
  
  // 볼륨 조절
  const handleVolumeChange = (newVolume: number[]) => {
    const volumeValue = newVolume[0];
    setVolume(volumeValue);
    if (volumeValue > 0 && isMuted) {
      setIsMuted(false);
    }
  };
  
  // 음소거 토글
  const toggleMute = () => {
    setIsMuted(!isMuted);
  };
  
  // 시간 조절 (seek)
  const handleSeek = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!progressRef.current || !audioRef.current) return;
    
    const progressRect = progressRef.current.getBoundingClientRect();
    const seekPosition = (e.clientX - progressRect.left) / progressRect.width;
    const seekTime = seekPosition * duration;
    
    audioRef.current.currentTime = seekTime;
    setCurrentTime(seekTime);
  };
  
  // 음악 다운로드
  const handleDownload = async () => {
    if (!music.id) return;
    
    try {
      // API로 다운로드 요청
      const response = await fetch(`/api/music/${music.id}/download`, {
        method: 'GET',
        credentials: 'include'
      });
      
      if (!response.ok) {
        throw new Error(`다운로드 실패: ${response.status}`);
      }
      
      // 파일 다운로드 처리
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${music.title || '음악'}.mp3`;
      document.body.appendChild(link);
      link.click();
      
      // 리소스 정리
      setTimeout(() => {
        window.URL.revokeObjectURL(url);
        document.body.removeChild(link);
      }, 100);
    } catch (error) {
      console.error('음악 다운로드 오류:', error);
      // 직접 URL 다운로드로 폴백 (API 실패 시)
      if (music.url) {
        const link = document.createElement('a');
        link.href = music.url;
        link.download = `${music.title || '음악'}.mp3`;
        link.target = '_blank';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      }
    }
  };
  
  // 진행률 계산
  const progressPercent = duration > 0 ? (currentTime / duration) * 100 : 0;
  
  // 가사 토글
  const toggleLyrics = () => {
    setIsLyricsVisible(!isLyricsVisible);
  };
  
  return (
    <Card className={`w-full overflow-hidden ${className}`}>
      <CardHeader className="pb-4">
        <CardTitle className="text-xl flex items-center gap-2">
          <Music2 className="h-5 w-5" />
          {music.title || "음악 제목 없음"}
        </CardTitle>
        {music.prompt && (
          <CardDescription className="text-sm line-clamp-2">
            {music.prompt}
          </CardDescription>
        )}
        {music.tags && music.tags.length > 0 && (
          <div className="flex flex-wrap gap-2 mt-2">
            {music.tags.map((tag, index) => (
              <Badge key={index} variant="secondary" className="text-xs">
                {tag}
              </Badge>
            ))}
          </div>
        )}
      </CardHeader>
      
      <CardContent>
        <audio ref={audioRef} src={music.url} preload="metadata" />
        
        {/* 재생 진행 표시줄 */}
        <div 
          ref={progressRef}
          className="h-2 bg-secondary rounded-full overflow-hidden cursor-pointer mb-4" 
          onClick={handleSeek}
        >
          <div 
            className="h-full bg-primary transition-all"
            style={{ width: `${progressPercent}%` }}
          ></div>
        </div>
        
        {/* 시간 표시 및 컨트롤 */}
        <div className="flex items-center justify-between">
          <div className="text-sm text-muted-foreground">
            {formatTime(currentTime)} / {formatTime(duration || (music.duration || 0))}
          </div>
          
          <div className="flex items-center space-x-2">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="ghost" size="icon" onClick={restart}>
                    <SkipBack className="h-5 w-5" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>처음부터</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
            
            <Button 
              variant="default" 
              size="icon" 
              className="h-10 w-10 rounded-full" 
              onClick={togglePlay}
            >
              {isPlaying ? (
                <Pause className="h-5 w-5" />
              ) : (
                <Play className="h-5 w-5 ml-0.5" />
              )}
            </Button>
            
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="ghost" size="icon" onClick={toggleMute}>
                    {isMuted ? (
                      <VolumeX className="h-5 w-5" />
                    ) : (
                      <Volume2 className="h-5 w-5" />
                    )}
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>{isMuted ? "음소거 해제" : "음소거"}</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
            
            <div className="w-24">
              <Slider
                value={[isMuted ? 0 : volume]}
                min={0}
                max={1}
                step={0.01}
                onValueChange={handleVolumeChange}
              />
            </div>
          </div>
        </div>
        
        {/* 가사 섹션 */}
        {music.lyrics && (
          <div className="mt-6">
            <Button 
              variant="outline" 
              size="sm" 
              onClick={toggleLyrics} 
              className="w-full mb-2"
            >
              {isLyricsVisible ? "가사 숨기기" : "가사 보기"}
            </Button>
            
            {isLyricsVisible && (
              <div className="bg-muted p-4 rounded-md mt-2 text-sm whitespace-pre-line max-h-40 overflow-y-auto">
                {music.lyrics}
              </div>
            )}
          </div>
        )}
      </CardContent>
      
      <CardFooter className="flex justify-between pt-2">
        <div className="flex space-x-2">
          {onAddToFavorites && (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button 
                    variant="ghost" 
                    size="icon"
                    onClick={() => onAddToFavorites(music.id)}
                  >
                    <Heart className="h-5 w-5" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>즐겨찾기에 추가</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
          
          {onShare && (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button 
                    variant="ghost" 
                    size="icon"
                    onClick={() => onShare(music.id)}
                  >
                    <Share2 className="h-5 w-5" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>공유하기</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
        </div>
        
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button 
                variant="outline"
                size="sm"
                onClick={handleDownload}
                className="ml-auto"
              >
                <Download className="h-4 w-4 mr-1" />
                다운로드
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>MP3 파일 다운로드</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </CardFooter>
    </Card>
  );
}