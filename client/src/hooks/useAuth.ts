import * as React from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/useToast";
import { User } from "@shared/schema";
// Firebase 가져오기 - 기존 초기화된 인스턴스를 사용
import { auth as firebaseAuth, googleProvider } from "@/lib/firebase"; 
import { 
  signInWithPopup, 
  signInWithRedirect, 
  getRedirectResult, 
  GoogleAuthProvider 
} from "firebase/auth";

type LoginCredentials = {
  username: string;
  password: string;
};

type RegisterData = {
  username: string;
  password: string;
  email?: string;
  name?: string;
  phoneNumber: string;
  birthdate?: string;
  memberType: "general" | "membership";
  hospitalId?: string;
};

export function useAuth() {
  const { toast } = useToast();

  // 인증 상태 디버깅 로그
  console.log(`
===============================================================
[인증 상태 확인] - 클라이언트
- 현재 경로: ${window.location.pathname}
- 쿠키 존재: ${document.cookie ? 'Yes' : 'No'}
- 쿠키 내용: ${document.cookie}
- 로컬 스토리지 항목: ${Object.keys(localStorage).length}개
===============================================================
  `);
  
  // 현재 로그인한 사용자 정보 가져오기 (세션 기반)
  const { 
    data: user, 
    isLoading, 
    error,
    refetch 
  } = useQuery<User | null>({
    queryKey: ["/api/auth/me"],
    queryFn: async (): Promise<User | null> => {
      try {
        console.log("[인증 API 호출] /api/auth/me 요청 시작");
        
        // 세션 쿠키와 함께 요청
        const response = await fetch("/api/auth/me", {
          credentials: "include", // 쿠키 포함 (중요!)
        });

        console.log(`[인증 API 응답] 상태 코드: ${response.status}, 헤더:`, 
          Object.fromEntries([...response.headers.entries()].filter(([key]) => 
            ['content-type', 'set-cookie', 'date'].includes(key)
          ))
        );

        if (!response.ok) {
          if (response.status === 401) {
            console.log("[인증 API 응답] 로그인되지 않음 (401)");
            return null; // 로그인 되지 않음
          }
          throw new Error("사용자 정보를 가져오는데 실패했습니다.");
        }

        const userData = await response.json();
        // 디버깅을 위해 사용자 정보 로깅 (비밀번호는 제외)
        const { password, ...userInfo } = userData;
        console.log("[인증 API 성공] 사용자 정보:", userInfo);
        return userData;
      } catch (error) {
        console.error("[인증 API 오류] 사용자 정보 조회 실패:", error);
        return null;
      }
    },
    retry: false,
  });

  // 로그인 기능 (세션 기반)
  const login = useMutation({
    mutationFn: async (credentials: LoginCredentials) => {
      // 직접 fetch API 사용 (apiRequest 대신)
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(credentials),
        credentials: "include", // 쿠키 포함 (중요!)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "로그인에 실패했습니다.");
      }

      const data = await response.json();
      return data;
    },
    onSuccess: (data) => {
      // 세션 기반이므로 토큰 저장 불필요
      
      // 사용자 정보 캐시 업데이트
      queryClient.setQueryData(["/api/auth/me"], data.user);
      
      // 디버깅: 로그인 후 세션 쿠키 확인
      console.log("[로그인 성공] 현재 쿠키:", document.cookie);
      
      // 로그인 성공 후 세션 상태 검증을 위해 서버에 다시 요청
      fetch("/api/auth/me", { 
        credentials: "include" 
      })
      .then(res => {
        console.log("[로그인 검증] 상태:", res.status);
        return res.ok ? res.json() : null;
      })
      .then(userData => {
        console.log("[로그인 검증] 사용자 데이터:", userData);
      })
      .catch(err => {
        console.error("[로그인 검증] 오류:", err);
      });
      
      toast({
        title: "로그인 성공",
        description: "환영합니다!",
        variant: "default",
      });
      
      // 현재 페이지가 로그인/회원가입 페이지인 경우만 홈 페이지로 리디렉션
      const currentPath = window.location.pathname;
      if (currentPath === '/login' || currentPath === '/register' || currentPath === '/auth') {
        // 홈 페이지로 리디렉션 (1초 지연)
        setTimeout(() => {
          window.location.href = "/";
        }, 1000);
      }
    },
    onError: (error: Error) => {
      toast({
        title: "로그인 실패",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // 회원가입 기능 (세션 기반)
  const register = useMutation({
    mutationFn: async (data: RegisterData) => {
      // fullName 필드로 매핑
      const serverData = {
        username: data.username,
        password: data.password,
        email: data.email || null,
        fullName: data.name || null,
        phoneNumber: data.phoneNumber,
        birthdate: data.birthdate || null,
        memberType: data.memberType,
        hospitalId: data.memberType === "membership" && data.hospitalId 
          ? parseInt(data.hospitalId, 10) // 문자열을 숫자로 변환
          : null
      };
      
      console.log("회원가입 요청 데이터:", serverData);
      
      // 직접 fetch API 사용 (apiRequest 대신)
      const response = await fetch("/api/auth/register", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include", // 쿠키 전송을 위해 필수
        body: JSON.stringify(serverData)
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error("회원가입 실패 응답:", errorData);
        throw new Error(errorData.message || "회원가입에 실패했습니다.");
      }

      return await response.json();
    },
    onSuccess: (data) => {
      // 세션 기반이므로 토큰 저장 불필요
      
      // 사용자 정보 캐시 업데이트
      queryClient.setQueryData(["/api/auth/me"], data.user);
      
      toast({
        title: "회원가입 성공",
        description: "환영합니다!",
        variant: "default",
      });
      
      // 현재 페이지가 로그인/회원가입 페이지인 경우만 홈 페이지로 리디렉션
      const currentPath = window.location.pathname;
      if (currentPath === '/login' || currentPath === '/register' || currentPath === '/auth') {
        // 홈 페이지로 리디렉션 (1초 지연)
        setTimeout(() => {
          window.location.href = "/";
        }, 1000);
      }
    },
    onError: (error: Error) => {
      toast({
        title: "회원가입 실패",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // 로그아웃 기능 (세션 기반)
  const logout = useMutation({
    mutationFn: async () => {
      const response = await fetch("/api/auth/logout", {
        method: "POST",
        credentials: "include", // 쿠키 포함 (중요!)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "로그아웃에 실패했습니다.");
      }

      return await response.json();
    },
    onSuccess: () => {
      // 세션 기반이므로 토큰 제거 불필요
      
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

  // Google 로그인 함수 - 단순화된 버전
  const loginWithGoogle = useMutation({
    mutationFn: async () => {
      try {
        console.log("[Google 로그인] 시작");
        
        // Firebase Auth 인스턴스 확인
        if (!firebaseAuth) {
          throw new Error("Firebase Auth가 초기화되지 않았습니다. 페이지를 새로고침 후 다시 시도해 주세요.");
        }
        
        // 기기 환경 감지 (모바일 vs 데스크탑)
        const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
        
        // 로그인 방식 선택 (모바일은 리디렉션, 데스크탑은 팝업)
        if (isMobile) {
          console.log("[Google 로그인] 모바일 환경 감지됨, 리디렉션 방식 사용");
          
          // 모바일에서는 리디렉션 방식으로 인증 시도
          try {
            // 리디렉션 전에 진행 상태 저장
            localStorage.setItem('auth_redirect_started', 'true');
            localStorage.setItem('auth_redirect_time', Date.now().toString());
            
            // 리디렉션 방식으로 로그인
            await signInWithRedirect(firebaseAuth, googleProvider);
            console.log("[Google 로그인] 리디렉션 로그인 시작됨");
            
            // 리디렉션되므로 이 이후 코드는 실행되지 않음
            return { redirected: true };
          } catch (redirectError) {
            console.error("[Google 로그인] 리디렉션 시작 오류:", redirectError);
            throw new Error("Google 로그인을 시작할 수 없습니다: " + 
              (redirectError instanceof Error ? redirectError.message : "알 수 없는 오류"));
          }
        } else {
          // 데스크탑에서는 팝업 방식 사용
          console.log("[Google 로그인] 데스크탑 환경, 팝업 방식 사용");
          
          // 팝업으로 로그인 시도
          const result = await signInWithPopup(firebaseAuth, googleProvider);
          const user = result.user;
          
          if (!user) {
            throw new Error("로그인은 성공했으나 사용자 정보를 가져올 수 없습니다.");
          }
          
          // 사용자 정보 로깅 (개인정보 일부 마스킹)
          console.log("[Google 로그인] 팝업 로그인 성공, 사용자:", {
            email: user.email ? user.email.substring(0, 3) + "..." : "없음",
            name: user.displayName || "이름 없음", 
            uid: user.uid ? user.uid.substring(0, 5) + "..." : "없음"
          });
          
          // 서버에 Firebase 사용자 정보 전송
          const userData = {
            uid: user.uid,
            email: user.email || "",
            displayName: user.displayName || ""
          };
          
          // 서버 인증 API 호출
          console.log("[Google 로그인] 서버 인증 요청 중...");
          const response = await fetch("/api/auth/firebase-login", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ user: userData }),
            credentials: "include"  // 쿠키 포함 (세션 인증에 필요)
          });
          
          if (!response.ok) {
            const errorText = await response.text();
            console.error("[Google 로그인] 서버 인증 실패:", response.status, errorText);
            throw new Error("서버 인증에 실패했습니다: " + 
              (errorText || `상태 코드 ${response.status}`));
          }
          
          // 응답 처리
          const data = await response.json();
          console.log("[Google 로그인] 서버 인증 성공:", data);
          return data;
        }
      } catch (error: any) {
        // 오류 로깅
        console.error("[Google 로그인] 오류 발생:", error);
        
        // Firebase 인증 에러 처리
        if (error.code) {
          switch(error.code) {
            case 'auth/popup-closed-by-user':
              throw new Error("로그인 창이 사용자에 의해 닫혔습니다");
            case 'auth/popup-blocked':
              throw new Error("팝업이 브라우저에 의해 차단되었습니다");
            case 'auth/unauthorized-domain':
              throw new Error("현재 도메인이 Firebase에 등록되지 않았습니다");
            default:
              throw new Error(`Google 로그인 오류: ${error.message || error.code}`);
          }
        }
        
        // 일반적인 오류
        throw new Error(error.message || "Google 로그인 중 오류가 발생했습니다");
      }
    },
    onSuccess: (data) => {
      // 사용자 정보 캐시 업데이트
      queryClient.setQueryData(["/api/auth/me"], data.user);
      
      toast({
        title: "Google 로그인 성공",
        description: "환영합니다!",
        variant: "default",
      });
      
      // 현재 페이지가 로그인/회원가입 페이지인 경우만 홈 페이지로 리디렉션
      const currentPath = window.location.pathname;
      if (currentPath === '/login' || currentPath === '/register' || currentPath === '/auth') {
        // 홈 페이지로 리디렉션 (1초 지연)
        setTimeout(() => {
          window.location.href = "/";
        }, 1000);
      }
    },
    onError: (error: Error) => {
      toast({
        title: "Google 로그인 실패",
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
    loginWithGoogle: loginWithGoogle.mutate,
    isLoginLoading: login.isPending,
    isRegisterLoading: register.isPending,
    isLogoutLoading: logout.isPending,
    isGoogleLoginLoading: loginWithGoogle.isPending,
  };
}