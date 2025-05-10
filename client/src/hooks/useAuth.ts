import * as React from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/useToast";
import { User } from "@shared/schema";
// Firebase 가져오기 - 기존 초기화된 인스턴스를 사용
import { auth as firebaseAuth, googleProvider } from "@/lib/firebase"; 
import { signInWithPopup, signInWithRedirect, getRedirectResult, GoogleAuthProvider } from "firebase/auth";

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
        // 세션 쿠키와 함께 요청
        const response = await fetch("/api/auth/me", {
          credentials: "include", // 쿠키 포함 (중요!)
        });

        if (!response.ok) {
          if (response.status === 401) {
            return null; // 로그인 되지 않음
          }
          throw new Error("사용자 정보를 가져오는데 실패했습니다.");
        }

        const userData = await response.json();
        // 디버깅을 위해 사용자 정보 로깅 (비밀번호는 제외)
        const { password, ...userInfo } = userData;
        console.log("직접 요청으로 가져온 사용자 정보:", userInfo);
        return userData;
      } catch (error) {
        console.error("사용자 정보 조회 오류:", error);
        return null;
      }
    },
    retry: false,
  });

  // 세션 기반이므로 토큰 갱신 함수 불필요

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
        body: JSON.stringify(serverData),
        credentials: "include", // 쿠키 포함 (중요!)
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

  // Google 로그인 함수 - 리디렉션 방식으로 변경
  const loginWithGoogle = useMutation({
    mutationFn: async () => {
      try {
        console.log("[Google 로그인] 시작");
        console.log("[Google 로그인] firebaseAuth 인스턴스 확인:", firebaseAuth ? "존재함" : "존재하지 않음");
        console.log("[Google 로그인] 현재 도메인:", window.location.origin);
        
        // 기존 초기화된 Firebase Auth 인스턴스 사용
        if (!firebaseAuth) {
          throw new Error("Firebase Auth가 초기화되지 않았습니다. 페이지를 새로고침 후 다시 시도해 주세요.");
        }
        
        // 이미 리디렉션 결과가 있는지 확인
        const redirectResult = await getRedirectResult(firebaseAuth);
        
        // 리디렉션 결과가 있으면 처리
        if (redirectResult && redirectResult.user) {
          console.log("[Google 로그인] 리디렉션 결과 처리 중");
          const firebaseUser = redirectResult.user;
          
          // 디버깅을 위한 사용자 정보 로깅 (민감한 정보는 마스킹)
          console.log("[Google 로그인] 사용자 정보:", {
            displayName: firebaseUser.displayName,
            email: firebaseUser.email,
            uid: firebaseUser.uid.substring(0, 5) + "...",
            isEmailVerified: firebaseUser.emailVerified
          });
          
          // 서버에 전송할 사용자 데이터 준비
          const userData = {
            uid: firebaseUser.uid,
            email: firebaseUser.email || "",
            displayName: firebaseUser.displayName || "",
            photoURL: firebaseUser.photoURL || "",
            phoneNumber: firebaseUser.phoneNumber || ""
          };
          
          // 서버로 Firebase 사용자 정보 전송
          console.log("[Google 로그인] 서버에 인증 정보 전송 중");
          const response = await fetch("/api/auth/firebase-login", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ user: userData }),
            credentials: "include"
          });
          
          // 서버 응답 확인
          if (!response.ok) {
            const errorText = await response.text();
            console.error("[Google 로그인] 서버 인증 실패:", errorText);
            throw new Error(`서버 인증 실패: ${response.status} ${errorText}`);
          }
          
          // 성공 응답 처리
          const data = await response.json();
          console.log("[Google 로그인] 서버 인증 성공:", data);
          return data;
        } else {
          console.log("[Google 로그인] 리디렉션 방식으로 로그인 시도");
          // 리디렉션 방식으로 로그인 시도 - 로그인 후 현재 페이지로 돌아옴
          await signInWithRedirect(firebaseAuth, googleProvider);
          
          // 이 부분은 리디렉션 전에 실행됨 - 리디렉션 후에는 페이지가 새로고침됨
          return { user: null, message: "리디렉션 중..." };
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
              throw new Error("팝업이 브라우저에 의해 차단되었습니다. 리디렉션 방식으로 다시 시도합니다.");
            case 'auth/api-key-not-valid':
            case 'auth/invalid-api-key':
              throw new Error("Firebase API 키가 유효하지 않습니다. 관리자에게 문의해주세요");
            case 'auth/unauthorized-domain':
            case 'auth/domain-not-authorized':
              throw new Error(`현재 사이트(${window.location.origin})에서는 Google 로그인이 지원되지 않습니다. 관리자에게 문의해주세요`);
            default:
              throw new Error(`Google 로그인 실패: [${error.code}] ${error.message}`);
          }
        }
        
        // 기본 오류 메시지
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