import React, { useEffect, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2 } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useAuth } from "@/hooks/useAuth";

// 회원 유형 옵션
const memberTypeOptions = [
  { value: "general", label: "일반회원" },
  { value: "pro", label: "프로회원" },
  { value: "hospital_admin", label: "병원관리자" },
  { value: "admin", label: "관리자" },
  { value: "superadmin", label: "슈퍼관리자" },
];

// 수정 폼 검증 스키마
const userEditSchema = z.object({
  email: z.string().email({ message: "유효한 이메일 주소를 입력해주세요." }).optional().or(z.literal("")),
  fullName: z.string().min(2, { message: "이름은 최소 2자 이상이어야 합니다." }).optional().or(z.literal("")),
  phoneNumber: z.string().min(10, { message: "유효한 전화번호를 입력해주세요." }).optional().or(z.literal("")),
  memberType: z.string(),
  hospitalId: z.string().optional().or(z.literal("")),
});

type UserEditFormValues = z.infer<typeof userEditSchema>;

interface UserEditDialogProps {
  userId: number | null;
  open: boolean;
  onClose: () => void;
}

const UserEditDialog: React.FC<UserEditDialogProps> = ({
  userId,
  open,
  onClose,
}) => {
  const queryClient = useQueryClient();
  const { user: currentUser } = useAuth();
  const [hospitals, setHospitals] = useState<any[]>([]);
  const [showHospitalSelect, setShowHospitalSelect] = useState(false);
  
  // 병원 정보 수정 권한 확인 (슈퍼관리자만 가능)
  const canEditHospital = currentUser?.memberType === 'superadmin';

  // 병원 목록 가져오기
  const { data: hospitalsData, isLoading: isHospitalsLoading } = useQuery({
    queryKey: ["/api/super/hospitals"],
    queryFn: async () => {
      const response = await fetch("/api/super/hospitals", {
        credentials: "include",
      });
      if (!response.ok) {
        throw new Error("병원 목록을 가져오는데 실패했습니다");
      }
      return response.json();
    },
    enabled: open,
  });

  useEffect(() => {
    if (hospitalsData) {
      setHospitals(hospitalsData);
    }
  }, [hospitalsData]);

  // 사용자 상세 정보 조회
  const { 
    data: userData, 
    isLoading: isUserLoading, 
    error: userError 
  } = useQuery({
    queryKey: ["/api/super/users", userId],
    queryFn: async () => {
      if (!userId) return null;
      const response = await fetch(`/api/super/users/${userId}`, {
        credentials: "include",
      });
      if (!response.ok) {
        throw new Error("사용자 정보를 가져오는데 실패했습니다");
      }
      return response.json();
    },
    enabled: open && userId !== null,
  });

  // React Hook Form 설정
  const {
    handleSubmit,
    control,
    reset,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<UserEditFormValues>({
    resolver: zodResolver(userEditSchema),
    defaultValues: {
      email: "",
      fullName: "",
      phoneNumber: "",
      memberType: "general",
      hospitalId: "",
    },
  });

  // 회원 유형에 따라 병원 선택 표시 여부 결정
  const memberType = watch("memberType");
  
  useEffect(() => {
    setShowHospitalSelect(
      memberType === "hospital_admin" || memberType === "pro"
    );
  }, [memberType]);

  // 사용자 정보가 로드되면 폼 초기값 설정
  useEffect(() => {
    if (userData) {
      reset({
        email: userData.email || "",
        fullName: userData.fullName || "",
        phoneNumber: userData.phoneNumber || "",
        memberType: userData.memberType || "general",
        hospitalId: userData.hospitalId ? String(userData.hospitalId) : "",
      });
    }
  }, [userData, reset]);

  // 사용자 수정 뮤테이션
  const updateUserMutation = useMutation({
    mutationFn: async (data: UserEditFormValues) => {
      if (!userId) return null;
      
      const formattedData = {
        ...data,
        hospitalId: data.hospitalId ? parseInt(data.hospitalId) : null,
      };
      
      const response = await fetch(`/api/super/users/${userId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(formattedData),
        credentials: "include",
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "사용자 정보 수정에 실패했습니다");
      }
      
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "성공",
        description: "사용자 정보가 성공적으로 수정되었습니다.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/super/users"] });
      onClose();
    },
    onError: (error: Error) => {
      toast({
        title: "오류",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // 폼 제출 핸들러
  const onSubmit = (data: UserEditFormValues) => {
    updateUserMutation.mutate(data);
  };

  if (!open) return null;

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>회원 정보 수정</DialogTitle>
          <DialogDescription>
            회원의 정보를 수정할 수 있습니다.
          </DialogDescription>
        </DialogHeader>

        {isUserLoading ? (
          <div className="flex justify-center items-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : userError ? (
          <div className="py-6 text-center text-destructive">
            정보를 불러오는데 실패했습니다. 다시 시도해주세요.
          </div>
        ) : userData ? (
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="username">사용자명 (변경불가)</Label>
              <Input
                id="username"
                value={userData.username}
                disabled
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="fullName">이름</Label>
              <Controller
                name="fullName"
                control={control}
                render={({ field }) => (
                  <Input
                    id="fullName"
                    placeholder="이름을 입력하세요"
                    {...field}
                  />
                )}
              />
              {errors.fullName && (
                <p className="text-sm text-destructive">{errors.fullName.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">이메일</Label>
              <Controller
                name="email"
                control={control}
                render={({ field }) => (
                  <Input
                    id="email"
                    type="email"
                    placeholder="이메일을 입력하세요"
                    {...field}
                  />
                )}
              />
              {errors.email && (
                <p className="text-sm text-destructive">{errors.email.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="phoneNumber">전화번호</Label>
              <Controller
                name="phoneNumber"
                control={control}
                render={({ field }) => (
                  <Input
                    id="phoneNumber"
                    placeholder="전화번호를 입력하세요"
                    {...field}
                  />
                )}
              />
              {errors.phoneNumber && (
                <p className="text-sm text-destructive">{errors.phoneNumber.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="memberType">회원 유형</Label>
              <Controller
                name="memberType"
                control={control}
                render={({ field }) => (
                  <Select
                    onValueChange={field.onChange}
                    defaultValue={field.value}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="회원 유형을 선택하세요" />
                    </SelectTrigger>
                    <SelectContent>
                      {memberTypeOptions.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </div>

            {showHospitalSelect && (
              <div className="space-y-2">
                <Label htmlFor="hospitalId">
                  소속 병원 {!canEditHospital && "(슈퍼관리자만 수정 가능)"}
                </Label>
                {canEditHospital ? (
                  <Controller
                    name="hospitalId"
                    control={control}
                    render={({ field }) => (
                      <Select
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="병원을 선택하세요" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="">선택 안함</SelectItem>
                          {hospitals.map((hospital) => (
                            <SelectItem key={hospital.id} value={hospital.id.toString()}>
                              {hospital.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  />
                ) : (
                  <div className="p-2 border rounded-md bg-muted/20">
                    {hospitals.find(h => h.id.toString() === watch("hospitalId"))?.name || "병원 미선택"}
                  </div>
                )}
              </div>
            )}

            <DialogFooter className="pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={onClose}
                disabled={isSubmitting}
              >
                취소
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    저장 중...
                  </>
                ) : (
                  "저장"
                )}
              </Button>
            </DialogFooter>
          </form>
        ) : (
          <div className="py-6 text-center">
            사용자 정보가 없습니다.
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default UserEditDialog;