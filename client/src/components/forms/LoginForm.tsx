import React from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { useAuthContext } from "@/lib/AuthProvider";
import { Loader2 } from "lucide-react";

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
  const { login, isLoginLoading } = useAuthContext();

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