import React from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { useAuthContext } from "@/lib/AuthProvider";
import { Loader2 } from "lucide-react";
import { FcGoogle } from "react-icons/fc";
import { Separator } from "@/components/ui/separator";

// 로그인 폼 검증 스키마
const loginSchema = z.object({
  username: z.string().min(3, {
    message: "사용자명은 최소 3자 이상이어야 합니다.",
  }),
  password: z.string().min(6, {
    message: "비밀번호는 최소 6자 이상이어야 합니다.",
  }),
});

type LoginFormValues = z.infer<typeof loginSchema>;

const LoginForm: React.FC = () => {
  const { login, loginWithGoogle, isLoginLoading, isGoogleLoginLoading } = useAuthContext();

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
  
  // Google 로그인 핸들러
  const handleGoogleLogin = () => {
    try {
      console.log("Google 로그인 버튼 클릭됨");
      console.log("현재 도메인:", window.location.origin);
      
      // Firebase 승인 도메인 확인
      const allowedDomains = [
        "localhost",
        "createtreeai.firebaseapp.com",
        "createtreeai.web.app",
        "code-craft-ctcreatetree.replit.app",
        "d0d77b78-7584-4870-90de-7e90bf483a1c-00-2fox4esnjilty.kirk.replit.dev"
      ];
      
      // 현재 Replit 도메인 추출
      const currentDomain = window.location.hostname;
      console.log("승인 도메인 목록:", allowedDomains);
      console.log("현재 도메인이 승인됨:", allowedDomains.some(domain => 
        window.location.origin.includes(domain)));
      
      // Replit 도메인인 경우 알림 표시
      if (currentDomain.includes("replit") || currentDomain.includes("kirk.replit.dev")) {
        alert(`⚠️ 주의: 현재 Replit 개발 도메인(${currentDomain})이 Firebase 콘솔의 승인된 도메인 목록에 등록되어 있지 않습니다. 관리자가 Firebase 콘솔에서 승인된 도메인 목록에 '${currentDomain}'을 추가해야 합니다.`);
      }
      
      // Google 로그인 시작
      loginWithGoogle();
    } catch (error) {
      console.error("Google 로그인 버튼 오류:", error);
      alert("Google 로그인을 시작할 수 없습니다. 브라우저 콘솔에서 상세 오류를 확인해주세요.");
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
              <FormLabel>사용자명</FormLabel>
              <FormControl>
                <Input placeholder="사용자명 입력" {...field} disabled={isLoginLoading} />
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
          disabled={isGoogleLoginLoading}
        >
          {isGoogleLoginLoading ? (
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
              onClick={() => alert("아이디 찾기 기능은 현재 개발 중입니다.")}
            >
              아이디 찾기
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