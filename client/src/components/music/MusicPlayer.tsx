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

// Simple MusicPlayer props for shared music page
interface SimpleMusicPlayerProps {
  src: string;
  title: string;
  duration?: number;
}

// Full MusicPlayer props
interface FullMusicPlayerProps {
  music: {
    id: number;
    title: string;
    url: string;
    tags?: string[];
    lyrics?: string;
    prompt?: string;
    translatedPrompt?: string;
    duration?: number;
  };
  onAddToFavorites?: (id: number) => void;
  onShare?: (id: number) => void;
  autoPlay?: boolean;
  className?: string;
}

// Simple player component for shared music page
export function MusicPlayer({ src, title, duration = 0 }: SimpleMusicPlayerProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [volume, setVolume] = useState(0.8);
  const [currentTime, setCurrentTime] = useState(0);
  const [actualDuration, setActualDuration] = useState(duration);
  const [isMuted, setIsMuted] = useState(false);
  
  const audioRef = useRef<HTMLAudioElement>(null);
  const progressRef = useRef<HTMLDivElement>(null);
  
  // Audio event handlers
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    
    const handleLoadedMetadata = () => {
      setActualDuration(audio.duration);
    };
    
    const handleTimeUpdate = () => {
      setCurrentTime(audio.currentTime);
    };
    
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
  
  // Apply volume changes
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = isMuted ? 0 : volume;
    }
  }, [volume, isMuted]);
  
  // Toggle play/pause
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
  
  // Restart from beginning
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
  
  // Volume control
  const handleVolumeChange = (newVolume: number[]) => {
    const volumeValue = newVolume[0];
    setVolume(volumeValue);
    if (volumeValue > 0 && isMuted) {
      setIsMuted(false);
    }
  };
  
  // Toggle mute
  const toggleMute = () => {
    setIsMuted(!isMuted);
  };
  
  // Seek to position
  const handleSeek = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!progressRef.current || !audioRef.current) return;
    
    const progressRect = progressRef.current.getBoundingClientRect();
    const seekPosition = (e.clientX - progressRect.left) / progressRect.width;
    const seekTime = seekPosition * actualDuration;
    
    audioRef.current.currentTime = seekTime;
    setCurrentTime(seekTime);
  };
  
  // Calculate progress percentage
  const progressPercent = actualDuration > 0 ? (currentTime / actualDuration) * 100 : 0;
  
  return (
    <Card className="w-full overflow-hidden">
      <CardHeader className="pb-2">
        <CardTitle className="text-lg flex items-center gap-2">
          <Music2 className="h-4 w-4" />
          {title || "음악 제목 없음"}
        </CardTitle>
      </CardHeader>
      
      <CardContent>
        <audio 
          ref={audioRef} 
          src={src.startsWith('/uploads/') ? `/api/music-file/${src.split('/').pop()}` : src} 
          preload="metadata" 
          crossOrigin="anonymous" 
        />
        
        {/* Progress bar */}
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
        
        {/* Time display and controls */}
        <div className="flex items-center justify-between">
          <div className="text-sm text-muted-foreground">
            {formatTime(currentTime)} / {formatTime(actualDuration)}
          </div>
          
          <div className="flex items-center space-x-2">
            <Button variant="ghost" size="icon" onClick={restart}>
              <SkipBack className="h-4 w-4" />
            </Button>
            
            <Button 
              variant="default" 
              size="icon" 
              className="h-8 w-8 rounded-full" 
              onClick={togglePlay}
            >
              {isPlaying ? (
                <Pause className="h-4 w-4" />
              ) : (
                <Play className="h-4 w-4 ml-0.5" />
              )}
            </Button>
            
            <Button variant="ghost" size="icon" onClick={toggleMute}>
              {isMuted ? (
                <VolumeX className="h-4 w-4" />
              ) : (
                <Volume2 className="h-4 w-4" />
              )}
            </Button>
            
            <div className="w-20">
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
      </CardContent>
    </Card>
  );
}

// Full-featured music player (default export)
export default function FullMusicPlayer({
  music,
  onAddToFavorites,
  onShare,
  autoPlay = false,
  className = "",
}: FullMusicPlayerProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [volume, setVolume] = useState(0.8);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  const [isLyricsVisible, setIsLyricsVisible] = useState(false);
  
  const audioRef = useRef<HTMLAudioElement>(null);
  const progressRef = useRef<HTMLDivElement>(null);
  
  // Reset when music changes
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
  
  // Register audio event handlers
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    
    const handleLoadedMetadata = () => {
      setDuration(audio.duration);
    };
    
    const handleTimeUpdate = () => {
      setCurrentTime(audio.currentTime);
    };
    
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
  
  // Apply volume changes
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = isMuted ? 0 : volume;
    }
  }, [volume, isMuted]);
  
  // Toggle play/pause
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
  
  // Restart from beginning
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
  
  // Volume control
  const handleVolumeChange = (newVolume: number[]) => {
    const volumeValue = newVolume[0];
    setVolume(volumeValue);
    if (volumeValue > 0 && isMuted) {
      setIsMuted(false);
    }
  };
  
  // Toggle mute
  const toggleMute = () => {
    setIsMuted(!isMuted);
  };
  
  // Seek to position
  const handleSeek = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!progressRef.current || !audioRef.current) return;
    
    const progressRect = progressRef.current.getBoundingClientRect();
    const seekPosition = (e.clientX - progressRect.left) / progressRect.width;
    const seekTime = seekPosition * duration;
    
    audioRef.current.currentTime = seekTime;
    setCurrentTime(seekTime);
  };
  
  // Download music
  const handleDownload = async () => {
    if (!music.id) return;
    
    try {
      // Request download from API
      const response = await fetch(`/api/music/${music.id}/download`, {
        method: 'GET',
        credentials: 'include'
      });
      
      if (!response.ok) {
        throw new Error(`다운로드 실패: ${response.status}`);
      }
      
      // Process file download
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${music.title || '음악'}.mp3`;
      document.body.appendChild(link);
      link.click();
      
      // Clean up resources
      setTimeout(() => {
        window.URL.revokeObjectURL(url);
        document.body.removeChild(link);
      }, 100);
    } catch (error) {
      console.error('음악 다운로드 오류:', error);
      // Fallback to direct URL download (if API fails)
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
  
  // Calculate progress percentage
  const progressPercent = duration > 0 ? (currentTime / duration) * 100 : 0;
  
  // Toggle lyrics display
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
        <audio 
          ref={audioRef} 
          src={music.url.startsWith('/uploads/') ? `/api/music-file/${music.url.split('/').pop()}` : music.url} 
          preload="metadata" 
          crossOrigin="anonymous" 
        />
        
        {/* Progress bar */}
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
        
        {/* Time display and controls */}
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
        
        {/* Lyrics section */}
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
                className="ml-auto flex-shrink-0" 
              >
                <Download className="h-4 w-4 mr-1" />
                <span className="whitespace-nowrap">다운로드</span>
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