import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Download, Share2, Play, Pause } from "lucide-react";

interface AudioPlayerProps {
  src: string;
  title: string;
  duration: number;
  style?: string;
  onDownload?: () => void;
  onShare?: () => void;
}

export function AudioPlayer({
  src,
  title,
  duration,
  style = "",
  onDownload,
  onShare,
}: AudioPlayerProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Format time in MM:SS format
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  useEffect(() => {
    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.play().catch(err => {
          console.error("Audio playback error:", err);
          setIsPlaying(false);
        });
      } else {
        audioRef.current.pause();
      }
    }
  }, [isPlaying]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const handleTimeUpdate = () => {
      setCurrentTime(audio.currentTime);
    };

    const handleEnded = () => {
      setIsPlaying(false);
      setCurrentTime(0);
    };

    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('ended', handleEnded);

    return () => {
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      audio.removeEventListener('ended', handleEnded);
    };
  }, []);

  const togglePlayback = () => {
    setIsPlaying(!isPlaying);
  };

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;

  return (
    <div className="bg-white rounded-xl p-5 shadow-soft border border-neutral-light">
      <audio ref={audioRef} src={src} preload="metadata" />
      
      <div className="mb-4 text-center">
        <div className="w-16 h-16 bg-primary-light rounded-full flex items-center justify-center mx-auto mb-2">
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-primary-dark">
            <path d="M9 18V5l12-2v13" />
            <circle cx="6" cy="18" r="3" />
            <circle cx="18" cy="16" r="3" />
          </svg>
        </div>
        <h4 className="font-heading font-medium">{title}</h4>
        <p className="text-sm text-neutral-dark">{formatTime(duration)} • {style}</p>
      </div>
      
      <div className="bg-neutral-lightest rounded-lg p-3 mb-4">
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <div className="h-3 bg-primary-light rounded-full relative">
              <div className="absolute h-full bg-primary rounded-full" style={{ width: `${progress}%` }}></div>
            </div>
            <div className="flex justify-between mt-1 text-xs text-neutral-dark">
              <span>{formatTime(currentTime)}</span>
              <span>{formatTime(duration)}</span>
            </div>
          </div>
          <button 
            className="ml-4 w-10 h-10 bg-primary rounded-full flex items-center justify-center text-white shadow-sm hover:bg-primary-dark transition-colors"
            onClick={togglePlayback}
          >
            {isPlaying ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5" />}
          </button>
        </div>
      </div>
      
      <div className="flex space-x-3">
        <Button
          className="flex-1 bg-neutral-light hover:bg-neutral text-neutral-darkest font-medium py-2.5 px-4 rounded-lg transition-colors"
          onClick={onDownload}
        >
          <Download className="mr-2 h-4 w-4" />
          <span>Download</span>
        </Button>
        <Button
          className="flex-1 bg-secondary hover:bg-secondary-dark text-white font-medium py-2.5 px-4 rounded-lg transition-colors"
          onClick={onShare}
        >
          <Share2 className="mr-2 h-4 w-4" />
          <span>Share</span>
        </Button>
      </div>
    </div>
  );
}

export default AudioPlayer;
