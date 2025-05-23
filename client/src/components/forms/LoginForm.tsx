import React, { useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { useAuthContext } from "@/lib/AuthProvider";
import { useGoogleAuth, useGoogleCallbackHandler } from "@/hooks/useGoogleAuth";
import { Loader2 } from "lucide-react";
import { FcGoogle } from "react-icons/fc";
import { Separator } from "@/components/ui/separator";

// 로그인 폼 검증 스키마
const loginSchema = z.object({
  username: z.string().email({
    message: "올바른 이메일 주소를 입력하세요.",
  }),
  password: z.string().min(6, {
    message: "비밀번호는 최소 6자 이상이어야 합니다.",
  }),
});

type LoginFormValues = z.infer<typeof loginSchema>;

const LoginForm: React.FC = () => {
  const { login, isLoginLoading } = useAuthContext();
  const { loginWithGoogle, isLoggingIn } = useGoogleAuth();
  
  // Google OAuth 콜백 처리
  useGoogleCallbackHandler();

  // React Hook Form 설정
  const form = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      username: "",
      password: "",
    },
  });

  // 로그인 폼 제출 핸들러
  const onSubmit = (values: LoginFormValues) => {
    login(values);
  };
  
  // 로그인 진행 상태 관리
  const [isGoogleLoginInProgress, setIsGoogleLoginInProgress] = useState(false);

  // Google 로그인 핸들러 - 서버 OAuth2 시스템 사용 (확실한 방법)
  const handleGoogleLogin = async () => {
    // 중복 요청 방지
    if (isGoogleLoginInProgress) {
      console.log('⚠️ 이미 로그인 진행 중입니다.');
      return;
    }

    try {
      setIsGoogleLoginInProgress(true);
      console.log("🚀 서버 Google OAuth2 로그인 시작");
      
      // 서버의 Google OAuth 엔드포인트로 리디렉션 (캐시 방지)
      const googleAuthUrl = `/api/google-oauth/login?t=${Date.now()}`;
      console.log('🔗 서버 OAuth URL:', googleAuthUrl);
      
      // 현재 페이지를 Google OAuth로 리디렉션
      window.location.href = googleAuthUrl;
      
    } catch (error: any) {
      console.error('💥 Firebase Google 로그인 실패:', error.code, error.message);
      
      // 구체적인 오류 처리
      let errorMessage = 'Google 로그인 중 오류가 발생했습니다.';
      
      if (error.code === 'auth/popup-blocked') {
        errorMessage = '팝업이 차단되었습니다. 브라우저 설정에서 팝업을 허용해주세요.';
      } else if (error.code === 'auth/network-request-failed') {
        errorMessage = '네트워크 오류가 발생했습니다. 인터넷 연결을 확인하고 다시 시도해주세요.';
      } else if (error.code === 'auth/cancelled-popup-request') {
        // 사용자가 팝업을 취소한 경우 - 조용히 처리
        console.log('👤 사용자가 로그인 팝업을 취소했습니다.');
        return; // 에러 메시지 표시하지 않음
      } else if (error.code === 'auth/popup-closed-by-user') {
        // 사용자가 팝업을 직접 닫은 경우
        console.log('👤 사용자가 로그인 팝업을 닫았습니다.');
        return; // 에러 메시지 표시하지 않음
      }
      
      alert(errorMessage + '\n\n오류 코드: ' + (error.code || 'UNKNOWN'));
    } finally {
      // 로그인 진행 상태 초기화
      setIsGoogleLoginInProgress(false);
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="username"
          render={({ field }) => (
            <FormItem>
              <FormLabel>이메일</FormLabel>
              <FormControl>
                <Input placeholder="이메일 주소 입력" type="email" {...field} disabled={isLoginLoading} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="password"
          render={({ field }) => (
            <FormItem>
              <FormLabel>비밀번호</FormLabel>
              <FormControl>
                <Input type="password" placeholder="비밀번호 입력" {...field} disabled={isLoginLoading} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button type="submit" className="w-full" disabled={isLoginLoading}>
          {isLoginLoading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              로그인 중...
            </>
          ) : (
            "로그인"
          )}
        </Button>
        
        {/* 소셜 로그인 섹션 */}
        <div className="my-4">
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <Separator />
            </div>
            <div className="relative flex justify-center">
              <span className="bg-background px-2 text-xs text-muted-foreground">
                또는 소셜 계정으로 로그인
              </span>
            </div>
          </div>
        </div>

        {/* Google 로그인 버튼 */}
        <Button 
          type="button" 
          variant="outline" 
          className="w-full flex items-center justify-center gap-2 bg-white hover:bg-gray-50 text-black border-gray-300 py-6"
          onClick={handleGoogleLogin}
          disabled={isLoggingIn || isGoogleLoginInProgress}
        >
          {(isLoggingIn || isGoogleLoginInProgress) ? (
            <>
              <Loader2 className="h-5 w-5 animate-spin" />
              <span>구글 로그인 중...</span>
            </>
          ) : (
            <>
              <FcGoogle className="h-5 w-5" />
              <span>Google 계정으로 로그인</span>
            </>
          )}
        </Button>
        <div className="text-xs text-center text-muted-foreground mt-1">
          <span className="text-gray-500">Google 계정으로 간편하게 로그인하세요</span>
        </div>
        
        {/* 계정 찾기 링크 */}
        <div className="mt-4 text-center">
          <div className="flex justify-center space-x-5 text-sm">
            <button 
              type="button" 
              className="text-gray-500 hover:text-primary underline" 
              onClick={() => alert("이메일 주소 찾기 기능은 현재 개발 중입니다.")}
            >
              이메일 찾기
            </button>
            <span className="text-gray-400">|</span>
            <button 
              type="button" 
              className="text-gray-500 hover:text-primary underline" 
              onClick={() => alert("비밀번호 찾기 기능은 현재 개발 중입니다.")}
            >
              비밀번호 찾기
            </button>
          </div>
        </div>
      </form>
    </Form>
  );
};

export default LoginForm;