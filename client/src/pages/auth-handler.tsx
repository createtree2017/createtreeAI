import React, { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";

/**
 * Firebase 인증 리디렉션을 처리하는 전용 페이지
 * Google 로그인 리디렉션 후 이 페이지에서 인증 결과를 처리합니다.
 * 
 * 모바일에서 작동하도록 개선된 버전 (ID 토큰 사용)
 */
const AuthHandlerPage = () => {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
  const [errorMessage, setErrorMessage] = useState<string>("");

  useEffect(() => {
    const handleAuth = async () => {
      try {
        console.log("[AuthHandler] 인증 처리 시작...");
        
        // Firebase 모듈 동적 로드 (필요한 모든 기능 로드)
        const { initializeApp, getApps, getApp } = await import('firebase/app');
        const { getAuth, getRedirectResult, signOut } = await import('firebase/auth');
        
        // Firebase 설정 (인증 도메인을 고정)
        const firebaseConfig = {
          apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
          authDomain: "createtreeai.firebaseapp.com", // 고정 도메인 사용
          projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
          appId: import.meta.env.VITE_FIREBASE_APP_ID
        };
        
        // Firebase 앱 중복 초기화 방지 - 기존 앱이 있으면 재사용
        console.log("[AuthHandler] 기존 Firebase 앱 수:", getApps().length);
        const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
        const auth = getAuth(app);
        
        console.log("[AuthHandler] Firebase 초기화 완료, 리디렉션 결과 확인");
        
        // 리디렉션 결과 확인
        const result = await getRedirectResult(auth);
        
        if (result && result.user) {
          console.log("[AuthHandler] 리디렉션 로그인 성공!");
          
          try {
            // 중요: ID 토큰 가져오기 - 이것이 핵심
            const idToken = await result.user.getIdToken();
            console.log("[AuthHandler] ID 토큰 획득 성공 (토큰 길이:", idToken.length, ")");
            
            // 사용자 추가 정보 (UI 표시용)
            const userData = {
              name: result.user.displayName || "사용자",
              email: result.user.email || "",
              uid: result.user.uid
            };
            
            console.log("[AuthHandler] 사용자 정보:", 
              userData.name, 
              userData.email ? `(${userData.email.substring(0, 3)}...)` : "", 
              `(uid: ${userData.uid.substring(0, 5)}...)`
            );
            
            // 서버 인증 API 호출 (ID 토큰 사용)
            console.log("[AuthHandler] 서버에 ID 토큰 전송 중...");
            const response = await fetch("/api/auth/firebase-login", {
              method: "POST",
              headers: { 
                "Content-Type": "application/json",
                "Cache-Control": "no-cache, no-store"
              },
              body: JSON.stringify({ 
                idToken,
                user: {
                  uid: userData.uid,
                  email: userData.email,
                  displayName: userData.name
                }
              }),
              credentials: "include" // 세션 쿠키를 받기 위해 필수
            });
            
            // 응답 확인
            if (!response.ok) {
              const errorText = await response.text();
              console.error("[AuthHandler] 서버 인증 실패:", response.status, errorText);
              throw new Error(`서버 인증 실패 (${response.status}): ${errorText || "알 수 없는 오류"}`);
            }
            
            // 서버 응답 처리
            const data = await response.json();
            console.log("[AuthHandler] 서버 인증 성공:", data);
            
            // Firebase에서 로그아웃 (중요: 서버 세션은 유지하고 Firebase만 로그아웃)
            // 이렇게 하면 다음 로그인 시 항상 새로운 인증 과정을 거치게 됨
            console.log("[AuthHandler] Firebase 로그아웃 처리 중...");
            await signOut(auth);
            console.log("[AuthHandler] Firebase 로그아웃 완료");
            
            // 성공 상태로 변경
            setStatus("success");
            
            // 토스트 메시지
            toast({
              title: "로그인 성공",
              description: `${userData.name}님, 환영합니다!`
            });
            
            // 세션 쿠키 확인 (디버깅용)
            console.log("[AuthHandler] 현재 쿠키:", document.cookie);
            
            // 홈으로 리디렉션
            setTimeout(() => {
              window.location.href = "/";
            }, 1500);
          } catch (err) {
            console.error("[AuthHandler] 토큰 처리 중 오류:", err);
            setStatus("error");
            setErrorMessage(err instanceof Error ? err.message : "인증 처리 중 오류가 발생했습니다");
            
            // 에러 발생 시 Firebase 로그아웃
            try {
              await signOut(auth);
              console.log("[AuthHandler] 오류 후 Firebase 로그아웃 완료");
            } catch (logoutErr) {
              console.error("[AuthHandler] 로그아웃 오류:", logoutErr);
            }
            
            // 로그인 페이지로 리디렉션
            setTimeout(() => {
              window.location.href = "/auth";
            }, 2000);
          }
        } else {
          console.log("[AuthHandler] 리디렉션 결과 없음 (로그인하지 않음)");
          setStatus("error");
          setErrorMessage("로그인 정보를 찾을 수 없습니다. 다시 로그인해 주세요.");
          
          // 로그인 페이지로 리디렉션
          setTimeout(() => {
            window.location.href = "/auth";
          }, 2000);
        }
      } catch (error) {
        console.error("[AuthHandler] 인증 처리 중 오류 발생:", error);
        setStatus("error");
        setErrorMessage(error instanceof Error ? error.message : "알 수 없는 오류가 발생했습니다");
        
        // 로그인 페이지로 리디렉션
        setTimeout(() => {
          window.location.href = "/auth";
        }, 2000);
      }
    };
    
    // 인증 처리 시작
    handleAuth();
  }, [toast]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-b from-purple-50 to-blue-50">
      <div className="w-full max-w-md p-8 space-y-4 bg-white rounded-lg shadow-md text-center">
        {status === "loading" && (
          <>
            <Loader2 className="h-12 w-12 animate-spin mx-auto text-primary" />
            <h1 className="text-2xl font-bold">로그인 처리 중</h1>
            <p className="text-gray-500">Google 로그인 정보를 확인하고 있습니다...</p>
          </>
        )}
        
        {status === "success" && (
          <>
            <div className="h-12 w-12 bg-green-100 text-green-800 rounded-full flex items-center justify-center mx-auto">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h1 className="text-2xl font-bold text-green-700">로그인 성공!</h1>
            <p className="text-gray-500">CreateTree 문화센터에 오신 것을 환영합니다.</p>
            <p className="text-gray-400 text-sm">잠시 후 홈페이지로 이동합니다...</p>
          </>
        )}
        
        {status === "error" && (
          <>
            <div className="h-12 w-12 bg-red-100 text-red-800 rounded-full flex items-center justify-center mx-auto">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </div>
            <h1 className="text-2xl font-bold text-red-700">로그인 실패</h1>
            <p className="text-gray-500">{errorMessage}</p>
            <p className="text-gray-400 text-sm">잠시 후 로그인 페이지로 이동합니다...</p>
          </>
        )}
      </div>
    </div>
  );
};

export default AuthHandlerPage;