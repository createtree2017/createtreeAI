import React, { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { getAuth, getRedirectResult, GoogleAuthProvider } from "firebase/auth";
import { useToast } from "@/hooks/use-toast";
import { queryClient } from "@/lib/queryClient";
import { Loader2 } from "lucide-react";

/**
 * Firebase 인증 리디렉션을 처리하는 전용 페이지
 * Google 로그인 리디렉션 후 이 페이지에서 인증 결과를 처리합니다.
 * 
 * 모바일에서 작동하도록 개선된 버전:
 * - 오류 발생 시 더 많은 디버깅 정보 제공
 * - 리디렉션 후 인증 상태 감지 최적화
 * - 자동 로그인 처리 및 홈 리디렉션
 */
const AuthHandlerPage = () => {
  const [location, setLocation] = useLocation();
  const { toast } = useToast();
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
  const [errorMessage, setErrorMessage] = useState<string>("");

  useEffect(() => {
    const processRedirectResult = async () => {
      try {
        console.log("[AuthHandler] Firebase 리디렉션 결과 처리 시작...");
        console.log("[AuthHandler] 현재 URL:", window.location.href);
        console.log("[AuthHandler] 현재 경로:", window.location.pathname);
        
        // 로컬 스토리지에서 리디렉션 정보 확인
        const redirectStarted = localStorage.getItem('auth_redirect_started');
        const redirectTime = localStorage.getItem('auth_redirect_time');
        
        console.log("[AuthHandler] 리디렉션 상태:", 
          redirectStarted ? "시작됨" : "시작되지 않음", 
          redirectTime ? `(${new Date(parseInt(redirectTime)).toLocaleTimeString()})` : "");
        
        // URL에서 파라미터 추출
        const urlParams = new URLSearchParams(window.location.search);
        console.log("[AuthHandler] URL 파라미터:", Object.fromEntries(urlParams.entries()));
        
        // 현재 위치의 파라미터 확인
        if (window.location.hash) {
          console.log("[AuthHandler] URL 해시 존재:", window.location.hash);
        }
        
        const auth = getAuth();
        
        // 사용할 provider 설정
        const provider = new GoogleAuthProvider();
        
        // 디버깅용 로그
        console.log("[AuthHandler] Firebase Auth 상태:", auth ? "초기화됨" : "초기화되지 않음");
        console.log("[AuthHandler] 현재 사용자:", auth.currentUser ? 
          `${auth.currentUser.displayName || auth.currentUser.email}` : "로그인되지 않음");
        
        // 리디렉션 결과 가져오기 시도 (최대 3번)
        let result = null;
        let attempts = 0;
        
        while (!result && attempts < 3) {
          attempts++;
          console.log(`[AuthHandler] 리디렉션 결과 가져오기 시도 (${attempts}/3)...`);
          
          try {
            result = await getRedirectResult(auth);
            if (result) {
              console.log("[AuthHandler] 리디렉션 결과 성공적으로 가져옴");
            } else {
              console.log("[AuthHandler] 리디렉션 결과 없음, 재시도...");
              // 잠시 대기
              await new Promise(resolve => setTimeout(resolve, 1000));
            }
          } catch (err) {
            console.error(`[AuthHandler] 리디렉션 결과 가져오기 오류 (시도 ${attempts}/3):`, err);
          }
        }

        if (result && result.user) {
          console.log("[AuthHandler] 리디렉션 로그인 성공, 사용자 정보:", {
            uid: result.user.uid.substring(0, 5) + "...",
            email: result.user.email,
            displayName: result.user.displayName
          });

          // 서버에 Firebase 사용자 정보 전송
          const userData = {
            uid: result.user.uid,
            email: result.user.email || "",
            displayName: result.user.displayName || ""
          };

          try {
            console.log("[AuthHandler] 서버에 Firebase 인증 정보 전송");
            const response = await fetch("/api/auth/firebase-login", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ user: userData }),
              credentials: "include"
            });

            console.log("[AuthHandler] 서버 응답 상태:", response.status);
            
            if (!response.ok) {
              const errorText = await response.text();
              console.error("[AuthHandler] 서버 인증 실패:", errorText);
              throw new Error(`서버 인증 실패: ${errorText}`);
            }

            const data = await response.json();
            console.log("[AuthHandler] 서버 인증 성공:", data);
            
            // 사용자 정보 캐시 업데이트
            queryClient.setQueryData(["/api/auth/me"], data.user);
            
            setStatus("success");
            toast({
              title: "Google 로그인 성공",
              description: "환영합니다! 홈페이지로 이동합니다."
            });

            // 홈으로 리디렉션 (1초 지연)
            setTimeout(() => {
              window.location.href = "/";
            }, 1000);
          } catch (error) {
            console.error("[AuthHandler] 서버 인증 처리 중 오류:", error);
            setStatus("error");
            setErrorMessage(error instanceof Error ? error.message : "서버 인증 중 오류가 발생했습니다");
            
            // 로그인 페이지로 리디렉션 (3초 지연)
            setTimeout(() => {
              window.location.href = "/auth";
            }, 3000);
          }
        } else {
          // 결과가 없을 경우 추가 처리 시도 (URL 해시/토큰 처리)
          console.log("[AuthHandler] 표준 리디렉션 결과 없음, 대체 방법 시도");
          
          // URL에서 해시 파라미터 확인
          if (window.location.hash && window.location.hash.includes("id_token=")) {
            console.log("[AuthHandler] ID 토큰 존재, 직접 처리 시도");
            try {
              // 해시에서 토큰 정보 추출
              const hashParams = new URLSearchParams(window.location.hash.substring(1));
              const idToken = hashParams.get("id_token");
              const accessToken = hashParams.get("access_token");
              
              if (idToken) {
                console.log("[AuthHandler] ID 토큰 추출 성공");
                // 여기서 ID 토큰을 사용한 추가 로직 구현 가능
                
                // 사용자가 다시 로그인하도록 유도
                setStatus("error");
                setErrorMessage("인증 정보를 처리하는 중 문제가 발생했습니다. 다시 로그인해 주세요.");
                toast({
                  title: "로그인 처리 중 오류",
                  description: "다시 로그인 해주세요",
                  variant: "destructive"
                });
                
                // 로그인 페이지로 리디렉션
                setTimeout(() => {
                  window.location.href = "/auth";
                }, 2000);
                return;
              }
            } catch (error) {
              console.error("[AuthHandler] 해시 파라미터 처리 오류:", error);
            }
          }
          
          console.log("[AuthHandler] 리디렉션 결과 없음, 로그인 페이지로 이동");
          setStatus("error");
          setErrorMessage("인증 정보가 없습니다. 다시 로그인해 주세요.");
          
          // 로그인 페이지로 리디렉션 (2초 지연)
          setTimeout(() => {
            window.location.href = "/auth";
          }, 2000);
        }
      } catch (error) {
        console.error("[AuthHandler] 리디렉션 결과 처리 중 오류:", error);
        setStatus("error");
        setErrorMessage(error instanceof Error ? error.message : "알 수 없는 오류가 발생했습니다");
        
        toast({
          title: "로그인 처리 중 오류 발생",
          description: error instanceof Error ? error.message : "알 수 없는 오류가 발생했습니다",
          variant: "destructive"
        });
        
        // 로그인 페이지로 리디렉션 (3초 지연)
        setTimeout(() => {
          window.location.href = "/auth";
        }, 3000);
      }
    };

    processRedirectResult();
  }, [toast]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-b from-blue-50 to-purple-50">
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