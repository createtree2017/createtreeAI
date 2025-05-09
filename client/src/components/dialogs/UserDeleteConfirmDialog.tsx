import React from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";

interface UserDeleteConfirmDialogProps {
  userId: number | null;
  username: string;
  open: boolean;
  onClose: () => void;
}

const UserDeleteConfirmDialog: React.FC<UserDeleteConfirmDialogProps> = ({
  userId,
  username,
  open,
  onClose,
}) => {
  const queryClient = useQueryClient();
  
  // 사용자 삭제 뮤테이션
  const deleteUserMutation = useMutation({
    mutationFn: async () => {
      if (!userId) return null;
      
      const response = await fetch(`/api/super/users/${userId}`, {
        method: "DELETE",
        credentials: "include",
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "사용자 삭제에 실패했습니다");
      }
      
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "성공",
        description: "사용자가 성공적으로 삭제되었습니다.",
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

  const handleConfirm = () => {
    deleteUserMutation.mutate();
  };

  if (!open) return null;

  return (
    <AlertDialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>정말 삭제하시겠습니까?</AlertDialogTitle>
          <AlertDialogDescription>
            사용자 <span className="font-bold">{username}</span>을(를) 삭제하면 모든 관련 데이터가 영구적으로 
            제거되며 이 작업은 되돌릴 수 없습니다.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={deleteUserMutation.isPending}>취소</AlertDialogCancel>
          <AlertDialogAction 
            onClick={handleConfirm} 
            disabled={deleteUserMutation.isPending}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {deleteUserMutation.isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                삭제 중...
              </>
            ) : (
              "삭제"
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};

export default UserDeleteConfirmDialog;