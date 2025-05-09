import React, { createContext, useContext, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { User } from "@shared/schema";
import { Loader2 } from "lucide-react";

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  login: (credentials: { username: string; password: string }) => void;
  register: (data: {
    username: string;
    password: string;
    email?: string;
    name?: string;
    phoneNumber?: string;
    birthdate?: string;
  }) => void;
  logout: () => void;
  isLoginLoading: boolean;
  isRegisterLoading: boolean;
  isLogoutLoading: boolean;
}

const AuthContext = createContext<AuthContextType | null>(null);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const {
    user,
    isLoading,
    login,
    register,
    logout,
    isLoginLoading,
    isRegisterLoading,
    isLogoutLoading,
  } = useAuth();

  // 모든 인증 로직은 useAuth 훅에서 처리됨
  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        login,
        register,
        logout,
        isLoginLoading,
        isRegisterLoading,
        isLogoutLoading,
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

export const useAuthContext = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuthContext must be used within an AuthProvider");
  }
  return context;
};

// Protected Route 컴포넌트
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

  // 로그인되지 않은 경우
  if (!user) {
    window.location.href = "/auth";
    return null;
  }

  // 역할 확인이 필요한 경우
  if (allowedRoles && allowedRoles.length > 0) {
    // 사용자에게 필요한 역할이 없는 경우 (memberType을 확인)
    if (!user.memberType || !allowedRoles.includes(user.memberType)) {
      // 권한 없음 페이지로 리디렉션
      window.location.href = "/unauthorized";
      return null;
    }
  }

  return <>{children}</>;
};