import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";

export default function ClearStorage() {
  const { toast } = useToast();
  const [_, navigate] = useLocation();

  const clearLocalStorage = () => {
    // 작업 관련 로컬 스토리지 항목 지우기
    localStorage.removeItem("music_job_id");
    localStorage.removeItem("music_form_data");
    
    // 서버 시작 시간 초기화
    localStorage.removeItem("server_start_time");
    
    // 알림
    toast({
      title: "저장소 초기화 완료",
      description: "로컬 스토리지가 초기화되었습니다. 음악 생성 페이지로 이동합니다.",
    });
    
    // 음악 생성 페이지로 이동
    setTimeout(() => {
      navigate("/lullaby");
    }, 1000);
  };

  return (
    <div className="container py-8">
      <Card className="max-w-lg mx-auto">
        <CardHeader>
          <CardTitle className="text-center">로컬 스토리지 초기화</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-muted-foreground">
            음악 생성 작업이 지속될 경우 브라우저의 로컬 스토리지를 초기화하세요.
            작업 상태와 관련된 모든 데이터가 삭제됩니다.
          </p>
          <div className="flex justify-center">
            <Button onClick={clearLocalStorage} variant="destructive">
              초기화하고 음악 생성 페이지로 이동
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}