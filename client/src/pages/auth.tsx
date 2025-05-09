import { useState } from "react";
import { useLocation } from "wouter";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { LoginForm } from "@/components/forms/LoginForm";
import { RegisterForm } from "@/components/forms/RegisterForm";
import { useAuth } from "@/lib/AuthProvider";

export default function AuthPage() {
  const [activeTab, setActiveTab] = useState<string>("login");
  const [location, navigate] = useLocation();
  const { user, isLoading } = useAuth();
  
  // 이미 로그인한 경우 홈으로 리디렉션
  if (user && !isLoading) {
    navigate("/");
    return null;
  }
  
  // 쿼리 파라미터에 redirect가 있으면 저장
  const searchParams = new URLSearchParams(window.location.search);
  const redirectPath = searchParams.get("redirect") || "/";
  
  return (
    <div className="flex min-h-screen bg-muted/40">
      <div className="flex flex-col justify-center items-center w-full md:w-1/2 py-12 px-4 sm:px-6 lg:px-8">
        <div className="w-full max-w-md space-y-8">
          <div className="text-center">
            <h1 className="text-3xl font-bold tracking-tight text-foreground">
              <span className="text-primary">맘스</span> 서비스
            </h1>
            <p className="mt-2 text-sm text-muted-foreground">
              엄마들을 위한 AI 기반 서비스
            </p>
          </div>
          
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid grid-cols-2 w-full">
              <TabsTrigger value="login">로그인</TabsTrigger>
              <TabsTrigger value="register">회원가입</TabsTrigger>
            </TabsList>
            
            <TabsContent value="login" className="mt-6">
              <Card>
                <CardHeader>
                  <CardTitle>로그인</CardTitle>
                  <CardDescription>
                    계정 정보를 입력하여 로그인하세요.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <LoginForm redirectPath={redirectPath} />
                </CardContent>
                <CardFooter className="flex flex-col items-start gap-2">
                  <p className="text-sm text-muted-foreground">
                    아직 계정이 없으신가요?{" "}
                    <button
                      onClick={() => setActiveTab("register")}
                      className="text-primary hover:underline font-medium"
                    >
                      회원가입
                    </button>
                  </p>
                </CardFooter>
              </Card>
            </TabsContent>
            
            <TabsContent value="register" className="mt-6">
              <Card>
                <CardHeader>
                  <CardTitle>회원가입</CardTitle>
                  <CardDescription>
                    새 계정을 만들어 서비스를 이용하세요.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <RegisterForm redirectPath={redirectPath} />
                </CardContent>
                <CardFooter className="flex flex-col items-start gap-2">
                  <p className="text-sm text-muted-foreground">
                    이미 계정이 있으신가요?{" "}
                    <button
                      onClick={() => setActiveTab("login")}
                      className="text-primary hover:underline font-medium"
                    >
                      로그인
                    </button>
                  </p>
                </CardFooter>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>
      
      {/* 우측 히어로 섹션 (모바일에서는 숨김) */}
      <div className="hidden md:flex md:w-1/2 bg-gradient-to-r from-primary/10 to-primary/30 flex-col justify-center p-12">
        <div className="max-w-lg">
          <h2 className="text-3xl font-bold text-foreground mb-6">
            CreateTree 맘스 서비스에 오신 것을 환영합니다
          </h2>
          <p className="text-lg text-foreground/80 mb-8">
            AI 기술을 활용한 다양한 서비스로 임신과 육아 여정을 더 풍부하게 만들어 드립니다. 
            사진 변환, 음악 생성, 대화형 AI 어시스턴트 등을 이용해 보세요.
          </p>
          
          <div className="space-y-4">
            <div className="flex items-start space-x-4">
              <div className="bg-primary/20 p-3 rounded-full">
                <span className="text-2xl">🎨</span>
              </div>
              <div>
                <h3 className="font-semibold text-foreground">AI 이미지 변환</h3>
                <p className="text-foreground/70">
                  소중한 순간을 예술적인 이미지로 변환하여 특별한 추억을 만들어보세요.
                </p>
              </div>
            </div>
            
            <div className="flex items-start space-x-4">
              <div className="bg-primary/20 p-3 rounded-full">
                <span className="text-2xl">🎵</span>
              </div>
              <div>
                <h3 className="font-semibold text-foreground">AI 음악 생성</h3>
                <p className="text-foreground/70">
                  아기를 위한 맞춤형 자장가와 태교 음악을 생성해 보세요.
                </p>
              </div>
            </div>
            
            <div className="flex items-start space-x-4">
              <div className="bg-primary/20 p-3 rounded-full">
                <span className="text-2xl">💬</span>
              </div>
              <div>
                <h3 className="font-semibold text-foreground">AI 대화 도우미</h3>
                <p className="text-foreground/70">
                  다양한 성격의 AI 도우미와 대화하며 정보와 지원을 받으세요.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}