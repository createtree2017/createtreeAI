import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { useToast } from "@/components/ui/use-toast";
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

  // 현재 로그인한 사용자 정보 가져오기
  const {
    data: user,
    isLoading,
    error,
    refetch,
  } = useQuery<User | null>({
    queryKey: ["/api/auth/me"],
    queryFn: async () => {
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
          if (response.status === 401) {
            // 토큰이 만료된 경우 리프레시 시도
            const refreshed = await refreshToken();
            if (refreshed) {
              // 토큰 갱신 성공 시 다시 시도
              return refetch();
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
        description: "환영합니다!",
        variant: "default",
      });
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
      const response = await fetch("/api/auth/register", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
        credentials: "include", // 쿠키 포함
      });

      if (!response.ok) {
        const errorData = await response.json();
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
        description: "환영합니다!",
        variant: "default",
      });
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