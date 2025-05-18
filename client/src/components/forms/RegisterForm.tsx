import React, { useState, useEffect } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { DatePicker } from "@/components/ui/date-picker";
import { useAuthContext } from "@/lib/AuthProvider";
import { Loader2 } from "lucide-react";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useQuery } from "@tanstack/react-query";

// 회원가입 폼 검증 스키마
const registerSchema = z.object({
  username: z.string().min(3, {
    message: "사용자명은 최소 3자 이상이어야 합니다.",
  }),
  password: z.string().min(6, {
    message: "비밀번호는 최소 6자 이상이어야 합니다.",
  }),
  email: z.string().email({
    message: "유효한 이메일 주소를 입력해주세요.",
  }).optional().or(z.literal('')),
  name: z.string().min(2, {
    message: "이름은 최소 2자 이상이어야 합니다.",
  }).optional().or(z.literal('')),
  phoneNumber: z.string().min(10, {
    message: "유효한 전화번호를 입력해주세요.",
  }),
  birthdate: z.date().optional(),
  memberType: z.enum(["general", "membership"]),
  hospitalId: z.string().optional(), // 폼에서는 문자열로 유지 (select value가 문자열)
});

type RegisterFormValues = z.infer<typeof registerSchema>;

const RegisterForm: React.FC = () => {
  const { register, isRegisterLoading } = useAuthContext();
  const [showHospitalSelect, setShowHospitalSelect] = useState(false);

  // 병원 목록 가져오기
  const { data: hospitals, isLoading: isHospitalsLoading, error: hospitalsError } = useQuery({
    queryKey: ["/api/hospitals"],
    queryFn: async () => {
      const response = await fetch("/api/hospitals", {
        credentials: 'include'
      });
      if (!response.ok) {
        throw new Error("병원 목록을 가져오는데 실패했습니다.");
      }
      return response.json();
    },
    staleTime: 1000 * 60 * 10, // 10분 동안 데이터 캐시
    retry: 3, // 실패 시 3번 재시도
  });

  // React Hook Form 설정
  const form = useForm<RegisterFormValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      username: "",
      password: "",
      email: "",
      name: "",
      phoneNumber: "",
      memberType: "general",
    },
  });

  // 회원 유형 변경 시 병원 선택 표시 여부 결정
  const memberType = form.watch("memberType");
  
  useEffect(() => {
    setShowHospitalSelect(memberType === "membership");
  }, [memberType]);

  // 회원가입 폼 제출 핸들러
  const onSubmit = (values: RegisterFormValues) => {
    // 타입 문제를 해결하기 위해 날짜 객체를 문자열로 변환
    const formattedValues = {
      ...values,
      birthdate: values.birthdate ? values.birthdate.toISOString().split('T')[0] : undefined,
    };
    register(formattedValues);
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="email"
          render={({ field }) => (
            <FormItem>
              <FormLabel>ID(이메일)*</FormLabel>
              <FormControl>
                <Input 
                  type="email" 
                  placeholder="이메일 입력" 
                  {...field} 
                  disabled={isRegisterLoading}
                />
              </FormControl>
              <FormDescription>알림 및 계정 복구에 사용됩니다</FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        
        <FormField
          control={form.control}
          name="password"
          render={({ field }) => (
            <FormItem>
              <FormLabel>비밀번호*</FormLabel>
              <FormControl>
                <Input 
                  type="password" 
                  placeholder="비밀번호 입력" 
                  {...field} 
                  disabled={isRegisterLoading}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>이름*</FormLabel>
              <FormControl>
                <Input placeholder="이름 입력" {...field} disabled={isRegisterLoading} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        
        <FormField
          control={form.control}
          name="username"
          render={({ field }) => (
            <FormItem>
              <FormLabel>닉네임*</FormLabel>
              <FormControl>
                <Input placeholder="닉네임 입력" {...field} disabled={isRegisterLoading} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        
        <FormField
          control={form.control}
          name="phoneNumber"
          render={({ field }) => (
            <FormItem>
              <FormLabel>전화번호*</FormLabel>
              <FormControl>
                <Input placeholder="전화번호 입력" {...field} disabled={isRegisterLoading} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        
        <FormField
          control={form.control}
          name="birthdate"
          render={({ field }) => (
            <FormItem className="flex flex-col">
              <FormLabel>생년월일</FormLabel>
              <DatePicker 
                date={field.value} 
                setDate={field.onChange}
                disabled={isRegisterLoading}
              />
              <FormMessage />
            </FormItem>
          )}
        />
        
        <FormField
          control={form.control}
          name="memberType"
          render={({ field }) => (
            <FormItem className="space-y-3">
              <FormLabel>회원 유형*</FormLabel>
              <FormControl>
                <RadioGroup
                  onValueChange={field.onChange}
                  defaultValue={field.value}
                  className="flex flex-col space-y-1"
                >
                  <FormItem className="flex items-center space-x-3 space-y-0">
                    <FormControl>
                      <RadioGroupItem value="general" />
                    </FormControl>
                    <FormLabel className="font-normal">
                      일반회원
                    </FormLabel>
                  </FormItem>
                  <FormItem className="flex items-center space-x-3 space-y-0">
                    <FormControl>
                      <RadioGroupItem value="membership" />
                    </FormControl>
                    <FormLabel className="font-normal">
                      멤버십회원
                    </FormLabel>
                  </FormItem>
                </RadioGroup>
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        
        {showHospitalSelect && (
          <FormField
            control={form.control}
            name="hospitalId"
            render={({ field }) => (
              <FormItem>
                <FormLabel>병원 선택*</FormLabel>
                <Select
                  onValueChange={field.onChange}
                  defaultValue={field.value}
                  disabled={isRegisterLoading || isHospitalsLoading}
                >
                  <FormControl>
                    <SelectTrigger>
                      {isHospitalsLoading ? (
                        <div className="flex items-center space-x-2">
                          <Loader2 className="h-4 w-4 animate-spin" />
                          <span>병원 목록 로딩중...</span>
                        </div>
                      ) : (
                        <SelectValue placeholder="병원을 선택하세요" />
                      )}
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {hospitalsError ? (
                      <div className="p-2 text-red-500 text-center">
                        병원 목록을 불러오지 못했습니다
                      </div>
                    ) : hospitals && hospitals.length > 0 ? (
                      hospitals.map((hospital: any) => (
                        <SelectItem key={hospital.id} value={hospital.id.toString()}>
                          {hospital.name}
                        </SelectItem>
                      ))
                    ) : !isHospitalsLoading && (
                      <div className="p-2 text-center text-gray-500">
                        등록된 병원이 없습니다
                      </div>
                    )}
                  </SelectContent>
                </Select>
                <FormDescription>
                  멤버십회원은 소속 병원을 선택해야 합니다.
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
        )}

        <Button type="submit" className="w-full" disabled={isRegisterLoading}>
          {isRegisterLoading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              가입 중...
            </>
          ) : (
            "회원가입"
          )}
        </Button>
      </form>
    </Form>
  );
};

export default RegisterForm;