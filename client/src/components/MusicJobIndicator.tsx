import { useMusicJob } from "@/lib/MusicJobContext";
import { Music } from "lucide-react";
import { Link } from "wouter";

export function MusicJobIndicator() {
  const { status } = useMusicJob();
  
  // 작업이 진행 중이 아니면 표시하지 않음
  if (status !== 'pending' && status !== 'processing') return null;

  return (
    <Link to="/music" className="flex items-center gap-2 px-3 py-1.5 bg-primary/10 text-primary rounded-full animate-pulse">
      <Music className="h-4 w-4" />
      <span className="text-sm font-medium">음악 생성 중...</span>
    </Link>
  );
}