import React, { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
// 상대 경로로 변경
import LoginForm from "../components/forms/LoginForm";
import RegisterForm from "../components/forms/RegisterForm";
import { useAuthContext } from "@/lib/AuthProvider";
import FloatingBabyItems from "@/components/FloatingBabyItems";
import { getAuth, getRedirectResult } from "firebase/auth";
import { Loader2, Smartphone } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { MobileLoginBypass } from "@/components/MobileLoginBypass";
import { Button } from "@/components/ui/button";

const AuthPage = () => {
  const [location, setLocation] = useLocation();
  const { user, isLoading, loginWithGoogle } = useAuthContext();
  const [processingRedirect, setProcessingRedirect] = useState(false);
  const { toast } = useToast();

  // Firebase 리디렉션 결과 처리
  useEffect(() => {
    const processRedirectResult = async () => {
      try {
        setProcessingRedirect(true);
        const auth = getAuth();
        
        console.log("[AuthPage] Firebase 리디렉션 결과 확인 중...");
        const result = await getRedirectResult(auth);
        
        if (result && result.user) {
          console.log("[AuthPage] 리디렉션 로그인 성공, 사용자 정보:", {
            uid: result.user.uid.substring(0, 5) + "...",
            email: result.user.email,
            displayName: result.user.displayName
          });
          
          // 리디렉션 로그인 성공 시 로그인 처리
          toast({
            title: "Google 로그인 성공",
            description: "환영합니다! 로그인 정보를 처리 중입니다...",
          });
          
          // 서버에 Firebase 사용자 정보 전송
          const userData = {
            uid: result.user.uid,
            email: result.user.email || "",
            displayName: result.user.displayName || ""
          };
          
          const response = await fetch("/api/auth/firebase-login", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ user: userData }),
            credentials: "include"
          });
          
          if (!response.ok) {
            throw new Error("서버 인증에 실패했습니다");
          }
          
          // 로그인 성공 시 홈으로 리디렉션
          setTimeout(() => {
            setLocation("/");
          }, 1000);
        } else {
          console.log("[AuthPage] 리디렉션 결과 없음");
        }
      } catch (error) {
        console.error("[AuthPage] 리디렉션 결과 처리 중 오류:", error);
        toast({
          title: "로그인 처리 중 오류 발생",
          description: error instanceof Error ? error.message : "알 수 없는 오류가 발생했습니다",
          variant: "destructive"
        });
      } finally {
        setProcessingRedirect(false);
      }
    };
    
    // 현재 URL에 auth 관련 파라미터가 있는지 확인
    const hasAuthParams = window.location.href.includes("__/auth/handler");
    if (hasAuthParams) {
      processRedirectResult();
    }
  }, [setLocation, toast]);

  // 이미 로그인된 상태 확인
  useEffect(() => {
    if (user && !isLoading && !processingRedirect) {
      setLocation("/");
    }
  }, [user, isLoading, processingRedirect, setLocation]);

  if (isLoading) {
    return <div>로딩 중...</div>;
  }

  return (
    <div className="flex min-h-screen flex-col md:flex-row bg-gradient-to-br from-blue-50 to-purple-50 relative overflow-hidden">
      {/* 배경에 떠다니는 유아용품 아이템 */}
      <FloatingBabyItems />
      
      {/* 왼쪽 로그인/회원가입 영역 */}
      <div className="w-full md:w-1/2 p-4 md:p-10 flex flex-col justify-center">
        <div className="max-w-md mx-auto w-full">
          <div className="mb-8 text-center">
            <h1 className="text-3xl font-bold text-primary">우리병원 문화센터</h1>
            <p className="text-muted-foreground mt-2">
              임산부와 영유아 엄마들을 위한 AI 서비스
            </p>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>계정 관리</CardTitle>
              <CardDescription>
                우리병원 문화센터의 AI 서비스를 이용하려면 로그인이 필요합니다.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Tabs defaultValue="login" className="w-full">
                <TabsList className="grid w-full grid-cols-2 mb-6">
                  <TabsTrigger value="login">로그인</TabsTrigger>
                  <TabsTrigger value="register">회원가입</TabsTrigger>
                </TabsList>
                <TabsContent value="login">
                  <LoginForm />
                </TabsContent>
                <TabsContent value="register">
                  <RegisterForm />
                </TabsContent>
                

                {/* 모바일 인증 추가 섹션 */}
                <div className="mt-6 border-t pt-4">
                  <h3 className="text-sm font-medium mb-2 flex items-center gap-1">
                    <Smartphone size={16} />
                    모바일 간편 로그인
                  </h3>
                  <p className="text-xs text-muted-foreground mb-4">
                    세션 쿠키 문제로 인증에 실패하는 경우 사용하세요
                  </p>
                  <MobileLoginBypass 
                    onLogin={(userData) => {
                      toast({
                        title: "모바일 로그인 성공",
                        description: `${userData.fullName || userData.email} 님으로 로그인되었습니다.`,
                      });
                      
                      // 로그인 후 상태 업데이트 및 리디렉션
                      setTimeout(() => setLocation("/"), 1000);
                    }}
                  />
                </div>
              </Tabs>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* 오른쪽 이미지/소개 영역 */}
      <div className="w-full md:w-1/2 bg-gradient-to-br from-primary/10 to-primary/20 flex flex-col justify-center items-center p-10 hidden md:flex">
        <div className="max-w-lg">
          <h2 className="text-4xl font-bold text-primary mb-4">
            AI 기반 맞춤형 서비스
          </h2>
          <p className="text-lg mb-8 text-gray-700">
            우리병원 문화센터는 임산부와 영유아 엄마들을 위한 AI 기반 맞춤형 서비스를 제공합니다. 
            사진 변환, 태교 음악 생성, AI 대화 기능을 통해 특별한 경험을 선사합니다.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-white/80 p-4 rounded-lg shadow-sm">
              <h3 className="font-bold text-primary mb-2">AI 이미지 변환</h3>
              <p className="text-sm text-gray-600">
                소중한 순간을 다양한 스타일로 변환하여 특별한 추억을 만들어보세요.
              </p>
            </div>
            <div className="bg-white/80 p-4 rounded-lg shadow-sm">
              <h3 className="font-bold text-primary mb-2">태교 음악 생성</h3>
              <p className="text-sm text-gray-600">
                아기의 이름과 성격을 담은 맞춤형 태교 음악을 AI가 만들어드립니다.
              </p>
            </div>
            <div className="bg-white/80 p-4 rounded-lg shadow-sm">
              <h3 className="font-bold text-primary mb-2">AI 대화 서비스</h3>
              <p className="text-sm text-gray-600">
                임신과 육아에 관한 질문을 AI가 24시간 답변해드립니다.
              </p>
            </div>
            <div className="bg-white/80 p-4 rounded-lg shadow-sm">
              <h3 className="font-bold text-primary mb-2">마일스톤 관리</h3>
              <p className="text-sm text-gray-600">
                임신과 육아의 중요한 순간을 기록하고 추억하세요.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AuthPage;