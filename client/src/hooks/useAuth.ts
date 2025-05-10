import * as React from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/useToast";
import { User } from "@shared/schema";
import { auth, googleProvider } from "@/lib/firebase";
import { 
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
  GoogleAuthProvider,
  User as FirebaseUser,
  Auth,
  AuthProvider,
  getAuth
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

  // Google 로그인 함수
  const loginWithGoogle = useMutation({
    mutationFn: async () => {
      try {
        console.log("Google 로그인 시작...");
        
        // Firebase 설정 정보 확인
        console.log("Firebase 설정 정보:", {
          apiKey: "스크린샷에서 확인한 API 키 사용 중",
          authDomain: "createai-7facc.firebaseapp.com"
        });
        
        // Firebase 초기화 여부 확인
        if (!auth || !googleProvider) {
          console.error("Firebase가 초기화되지 않았습니다.");
          throw new Error("Firebase 설정이 올바르지 않습니다.");
        }
        
        console.log("Firebase 초기화 확인 완료");
        console.log("현재 도메인:", window.location.origin);
        console.log("Firebase Google 로그인 팝업 시도...");
        
        // 현재 위치가 Firebase에 등록된 도메인인지 확인
        const currentDomain = window.location.origin;
        console.log(`도메인 확인: '${currentDomain}'가 Firebase 인증에 등록되어 있어야 합니다.`);
        console.log("승인된 도메인은 Firebase 콘솔 > 인증 > 설정 > 승인된 도메인에서 확인할 수 있습니다.");
        
        // 리디렉션 방식으로 로그인
        try {
          console.log("Google 로그인 리디렉션 방식 시도 중...");
          
          // 리디렉션 결과가 있는지 먼저 확인
          const auth2 = getAuth();
          const redirectResult = await getRedirectResult(auth2);
          
          // 리디렉션 완료 후 돌아온 경우
          if (redirectResult && redirectResult.user) {
            console.log("🎉 Google 리디렉션 로그인 성공!");
            const firebaseUser = redirectResult.user;
          }
          // 첫 시도인 경우 리디렉션 시작
          else {
            console.log("Google 로그인 리디렉션 시작...");
            await signInWithRedirect(auth, googleProvider);
            return {}; // 리디렉션 중이므로 여기서 종료
          }
          
          // 아래 코드는 팝업 방식을 백업으로 유지
          console.log("리디렉션 실패, 팝업 방식으로 시도...");
          const result = await signInWithPopup(auth, googleProvider);
          
          console.log("Google 로그인 성공!");
          
          // Google 계정 정보 확인
          const credential = GoogleAuthProvider.credentialFromResult(result);
          const token = credential?.accessToken;
          const firebaseUser = result.user;
          
          if (!firebaseUser || !firebaseUser.email) {
            throw new Error("Google 로그인에 실패했습니다.");
          }
          
          console.log("Firebase 사용자 정보:", {
            displayName: firebaseUser.displayName,
            email: firebaseUser.email,
            uid: firebaseUser.uid.substring(0, 8) + "...", // 보안을 위한 부분 표시
            photoURL: firebaseUser.photoURL ? "있음" : "없음",
            phoneNumber: firebaseUser.phoneNumber ? "있음" : "없음",
            emailVerified: firebaseUser.emailVerified
          });
          
          const userData = {
            uid: firebaseUser.uid,
            email: firebaseUser.email,
            displayName: firebaseUser.displayName,
            photoURL: firebaseUser.photoURL,
            phoneNumber: firebaseUser.phoneNumber
          };
          
          // 서버로 Firebase 사용자 정보 전송
          console.log("서버에 Firebase 사용자 정보 전송 시작...");
          const response = await fetch("/api/auth/firebase-login", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ user: userData }),
            credentials: "include", // 쿠키 포함
          });
          
          console.log("서버 응답 상태:", response.status);
          
          if (!response.ok) {
            const errorText = await response.text();
            console.error("서버 인증 실패 응답:", errorText);
            throw new Error(`서버 인증 실패: ${response.status} ${errorText}`);
          }
          
          const data = await response.json();
          console.log("서버 인증 성공 응답:", data);
          return data;
        } catch (authError: any) {
          console.error("🔴 Firebase 인증 오류:", authError);
          console.error("🔴 오류 코드:", authError.code);
          console.error("🔴 오류 메시지:", authError.message);
          console.error("🔴 오류 상세:", JSON.stringify(authError, null, 2));
          
          // API 키 오류인 경우 더 자세한 문제 진단
          if (authError.code === 'auth/invalid-api-key') {
            console.error("🔴 API 키 문제 진단:");
            console.error("  1. API 키가 정확한지 확인 필요");
            console.error("  2. Firebase 프로젝트에서 웹 API 키가 활성화되어 있는지 확인 필요");
            console.error("  3. Firebase 프로젝트에서 Google 로그인 제공업체가 활성화되어 있는지 확인 필요");
          }
          
          // 승인되지 않은 도메인 문제인 경우
          if (authError.code === 'auth/unauthorized-domain') {
            console.error("🔴 도메인 승인 문제 진단:");
            console.error(`  현재 도메인 '${window.location.origin}'이 Firebase에 등록되어 있지 않습니다.`);
            console.error("  Firebase 콘솔 > 인증 > 설정 > 승인된 도메인에 추가해주세요.");
          }
          
          throw authError;
        }
      } catch (error: any) {
        // 모든 오류 상세 출력
        console.error("Google 로그인 최종 오류:", error);
        console.error("오류 유형:", typeof error);
        
        // Firebase 인증 에러 처리
        if (error.code) {
          switch(error.code) {
            case 'auth/popup-closed-by-user':
              throw new Error("로그인 창이 사용자에 의해 닫혔습니다.");
            case 'auth/cancelled-popup-request':
              throw new Error("다중 팝업 요청이 취소되었습니다.");
            case 'auth/popup-blocked':
              throw new Error("팝업이 브라우저에 의해 차단되었습니다. 팝업 차단을 해제해주세요.");
            case 'auth/api-key-not-valid':
            case 'auth/invalid-api-key':
              throw new Error("Firebase API 키가 유효하지 않습니다. 관리자에게 문의해주세요.");
            case 'auth/unauthorized-domain':
            case 'auth/domain-not-authorized':
              throw new Error(`현재 사이트(${window.location.origin})에서는 Google 로그인이 지원되지 않습니다. 관리자에게 문의해주세요.`);
            default:
              throw new Error(`Google 로그인 실패: [${error.code}] ${error.message}`);
          }
        }
        
        throw new Error(`Google 로그인 실패: ${error.message || '알 수 없는 오류가 발생했습니다'}`);
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