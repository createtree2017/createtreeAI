import { createContext, useContext, ReactNode } from "react";
import { useAuth as useAuthHook } from "@/hooks/useAuth";

// 인증 컨텍스트 타입 정의
type AuthContextType = ReturnType<typeof useAuthHook> | null;

// 인증 컨텍스트 생성
const AuthContext = createContext<AuthContextType>(null);

// 인증 Provider 컴포넌트
export function AuthProvider({ children }: { children: ReactNode }) {
  const auth = useAuthHook();
  
  return <AuthContext.Provider value={auth}>{children}</AuthContext.Provider>;
}

// 인증 컨텍스트 사용을 위한 훅
export function useAuth() {
  const context = useContext(AuthContext);
  
  if (!context) {
    throw new Error("useAuth는 AuthProvider 내부에서만 사용할 수 있습니다.");
  }
  
  return context;
}

// 보호된 라우트를 위한 컴포넌트
export function ProtectedRoute({ 
  children, 
  redirectTo = "/auth",
  allowRoles = [],
}: { 
  children: ReactNode, 
  redirectTo?: string,
  allowRoles?: string[],
}) {
  const { user, isLoading } = useAuth();
  
  // 로딩 중인 경우 로딩 표시
  if (isLoading) {
    return <div>로딩 중...</div>;
  }
  
  // 로그인이 되어있지 않은 경우 로그인 페이지로 리디렉션
  if (!user) {
    window.location.href = redirectTo;
    return null;
  }
  
  // 역할 기반 접근 제어
  if (allowRoles.length > 0) {
    const userRoles = user.roles || [];
    const hasRequiredRole = allowRoles.some((role) => userRoles.includes(role));
    
    if (!hasRequiredRole) {
      window.location.href = "/"; // 권한이 없는 경우 홈으로 리디렉션
      return null;
    }
  }
  
  return <>{children}</>;
}