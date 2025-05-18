import React, { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";
import { useJwtAuth } from "@/hooks/useJwtAuth";

const AuthHandlerPage = () => {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
  const [errorMessage, setErrorMessage] = useState<string>("");
  const { mobileLogin } = useJwtAuth();

  useEffect(() => {
    const handleAuth = async () => {
      try {
        const { initializeApp, getApps, getApp } = await import("firebase/app");
        const { getAuth, getRedirectResult, signOut } = await import("firebase/auth");

        const firebaseConfig = {
          apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
          authDomain: "createtreeai.firebaseapp.com",
          projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
          appId: import.meta.env.VITE_FIREBASE_APP_ID
        };

        const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
        const auth = getAuth(app);

        const result = await getRedirectResult(auth);

        if (result && result.user) {
          const idToken = await result.user.getIdToken();
          const userData = {
            name: result.user.displayName || "사용자",
            email: result.user.email || "",
            uid: result.user.uid
          };

          mobileLogin({ firebaseUid: userData.uid, email: userData.email });

          localStorage.setItem("firebase_auth", JSON.stringify({
            uid: userData.uid,
            email: userData.email,
            displayName: userData.name,
            timestamp: Date.now()
          }));

          console.log("[인증 처리] Firebase 로그인 성공, 서버 인증 시작...");
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
            credentials: "include"
          });

          if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`서버 인증 실패 (${response.status}): ${errorText || "알 수 없는 오류"}`);
          }

          const loginResponse = await response.json();
          console.log("[Google 로그인] 서버 인증 성공:", loginResponse);

          await signOut(auth);

          setStatus("success");
          toast({
            title: "로그인 성공",
            description: `${userData.name}님, 환영합니다!`
          });

          localStorage.setItem("auth_status", "logged_in");
          localStorage.setItem("auth_user_id", userData.uid);
          localStorage.setItem("auth_user_email", userData.email);
          localStorage.setItem("auth_timestamp", Date.now().toString());
          
          // 세션 쿠키가 제대로 설정될 수 있도록 더 오래 대기 
          // 모바일 환경에서는 세션 설정에 더 많은 시간이 필요할 수 있음
          await new Promise(resolve => setTimeout(resolve, 1500));

          const savedRedirectUrl = localStorage.getItem("login_redirect_url");

          console.log("[인증 API 호출] /api/auth/me 요청 시작 (세션 확인)");
          const checkSession = await fetch("/api/auth/me", {
            method: "GET",
            credentials: "include",
            headers: {
              "Cache-Control": "no-cache, no-store"
            }
          });
          console.log("[인증 API 응답] 상태 코드:", checkSession.status);
          const sessionInfo = await checkSession.json();
          console.log("[인증 API 응답] 세션 정보:", sessionInfo);

          // 세션 설정 캡처 강화를 위한 리다이렉션 지연 (모바일에서 중요)
          setTimeout(() => {
            localStorage.removeItem("login_redirect_url");
            
            // 세션 유지를 위한 인증 상태 쿠키 추가 설정
            document.cookie = "auth_status=logged_in; path=/; max-age=2592000"; // 30일

            // 리다이렉션 결정
            if (
              sessionInfo?.needSignup === true ||
              sessionInfo?.needProfileComplete === true ||
              !sessionInfo?.phoneNumber ||
              !sessionInfo?.hospitalId
            ) {
              console.log("[인증 처리] 프로필 완성 필요, 프로필 페이지로 이동");
              window.location.replace("/signup/complete-profile");
            } else if (savedRedirectUrl) {
              console.log("[인증 처리] 저장된 리다이렉션 URL로 이동:", savedRedirectUrl);
              window.location.replace(savedRedirectUrl);
            } else {
              console.log("[인증 처리] 홈페이지로 이동");
              window.location.replace("/");
            }
          }, 3000); // 더 오래 기다려서 세션이 확실히 저장되도록 함
        } else {
          setStatus("error");
          setErrorMessage("로그인 정보를 찾을 수 없습니다. 다시 로그인해 주세요.");
          setTimeout(() => {
            window.location.href = "/auth";
          }, 2000);
        }
      } catch (error) {
        setStatus("error");
        setErrorMessage(error instanceof Error ? error.message : "알 수 없는 오류가 발생했습니다");
        setTimeout(() => {
          window.location.href = "/auth";
        }, 2000);
      }
    };

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
