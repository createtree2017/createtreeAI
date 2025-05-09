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

// 회원가입 폼 검증 스키마
const registerSchema = z.object({
  username: z.string().min(2, "사용자명은 2자 이상이어야 합니다."),
  email: z.string().email("유효한 이메일 주소를 입력해주세요.").optional(),
  password: z.string().min(6, "비밀번호는 6자 이상이어야 합니다."),
  confirmPassword: z.string().min(6, "비밀번호 확인은 6자 이상이어야 합니다."),
  name: z.string().optional(),
  phoneNumber: z.string().optional(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "비밀번호가 일치하지 않습니다.",
  path: ["confirmPassword"],
});

type RegisterFormValues = z.infer<typeof registerSchema>;

export function RegisterForm({ redirectPath = "/" }: { redirectPath?: string }) {
  const [_, navigate] = useLocation();
  const { register: registerUser, isRegisterLoading } = useAuth();
  const [error, setError] = useState<string | null>(null);
  
  const form = useForm<RegisterFormValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      username: "",
      email: "",
      password: "",
      confirmPassword: "",
      name: "",
      phoneNumber: "",
    },
  });
  
  async function onSubmit(data: RegisterFormValues) {
    try {
      setError(null);
      
      // 비밀번호 확인 필드는 서버에 보내지 않음
      const { confirmPassword, ...registerData } = data;
      
      await registerUser(registerData, {
        onSuccess: () => {
          navigate(redirectPath);
        },
        onError: (err: Error) => {
          setError(err.message);
        },
      });
    } catch (err) {
      setError("회원가입 중 오류가 발생했습니다. 다시 시도해주세요.");
    }
  }
  
  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="username">사용자명 *</Label>
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
          <Label htmlFor="email">이메일</Label>
          <Input
            id="email"
            type="email"
            autoComplete="email"
            {...form.register("email")}
          />
          {form.formState.errors.email && (
            <p className="text-sm text-destructive">
              {form.formState.errors.email.message}
            </p>
          )}
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="name">이름</Label>
          <Input
            id="name"
            type="text"
            autoComplete="name"
            {...form.register("name")}
          />
          {form.formState.errors.name && (
            <p className="text-sm text-destructive">
              {form.formState.errors.name.message}
            </p>
          )}
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="phoneNumber">전화번호</Label>
          <Input
            id="phoneNumber"
            type="tel"
            autoComplete="tel"
            {...form.register("phoneNumber")}
          />
          {form.formState.errors.phoneNumber && (
            <p className="text-sm text-destructive">
              {form.formState.errors.phoneNumber.message}
            </p>
          )}
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="password">비밀번호 *</Label>
          <Input
            id="password"
            type="password"
            autoComplete="new-password"
            {...form.register("password")}
          />
          {form.formState.errors.password && (
            <p className="text-sm text-destructive">
              {form.formState.errors.password.message}
            </p>
          )}
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="confirmPassword">비밀번호 확인 *</Label>
          <Input
            id="confirmPassword"
            type="password"
            autoComplete="new-password"
            {...form.register("confirmPassword")}
          />
          {form.formState.errors.confirmPassword && (
            <p className="text-sm text-destructive">
              {form.formState.errors.confirmPassword.message}
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
        disabled={isRegisterLoading}
      >
        {isRegisterLoading ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" /> 가입 중...
          </>
        ) : (
          "회원가입"
        )}
      </Button>
      
      <p className="text-xs text-muted-foreground text-center">
        회원가입을 진행하시면 서비스 이용약관 및 개인정보 처리방침에 동의하게 됩니다.
      </p>
    </form>
  );
}