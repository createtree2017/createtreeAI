import * as React from "react";
import { createContext, useContext } from "react";
import { useAuth } from "@/hooks/useAuth";
import { User } from "@shared/schema";
import { Loader2 } from "lucide-react";
import { Redirect } from "wouter";

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  login: (credentials: { username: string; password: string }) => void;
  register: (data: {
    username: string;
    password: string;
    email?: string;
    name?: string;
    phoneNumber: string;
    birthdate?: string;
    memberType: "general" | "membership";
    hospitalId?: string;
  }) => void;
  logout: () => void;
  loginWithGoogle: () => void;
  isLoginLoading: boolean;
  isRegisterLoading: boolean;
  isLogoutLoading: boolean;
  isGoogleLoginLoading: boolean;
}

// Auth Context 생성
const AuthContext = createContext<AuthContextType | null>(null);

// AuthProvider 컴포넌트
export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const {
    user,
    isLoading,
    login,
    register,
    logout,
    loginWithGoogle,
    isLoginLoading,
    isRegisterLoading,
    isLogoutLoading,
    isGoogleLoginLoading,
  } = useAuth();

  // 모든 인증 로직은 useAuth 훅에서 처리됨
  return (
    <AuthContext.Provider
      value={{
        user: user || null, // null 타입 보장
        isLoading,
        login,
        register,
        logout,
        loginWithGoogle,
        isLoginLoading,
        isRegisterLoading,
        isLogoutLoading,
        isGoogleLoginLoading,
      }}
    >
      {isLoading ? (
        <div className="flex items-center justify-center min-h-screen">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : (
        children
      )}
    </AuthContext.Provider>
  );
};

// Auth Context 사용을 위한 Hook
export const useAuthContext = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuthContext must be used within an AuthProvider");
  }
  return context;
};

// Protected Route 컴포넌트 - 인증이 필요한 라우트를 감싸는 컴포넌트
export const ProtectedRoute: React.FC<{
  children: React.ReactNode;
  allowedRoles?: string[];
}> = ({ children, allowedRoles }) => {
  const { user, isLoading } = useAuthContext();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // 로그인되지 않은 경우 /auth로 리다이렉트
  if (!user) {
    return <Redirect to="/auth" />;
  }

  // 역할 확인이 필요한 경우
  if (allowedRoles && allowedRoles.length > 0) {
    // 사용자에게 필요한 역할이 없는 경우 (memberType을 확인)
    // superadmin은 모든 경로에 접근 가능
    if (user.memberType === 'superadmin') {
      // 슈퍼관리자는 모든 페이지 접근 가능
    } else if (!user.memberType || !allowedRoles.includes(user.memberType)) {
      // 권한 없음 페이지로 리다이렉션
      console.log('권한 부족:', user.memberType, '필요한 역할:', allowedRoles);
      return <Redirect to="/unauthorized" />;
    }
  }

  return <>{children}</>;
};