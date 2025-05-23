import React, { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardFooter, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";
import { Loader2, Calendar, Phone, Hospital, User, Users, UserCircle } from "lucide-react";
import { 
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { 
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage
} from "@/components/ui/form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { useQuery } from "@tanstack/react-query";

// 프로필 완성 스키마
const completeProfileSchema = z.object({
  displayName: z.string().min(2, "이름을 입력해주세요"),
  nickname: z.string().min(2, "닉네임을 입력해주세요"),
  memberType: z.enum(["general", "membership"], {
    required_error: "회원 유형을 선택해주세요",
  }),
  hospitalId: z.string().optional(),
  phoneNumber: z.string().min(10, "올바른 전화번호를 입력해주세요"),
  birthdate: z.string().min(1, "생년월일을 입력해주세요"),
});

type CompleteProfileFormData = z.infer<typeof completeProfileSchema>;

/**
 * 사용자 프로필 정보 입력 페이지
 * 처음 로그인 후 필수 정보가 부족한 경우 리디렉션되는 페이지
 */
const CompleteProfilePage = () => {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);

  // 병원 목록 조회
  const { data: hospitals = [], isLoading: isLoadingHospitals } = useQuery({
    queryKey: ['/api/hospitals'],
    queryFn: async () => {
      const response = await fetch('/api/hospitals', {
        credentials: 'include'
      });
      if (!response.ok) {
        throw new Error('병원 목록을 가져오는데 실패했습니다');
      }
      return response.json();
    }
  });

  // 폼 초기화
  const form = useForm<CompleteProfileFormData>({
    resolver: zodResolver(completeProfileSchema),
    defaultValues: {
      displayName: "",
      nickname: "",
      memberType: "general",
      hospitalId: "",
      phoneNumber: "",
      birthdate: "",
    },
  });

  // 폼 제출 처리
  const onSubmit = async (data: CompleteProfileFormData) => {
    try {
      setIsSubmitting(true);
      console.log("[프로필 완성] 제출 데이터:", data);

      // 먼저 클라이언트에서 로그인 상태 확인
      const authStatusCookie = document.cookie
        .split("; ")
        .find(row => row.startsWith("auth_status="));
      
      if (!authStatusCookie) {
        // 로그인 쿠키가 없으면 사용자에게 알림
        toast({
          title: "로그인이 필요합니다",
          description: "로그인 세션이 만료되었습니다. 다시 로그인해주세요.",
          variant: "destructive",
        });
        // 로그인 페이지로 리디렉션
        setTimeout(() => {
          window.location.replace("/auth");
        }, 2000);
        return;
      }

      // 서버에 프로필 정보 저장 요청
      const response = await fetch("/api/auth/complete-profile", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include", // 세션 쿠키 포함
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        // 오류 응답 확인 (JSON 형식인지 텍스트인지)
        const contentType = response.headers.get("content-type");
        let errorMessage;
        
        if (contentType && contentType.includes("application/json")) {
          const errorData = await response.json();
          errorMessage = errorData.message || "프로필 저장에 실패했습니다";
        } else {
          errorMessage = await response.text();
        }
        
        // 인증 오류인 경우 (401)
        if (response.status === 401) {
          toast({
            title: "인증 오류",
            description: "로그인 세션이 만료되었습니다. 다시 로그인해주세요.",
            variant: "destructive",
          });
          
          // 로그인 페이지로 리디렉션
          setTimeout(() => {
            window.location.replace("/auth");
          }, 2000);
          return;
        }
        
        throw new Error(`프로필 저장 실패: ${errorMessage}`);
      }

      // 성공 처리
      toast({
        title: "프로필이 완성되었습니다",
        description: "이제 모든 서비스를 이용하실 수 있습니다",
      });

      // 홈페이지로 리디렉션
      setTimeout(() => {
        window.location.replace("/");
      }, 1000);
    } catch (error) {
      console.error("[프로필 완성] 오류:", error);
      toast({
        title: "오류가 발생했습니다",
        description: error instanceof Error ? error.message : "프로필 저장 중 알 수 없는 오류가 발생했습니다",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-b from-purple-50 to-blue-50 p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-2xl font-bold text-center">회원 정보 입력</CardTitle>
          <CardDescription className="text-center">
            서비스 이용을 위해 필요한 정보를 입력해주세요
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              {/* 회원 유형 선택 필드 */}
              <FormField
                control={form.control}
                name="memberType"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="flex items-center gap-2">
                      <Users className="h-4 w-4" /> 회원 유형*
                    </FormLabel>
                    <Select 
                      onValueChange={field.onChange} 
                      defaultValue={field.value}
                    >
                      <FormControl>
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="회원 유형을 선택해주세요" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectGroup>
                          <SelectLabel>회원 유형</SelectLabel>
                          <SelectItem value="general">일반회원</SelectItem>
                          <SelectItem value="membership">멤버십회원</SelectItem>
                        </SelectGroup>
                      </SelectContent>
                    </Select>
                    <FormDescription>
                      멤버십회원은 병원 서비스 이용 고객입니다
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* 병원 선택 필드 (회원 유형이 멤버십일 때만 표시) */}
              {form.watch("memberType") === "membership" && (
                <FormField
                  control={form.control}
                  name="hospitalId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="flex items-center gap-2">
                        <Hospital className="h-4 w-4" /> 병원 선택*
                      </FormLabel>
                      <Select 
                        onValueChange={field.onChange} 
                        defaultValue={field.value}
                      >
                        <FormControl>
                          <SelectTrigger className="w-full">
                            <SelectValue placeholder="소속 병원을 선택해주세요" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectGroup>
                            <SelectLabel>병원 목록</SelectLabel>
                            {isLoadingHospitals ? (
                              <SelectItem value="loading" disabled>
                                로딩중...
                              </SelectItem>
                            ) : hospitals.length === 0 ? (
                              <SelectItem value="none" disabled>
                                등록된 병원이 없습니다
                              </SelectItem>
                            ) : (
                              hospitals.map((hospital: any) => (
                                <SelectItem key={hospital.id} value={hospital.id.toString()}>
                                  {hospital.name}
                                </SelectItem>
                              ))
                            )}
                          </SelectGroup>
                        </SelectContent>
                      </Select>
                      <FormDescription>
                        소속된 병원을 선택해주세요
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}

              {/* 이름 입력 필드 */}
              <FormField
                control={form.control}
                name="displayName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="flex items-center gap-2">
                      <User className="h-4 w-4" /> 이름*
                    </FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="이름을 입력해주세요" 
                        {...field}
                      />
                    </FormControl>
                    <FormDescription>
                      실명을 입력해주세요
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              {/* 닉네임 입력 필드 */}
              <FormField
                control={form.control}
                name="nickname"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="flex items-center gap-2">
                      <UserCircle className="h-4 w-4" /> 닉네임*
                    </FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="닉네임을 입력해주세요" 
                        {...field}
                      />
                    </FormControl>
                    <FormDescription>
                      서비스에서 사용할 닉네임을 입력해주세요
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              {/* 전화번호 입력 필드 */}
              <FormField
                control={form.control}
                name="phoneNumber"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="flex items-center gap-2">
                      <Phone className="h-4 w-4" /> 전화번호*
                    </FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="01012345678" 
                        {...field} 
                        type="tel"
                        inputMode="tel"
                      />
                    </FormControl>
                    <FormDescription>
                      하이픈(-) 없이 입력해주세요
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              {/* 생년월일 입력 필드 */}
              <FormField
                control={form.control}
                name="birthdate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="flex items-center gap-2">
                      <Calendar className="h-4 w-4" /> 생년월일*
                    </FormLabel>
                    <FormControl>
                      <Input 
                        type="date" 
                        placeholder="생년월일을 선택해주세요"
                        {...field}
                      />
                    </FormControl>
                    <FormDescription>
                      생년월일을 선택해주세요
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />



              {/* 제출 버튼 */}
              <Button 
                type="submit" 
                className="w-full" 
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    저장 중...
                  </>
                ) : (
                  "정보 저장하기"
                )}
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
};

export default CompleteProfilePage;