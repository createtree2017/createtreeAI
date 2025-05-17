import React, { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { getAuth, getRedirectResult } from "firebase/auth";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";

/**
 * Firebase 인증 리디렉션을 처리하는 전용 페이지
 * Google 로그인 리디렉션 후 이 페이지에서 인증 결과를 처리합니다.
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
        const auth = getAuth();
        
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
              await new Promise(resolve => setTimeout(resolve, 500));
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

          console.log("[AuthHandler] 서버에 Firebase 인증 정보 전송");
          const response = await fetch("/api/auth/firebase-login", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ user: userData }),
            credentials: "include"
          });

          if (!response.ok) {
            const errorData = await response.text();
            throw new Error(`서버 인증 실패: ${errorData}`);
          }

          const data = await response.json();
          console.log("[AuthHandler] 서버 인증 성공:", data);
          
          setStatus("success");
          toast({
            title: "Google 로그인 성공",
            description: "환영합니다! 홈페이지로 이동합니다."
          });

          // 홈으로 리디렉션 (1초 지연)
          setTimeout(() => {
            window.location.href = "/";
          }, 1000);
        } else {
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