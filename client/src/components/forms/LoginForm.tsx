import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useLocation } from "wouter";
import { useAuth } from "@/lib/AuthProvider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2 } from "lucide-react";

// 로그인 폼 검증 스키마
const loginSchema = z.object({
  username: z.string().min(2, "사용자명은 2자 이상이어야 합니다."),
  password: z.string().min(6, "비밀번호는 6자 이상이어야 합니다."),
});

type LoginFormValues = z.infer<typeof loginSchema>;

export function LoginForm({ redirectPath = "/" }: { redirectPath?: string }) {
  const [_, navigate] = useLocation();
  const { login, isLoginLoading } = useAuth();
  const [error, setError] = useState<string | null>(null);
  
  const form = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      username: "",
      password: "",
    },
  });
  
  async function onSubmit(data: LoginFormValues) {
    try {
      setError(null);
      
      await login(data, {
        onSuccess: () => {
          navigate(redirectPath);
        },
        onError: (err: Error) => {
          setError(err.message);
        },
      });
    } catch (err) {
      setError("로그인 중 오류가 발생했습니다. 다시 시도해주세요.");
    }
  }
  
  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="username">사용자명</Label>
          <Input
            id="username"
            type="text"
            autoComplete="username"
            {...form.register("username")}
          />
          {form.formState.errors.username && (
            <p className="text-sm text-destructive">
              {form.formState.errors.username.message}
            </p>
          )}
        </div>
        
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label htmlFor="password">비밀번호</Label>
            <button
              type="button"
              className="text-xs text-primary hover:underline"
              // 지금은 비밀번호 찾기 기능 구현 안 함
              onClick={() => alert("비밀번호 찾기 기능은 현재 개발 중입니다.")}
            >
              비밀번호 찾기
            </button>
          </div>
          <Input
            id="password"
            type="password"
            autoComplete="current-password"
            {...form.register("password")}
          />
          {form.formState.errors.password && (
            <p className="text-sm text-destructive">
              {form.formState.errors.password.message}
            </p>
          )}
        </div>
      </div>
      
      {error && (
        <div className="p-3 rounded-md bg-destructive/10 text-destructive text-sm">
          {error}
        </div>
      )}
      
      <Button
        type="submit"
        className="w-full flex items-center justify-center"
        disabled={isLoginLoading}
      >
        {isLoginLoading ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" /> 로그인 중...
          </>
        ) : (
          "로그인"
        )}
      </Button>
    </form>
  );
}