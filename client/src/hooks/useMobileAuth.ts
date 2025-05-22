/**
 * 모바일 환경 전용 Google 로그인 훅
 * 세션 쿠키 문제를 해결하기 위해 JWT 토큰 방식 사용
 */

import { signInWithPopup, signInWithRedirect, getRedirectResult } from "firebase/auth";
import { auth as firebaseAuth, googleProvider } from "@/lib/firebase"; 
import { queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/useToast";

export function useMobileGoogleLogin() {
  const { toast } = useToast();

  const loginWithGoogle = async () => {
    try {
      console.log("[모바일 Google 로그인] 시작");
      
      if (!firebaseAuth) {
        throw new Error("Firebase Auth가 초기화되지 않았습니다.");
      }

      let result;
      
      try {
        // 팝업 방식 시도
        console.log("[모바일 Google 로그인] 팝업 방식 시도");
        result = await signInWithPopup(firebaseAuth, googleProvider);
      } catch (popupError: any) {
        console.log("[모바일 Google 로그인] 팝업 실패, 리디렉트 방식으로 전환");
        
        if (popupError.code === 'auth/popup-blocked' || 
            popupError.code === 'auth/popup-closed-by-user') {
          // 리디렉트 방식으로 전환
          localStorage.setItem('mobile_auth_redirect_started', 'true');
          await signInWithRedirect(firebaseAuth, googleProvider);
          return; // 리디렉트되므로 여기서 종료
        } else {
          throw popupError;
        }
      }

      const user = result.user;
      if (!user) {
        throw new Error("사용자 정보를 가져올 수 없습니다.");
      }

      console.log("[모바일 Google 로그인] Firebase 인증 성공");

      // 모바일 전용 JWT 인증 API 호출
      const response = await fetch("/api/jwt-auth/mobile-login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          firebaseUid: user.uid,
          email: user.email || "",
          displayName: user.displayName || ""
        }),
        credentials: "include"
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error("[모바일 Google 로그인] JWT 인증 실패:", response.status, errorText);
        throw new Error("모바일 인증에 실패했습니다: " + errorText);
      }

      const data = await response.json();
      console.log("[모바일 Google 로그인] JWT 인증 성공:", data);

      // JWT 토큰 저장
      if (data.token) {
        localStorage.setItem('jwt_token', data.token);
        localStorage.setItem('jwt_user', JSON.stringify(data.user));
        console.log("[모바일 Google 로그인] JWT 토큰 저장 완료");
      }

      // 사용자 정보 캐시 업데이트
      queryClient.setQueryData(["/api/auth/me"], data.user);

      toast({
        title: "Google 로그인 성공",
        description: "환영합니다!",
        variant: "default",
      });

      // 홈으로 리디렉션
      setTimeout(() => {
        window.location.href = "/";
      }, 1000);

      return data;

    } catch (error: any) {
      console.error("[모바일 Google 로그인] 오류:", error);
      
      toast({
        title: "Google 로그인 실패",
        description: error.message || "로그인 중 오류가 발생했습니다",
        variant: "destructive",
      });
      
      throw error;
    }
  };

  return { loginWithGoogle };
}

/**
 * 모바일 리디렉트 결과 처리 훅
 */
export function useMobileRedirectHandler() {
  const { toast } = useToast();

  const handleRedirectResult = async () => {
    try {
      if (!firebaseAuth) return;

      const result = await getRedirectResult(firebaseAuth);
      
      if (result && result.user) {
        console.log("[모바일 리디렉트] Google 로그인 성공");
        
        // 리디렉트 상태 정리
        localStorage.removeItem('mobile_auth_redirect_started');

        // JWT 인증 처리
        const response = await fetch("/api/jwt-auth/mobile-login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ 
            firebaseUid: result.user.uid,
            email: result.user.email || "",
            displayName: result.user.displayName || ""
          }),
          credentials: "include"
        });

        if (response.ok) {
          const data = await response.json();
          
          // JWT 토큰 저장
          if (data.token) {
            localStorage.setItem('jwt_token', data.token);
            localStorage.setItem('jwt_user', JSON.stringify(data.user));
          }

          // 사용자 정보 캐시 업데이트
          queryClient.setQueryData(["/api/auth/me"], data.user);

          toast({
            title: "Google 로그인 성공",
            description: "환영합니다!",
            variant: "default",
          });

          // 홈으로 리디렉션
          setTimeout(() => {
            window.location.href = "/";
          }, 1000);
        }
      }
    } catch (error) {
      console.error("[모바일 리디렉트] 처리 오류:", error);
      localStorage.removeItem('mobile_auth_redirect_started');
    }
  };

  return { handleRedirectResult };
}