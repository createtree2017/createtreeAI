import { useMusicProcessing } from "@/lib/MusicProcessingState";
import { Music } from "lucide-react";
import { Link } from "wouter";

export function MusicProcessingIndicator() {
  const { isGenerating } = useMusicProcessing();

  if (!isGenerating) return null;

  return (
    <Link to="/music" className="flex items-center gap-2 px-3 py-1.5 bg-primary/10 text-primary rounded-full animate-pulse">
      <Music className="h-4 w-4" />
      <span className="text-sm font-medium">음악 생성 중...</span>
    </Link>
  );
}