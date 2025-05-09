import React, { useEffect } from "react";
import { useLocation } from "wouter";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import RegisterForm from "../components/forms/RegisterForm";
import { useAuthContext } from "@/lib/AuthProvider";
import FloatingBabyItems from "@/components/FloatingBabyItems";

const RegisterPage = () => {
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
    <div className="flex min-h-screen flex-col justify-center items-center bg-gradient-to-br from-blue-50 to-purple-50 p-4 relative overflow-hidden">
      {/* 배경에 떠다니는 유아용품 아이템 */}
      <FloatingBabyItems />
      
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold text-primary">CreateTree 문화센터</h1>
          <p className="text-muted-foreground mt-2">
            임산부와 영유아 엄마들을 위한 AI 서비스
          </p>
        </div>

        <Card className="relative z-10">
          <CardHeader>
            <CardTitle>회원가입</CardTitle>
            <CardDescription>
              CreateTree 문화센터의 AI 서비스에 가입하세요.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <RegisterForm />
            <div className="mt-4 text-center">
              <p className="text-sm text-muted-foreground">
                이미 계정이 있으신가요?{" "}
                <a 
                  href="/login" 
                  className="text-primary hover:underline"
                  onClick={(e) => {
                    e.preventDefault();
                    setLocation("/login");
                  }}
                >
                  로그인하기
                </a>
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default RegisterPage;