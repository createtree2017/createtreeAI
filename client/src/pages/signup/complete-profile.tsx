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
import { Loader2, Calendar, Phone, Hospital } from "lucide-react";
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
  hospitalId: z.string().min(1, "병원을 선택해주세요"),
  phoneNumber: z.string().min(10, "올바른 전화번호를 입력해주세요"),
  dueDate: z.string().optional(),
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
  });

  // 폼 초기화
  const form = useForm<CompleteProfileFormData>({
    resolver: zodResolver(completeProfileSchema),
    defaultValues: {
      hospitalId: "",
      phoneNumber: "",
      dueDate: "",
    },
  });

  // 폼 제출 처리
  const onSubmit = async (data: CompleteProfileFormData) => {
    try {
      setIsSubmitting(true);
      console.log("[프로필 완성] 제출 데이터:", data);

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
        const errorText = await response.text();
        throw new Error(`프로필 저장 실패: ${errorText}`);
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
              {/* 병원 선택 필드 */}
              <FormField
                control={form.control}
                name="hospitalId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="flex items-center gap-2">
                      <Hospital className="h-4 w-4" /> 병원 선택
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

              {/* 전화번호 입력 필드 */}
              <FormField
                control={form.control}
                name="phoneNumber"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="flex items-center gap-2">
                      <Phone className="h-4 w-4" /> 전화번호
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

              {/* 출산예정일 입력 */}
              <FormField
                control={form.control}
                name="dueDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="flex items-center gap-2">
                      <Calendar className="h-4 w-4" /> 출산예정일
                    </FormLabel>
                    <FormControl>
                      <Input 
                        type="date" 
                        placeholder="출산예정일을 선택해주세요"
                        {...field}
                      />
                    </FormControl>
                    <FormDescription>
                      출산예정일을 선택해주세요 (선택사항)
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