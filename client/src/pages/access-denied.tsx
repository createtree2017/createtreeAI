import { Button } from "@/components/ui/button";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { ShieldAlert, Home } from "lucide-react";
import { useLocation } from "wouter";

/**
 * 접근 거부 페이지
 * 
 * 권한이 없는 사용자가 특정 페이지에 접근하려고 할 때 보여주는 페이지입니다.
 */
export default function AccessDenied() {
  const [, setLocation] = useLocation();

  return (
    <div className="container py-8 max-w-3xl mx-auto">
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center">
        <ShieldAlert className="w-20 h-20 text-destructive mb-6" />
        
        <h1 className="text-3xl font-bold mb-2">접근 권한이 없습니다</h1>
        <p className="text-muted-foreground mb-6">
          요청하신 페이지에 접근할 수 있는 권한이 없습니다.
        </p>
        
        <Alert variant="destructive" className="mb-6 max-w-md">
          <AlertTitle>접근 거부</AlertTitle>
          <AlertDescription>
            이 작업을 수행하려면 필요한 권한이 없습니다. 메인 페이지로 돌아가거나 관리자에게 문의하세요.
          </AlertDescription>
        </Alert>
        
        <div className="flex flex-wrap gap-4 justify-center">
          <Button 
            onClick={() => setLocation("/")}
            className="flex items-center gap-2"
          >
            <Home className="w-4 h-4" />
            홈으로 이동
          </Button>
          
          <Button 
            variant="outline" 
            onClick={() => window.history.back()}
          >
            이전 페이지로 돌아가기
          </Button>
        </div>
      </div>
    </div>
  );
}