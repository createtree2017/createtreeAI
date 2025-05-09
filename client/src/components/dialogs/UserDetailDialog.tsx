import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
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
import { Separator } from "@/components/ui/separator";
import { Loader2 } from "lucide-react";
import { format } from "date-fns";
import { ko } from "date-fns/locale";

// 멤버십 타입 한글 표시
const memberTypeLabels = {
  superadmin: "슈퍼관리자",
  admin: "관리자",
  hospital_admin: "병원관리자",
  pro: "프로회원",
  general: "일반회원"
};

interface UserDetailDialogProps {
  userId: number | null;
  open: boolean;
  onClose: () => void;
}

const UserDetailDialog: React.FC<UserDetailDialogProps> = ({
  userId,
  open,
  onClose,
}) => {
  // 사용자 상세 정보 조회
  const { data: userData, isLoading, error } = useQuery({
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

  if (!open) return null;

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>회원 상세 정보</DialogTitle>
          <DialogDescription>
            회원의 상세 정보를 확인할 수 있습니다.
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="flex justify-center items-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : error ? (
          <div className="py-6 text-center text-destructive">
            정보를 불러오는데 실패했습니다. 다시 시도해주세요.
          </div>
        ) : userData ? (
          <div className="py-4">
            <dl className="space-y-4">
              <div className="flex justify-between">
                <dt className="font-medium text-muted-foreground">ID</dt>
                <dd>{userData.id}</dd>
              </div>
              <Separator />
              
              <div className="flex justify-between">
                <dt className="font-medium text-muted-foreground">사용자명</dt>
                <dd>{userData.username}</dd>
              </div>
              <Separator />
              
              <div className="flex justify-between">
                <dt className="font-medium text-muted-foreground">이름</dt>
                <dd>{userData.fullName || '-'}</dd>
              </div>
              <Separator />
              
              <div className="flex justify-between">
                <dt className="font-medium text-muted-foreground">이메일</dt>
                <dd>{userData.email || '-'}</dd>
              </div>
              <Separator />
              
              <div className="flex justify-between">
                <dt className="font-medium text-muted-foreground">전화번호</dt>
                <dd>{userData.phoneNumber || '-'}</dd>
              </div>
              <Separator />
              
              <div className="flex justify-between">
                <dt className="font-medium text-muted-foreground">회원 유형</dt>
                <dd>
                  <Badge variant="outline">
                    {memberTypeLabels[userData.memberType as keyof typeof memberTypeLabels] || userData.memberType}
                  </Badge>
                </dd>
              </div>
              <Separator />
              
              <div className="flex justify-between">
                <dt className="font-medium text-muted-foreground">소속 병원</dt>
                <dd>{userData.hospital?.name || '-'}</dd>
              </div>
              <Separator />
              
              <div className="flex justify-between">
                <dt className="font-medium text-muted-foreground">가입일</dt>
                <dd>
                  {userData.createdAt && format(new Date(userData.createdAt), 'yyyy년 MM월 dd일', { locale: ko })}
                </dd>
              </div>
              <Separator />
              
              <div className="flex justify-between">
                <dt className="font-medium text-muted-foreground">최근 로그인</dt>
                <dd>
                  {userData.lastLogin 
                    ? format(new Date(userData.lastLogin), 'yyyy년 MM월 dd일 HH:mm', { locale: ko })
                    : '-'}
                </dd>
              </div>
            </dl>
          </div>
        ) : (
          <div className="py-6 text-center">
            사용자 정보가 없습니다.
          </div>
        )}

        <DialogFooter>
          <Button onClick={onClose}>닫기</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default UserDetailDialog;