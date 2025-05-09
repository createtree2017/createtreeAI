import React, { useEffect } from "react";
import { useLocation } from "wouter";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
// 상대 경로로 변경
import LoginForm from "../components/forms/LoginForm";
import RegisterForm from "../components/forms/RegisterForm";
import { useAuthContext } from "@/lib/AuthProvider";

const AuthPage = () => {
  const [location, setLocation] = useLocation();
  const { user, isLoading } = useAuthContext();

  // 이미 로그인된 상태 확인 (주석 처리하여 중복 리디렉션 방지)
  // useEffect(() => {
  //   if (user && !isLoading) {
  //     setLocation("/");
  //   }
  // }, [user, isLoading, setLocation]);

  if (isLoading) {
    return <div>로딩 중...</div>;
  }

  return (
    <div className="flex min-h-screen flex-col md:flex-row bg-gradient-to-br from-blue-50 to-purple-50">
      {/* 왼쪽 로그인/회원가입 영역 */}
      <div className="w-full md:w-1/2 p-4 md:p-10 flex flex-col justify-center">
        <div className="max-w-md mx-auto w-full">
          <div className="mb-8 text-center">
            <h1 className="text-3xl font-bold text-primary">CreateTree 문화센터</h1>
            <p className="text-muted-foreground mt-2">
              임산부와 영유아 엄마들을 위한 AI 서비스
            </p>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>계정 관리</CardTitle>
              <CardDescription>
                CreateTree 문화센터의 AI 서비스를 이용하려면 로그인이 필요합니다.
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
            CreateTree 문화센터는 임산부와 영유아 엄마들을 위한 AI 기반 맞춤형 서비스를 제공합니다. 
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