import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { ShieldAlert } from "lucide-react";

export default function AccessDenied() {
  const { user } = useAuth();

  return (
    <div className="container mx-auto px-4 py-16 text-center">
      <div className="flex justify-center mb-6">
        <ShieldAlert className="h-24 w-24 text-destructive" />
      </div>
      <h1 className="text-2xl font-bold mb-4">접근 권한이 없습니다</h1>
      <p className="text-muted-foreground mb-8">
        이 페이지에 접근할 수 있는 권한이 없습니다.
      </p>
      {user?.memberType === 'hospital_admin' && (
        <Link to="/hospital/campaigns">
          <Button>병원 캠페인 목록으로 돌아가기</Button>
        </Link>
      )}
      {user?.memberType === 'admin' || user?.memberType === 'superadmin' ? (
        <Link to="/admin">
          <Button>관리자 페이지로 돌아가기</Button>
        </Link>
      ) : (
        <Link to="/">
          <Button>홈으로 돌아가기</Button>
        </Link>
      )}
    </div>
  );
}