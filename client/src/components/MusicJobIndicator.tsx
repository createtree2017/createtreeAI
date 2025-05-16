import { useMusicJob } from "@/lib/MusicJobContext";
import { Music, X } from "lucide-react";
import { Link } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";

export function MusicJobIndicator() {
  const { status, jobId, clearJob } = useMusicJob();
  const { toast } = useToast();
  
  // 작업이 진행 중이 아니면 표시하지 않음
  if (status !== 'pending' && status !== 'processing') return null;

  // 작업 취소 및 로컬 스토리지 초기화 
  const handleCancel = async (e: React.MouseEvent) => {
    e.preventDefault(); // 링크 클릭 이벤트 중지
    e.stopPropagation();
    
    try {
      // 로컬 스토리지에서 작업 정보 제거
      localStorage.removeItem("music_job_id");
      localStorage.removeItem("music_form_data");
      localStorage.removeItem("server_start_time");
      
      // 서버에 취소 요청 (작업 ID가 있는 경우)
      if (jobId) {
        const response = await fetch(`/api/music-jobs/${jobId}/cancel`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          }
        });
        
        if (response.ok) {
          clearJob();
          toast({
            title: "작업 취소됨",
            description: "음악 생성 작업이 취소되었습니다."
          });
        } else {
          console.error("서버에서 작업 취소 실패:", await response.text());
          // 서버 응답과 상관없이 클라이언트에서는 작업 정보 초기화
          clearJob();
          toast({
            title: "작업 초기화됨",
            description: "음악 생성 작업 상태가 초기화되었습니다."
          });
        }
      } else {
        // 작업 ID가 없는 경우 클라이언트 상태만 초기화
        clearJob();
        toast({
          title: "작업 초기화됨",
          description: "음악 생성 작업 상태가 초기화되었습니다."
        });
      }
    } catch (error) {
      console.error("작업 취소 중 오류:", error);
      // 오류가 발생해도 클라이언트 상태 초기화
      clearJob();
      toast({
        title: "작업 초기화됨",
        description: "음악 생성 작업 상태가 초기화되었습니다. 오류가 발생했습니다."
      });
    }
  };

  return (
    <div className="flex items-center">
      <Link to="/music" className="flex items-center gap-2 px-3 py-1.5 bg-primary/10 text-primary rounded-l-full animate-pulse">
        <Music className="h-4 w-4" />
        <span className="text-sm font-medium">음악 생성 중...</span>
      </Link>
      <Button 
        variant="destructive"
        size="sm"
        className="rounded-l-none rounded-r-full h-8 px-2 py-0 flex items-center"
        onClick={handleCancel}
        title="작업 취소"
      >
        <X className="h-4 w-4" />
      </Button>
    </div>
  );
}