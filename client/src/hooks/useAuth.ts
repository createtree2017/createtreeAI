import * as React from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/useToast";
import { User } from "@shared/schema";

type LoginCredentials = {
  username: string;
  password: string;
};

type RegisterData = {
  username: string;
  password: string;
  email?: string;
  name?: string;
  phoneNumber?: string;
  birthdate?: string;
};

export function useAuth() {
  const { toast } = useToast();

  // 토큰 재발급 시도 상태 관리
  const [isRefreshing, setIsRefreshing] = React.useState(false);

  // 현재 로그인한 사용자 정보 가져오기
  const { 
    data: user, 
    isLoading, 
    error,
    refetch 
  } = useQuery<User | null>({
    queryKey: ["/api/auth/me"],
    queryFn: async (): Promise<User | null> => {
      try {
        // 로컬 스토리지에서 토큰 가져오기
        const token = localStorage.getItem("accessToken");
        if (!token) return null;

        const response = await fetch("/api/auth/me", {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (!response.ok) {
          if (response.status === 401 && !isRefreshing) {
            // 토큰이 만료된 경우 리프레시 시도
            setIsRefreshing(true);
            const refreshed = await refreshToken();
            setIsRefreshing(false);
            
            if (refreshed) {
              // 토큰 갱신 성공 시 새로운 요청 시도
              const newResponse = await fetch("/api/auth/me", {
                headers: {
                  Authorization: `Bearer ${localStorage.getItem("accessToken")}`,
                },
              });
              
              if (newResponse.ok) {
                return await newResponse.json();
              }
            }
            return null;
          }
          throw new Error("사용자 정보를 가져오는데 실패했습니다.");
        }

        return await response.json();
      } catch (error) {
        console.error("사용자 정보 조회 오류:", error);
        return null;
      }
    },
    retry: false,
  });

  // 토큰 갱신 함수
  const refreshToken = async (): Promise<boolean> => {
    try {
      const response = await fetch("/api/auth/refresh-token", {
        method: "POST",
        credentials: "include", // 쿠키 포함
      });

      if (!response.ok) {
        // 리프레시 토큰도 만료된 경우 로그아웃 처리
        localStorage.removeItem("accessToken");
        return false;
      }

      const data = await response.json();
      localStorage.setItem("accessToken", data.accessToken);
      return true;
    } catch (error) {
      console.error("토큰 갱신 오류:", error);
      return false;
    }
  };

  // 로그인 기능
  const login = useMutation({
    mutationFn: async (credentials: LoginCredentials) => {
      // 직접 fetch API 사용 (apiRequest 대신)
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(credentials),
        credentials: "include", // 쿠키 포함
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "로그인에 실패했습니다.");
      }

      const data = await response.json();
      return data;
    },
    onSuccess: (data) => {
      // 액세스 토큰 저장
      localStorage.setItem("accessToken", data.accessToken);
      
      // 사용자 정보 캐시 업데이트
      queryClient.setQueryData(["/api/auth/me"], data.user);
      
      toast({
        title: "로그인 성공",
        description: "환영합니다! 홈 페이지로 이동합니다.",
        variant: "default",
      });
      
      // 홈 페이지로 리디렉션 (1초 지연)
      setTimeout(() => {
        window.location.href = "/";
      }, 1000);
    },
    onError: (error: Error) => {
      toast({
        title: "로그인 실패",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // 회원가입 기능
  const register = useMutation({
    mutationFn: async (data: RegisterData) => {
      // fullName 필드로 매핑
      const serverData = {
        username: data.username,
        password: data.password,
        email: data.email || null,
        fullName: data.name || null,
        phoneNumber: data.phoneNumber || null,
        birthdate: data.birthdate || null,
        // memberType 명시적 지정 (Pro 회원으로 자동 설정)
        memberType: "membership"
      };
      
      console.log("회원가입 요청 데이터:", serverData);
      
      // 직접 fetch API 사용 (apiRequest 대신)
      const response = await fetch("/api/auth/register", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(serverData),
        credentials: "include", // 쿠키 포함
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error("회원가입 실패 응답:", errorData);
        throw new Error(errorData.message || "회원가입에 실패했습니다.");
      }

      return await response.json();
    },
    onSuccess: (data) => {
      // 액세스 토큰 저장
      localStorage.setItem("accessToken", data.accessToken);
      
      // 사용자 정보 캐시 업데이트
      queryClient.setQueryData(["/api/auth/me"], data.user);
      
      toast({
        title: "회원가입 성공",
        description: "환영합니다! 홈 페이지로 이동합니다.",
        variant: "default",
      });
      
      // 홈 페이지로 리디렉션 (1초 지연)
      setTimeout(() => {
        window.location.href = "/";
      }, 1000);
    },
    onError: (error: Error) => {
      toast({
        title: "회원가입 실패",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // 로그아웃 기능
  const logout = useMutation({
    mutationFn: async () => {
      const response = await fetch("/api/auth/logout", {
        method: "POST",
        credentials: "include", // 쿠키 포함
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "로그아웃에 실패했습니다.");
      }

      return await response.json();
    },
    onSuccess: () => {
      // 액세스 토큰 제거
      localStorage.removeItem("accessToken");
      
      // 사용자 정보 캐시 초기화
      queryClient.setQueryData(["/api/auth/me"], null);
      
      toast({
        title: "로그아웃 성공",
        description: "안녕히 가세요!",
        variant: "default",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "로그아웃 실패",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  return {
    user,
    isLoading,
    error,
    login: login.mutate,
    register: register.mutate,
    logout: logout.mutate,
    isLoginLoading: login.isPending,
    isRegisterLoading: register.isPending,
    isLogoutLoading: logout.isPending,
  };
}