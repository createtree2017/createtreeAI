import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Checkbox } from "@/components/ui/checkbox";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Edit, Plus, Trash2 } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";

// 마일스톤 카테고리 유효성 검사 스키마
const categoryFormSchema = z.object({
  categoryId: z.string().min(2, "ID는 최소 2자 이상이어야 합니다"),
  name: z.string().min(2, "이름은 최소 2자 이상이어야 합니다"),
  description: z.string().optional(),
  emoji: z.string().min(1, "이모지를 입력해주세요"),
  order: z.coerce.number().int().min(0),
  isActive: z.boolean().default(true),
});

type CategoryFormValues = z.infer<typeof categoryFormSchema>;

// 마일스톤 카테고리 관리 컴포넌트
export default function MilestoneCategoryManagement() {
  const queryClient = useQueryClient();
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<any>(null);

  // 카테고리 목록 가져오기
  const { data: categories = [], isLoading } = useQuery({
    queryKey: ['/api/milestone-categories'],
    queryFn: async () => {
      try {
        const response = await apiRequest('/api/milestone-categories') as any;
        return Array.isArray(response) ? response : [];
      } catch (error) {
        console.error("카테고리 데이터 로딩 중 오류:", error);
        return [];
      }
    }
  });

  // 생성 폼
  const createForm = useForm<CategoryFormValues>({
    resolver: zodResolver(categoryFormSchema),
    defaultValues: {
      categoryId: "",
      name: "",
      description: "",
      emoji: "📌",
      order: 0,
      isActive: true,
    }
  });

  // 수정 폼
  const editForm = useForm<CategoryFormValues>({
    resolver: zodResolver(categoryFormSchema),
    defaultValues: {
      categoryId: "",
      name: "",
      description: "",
      emoji: "📌",
      order: 0,
      isActive: true,
    }
  });

  // 카테고리 생성 뮤테이션
  const createCategoryMutation = useMutation({
    mutationFn: async (data: CategoryFormValues) => {
      return apiRequest('/api/admin/milestone-categories', {
        method: 'POST',
        data
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/milestone-categories'] });
      toast({
        title: "카테고리 생성 성공",
        description: "새로운 마일스톤 카테고리가 성공적으로 생성되었습니다."
      });
      setIsCreateDialogOpen(false);
      createForm.reset();
    },
    onError: (error) => {
      toast({
        title: "카테고리 생성 실패",
        description: "마일스톤 카테고리 생성 중 오류가 발생했습니다.",
        variant: "destructive"
      });
      console.error("카테고리 생성 에러:", error);
    }
  });

  // 카테고리 수정 뮤테이션
  const updateCategoryMutation = useMutation({
    mutationFn: async (data: CategoryFormValues) => {
      return apiRequest(`/api/admin/milestone-categories/${data.categoryId}`, {
        method: 'PUT',
        data
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/milestone-categories'] });
      toast({
        title: "카테고리 수정 성공",
        description: "마일스톤 카테고리가 성공적으로 수정되었습니다."
      });
      setIsEditDialogOpen(false);
    },
    onError: (error) => {
      toast({
        title: "카테고리 수정 실패",
        description: "마일스톤 카테고리 수정 중 오류가 발생했습니다.",
        variant: "destructive"
      });
      console.error("카테고리 수정 에러:", error);
    }
  });

  // 카테고리 삭제 뮤테이션
  const deleteCategoryMutation = useMutation({
    mutationFn: async (categoryId: string) => {
      return apiRequest(`/api/admin/milestone-categories/${categoryId}`, {
        method: 'DELETE'
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/milestone-categories'] });
      toast({
        title: "카테고리 삭제 성공",
        description: "마일스톤 카테고리가 성공적으로 삭제되었습니다."
      });
      setIsDeleteDialogOpen(false);
      setSelectedCategory(null);
    },
    onError: (error: any) => {
      toast({
        title: "카테고리 삭제 실패",
        description: error?.message || "마일스톤 카테고리 삭제 중 오류가 발생했습니다.",
        variant: "destructive"
      });
      console.error("카테고리 삭제 에러:", error);
    }
  });

  // 카테고리 생성 제출 핸들러
  const onCreateSubmit = (data: CategoryFormValues) => {
    createCategoryMutation.mutate(data);
  };

  // 카테고리 수정 제출 핸들러
  const onEditSubmit = (data: CategoryFormValues) => {
    updateCategoryMutation.mutate(data);
  };

  // 카테고리 삭제 핸들러
  const onDelete = () => {
    if (selectedCategory) {
      deleteCategoryMutation.mutate(selectedCategory.categoryId);
    }
  };

  // 카테고리 수정 시작 핸들러
  const startEditing = (category: any) => {
    setSelectedCategory(category);
    editForm.reset({
      categoryId: category.categoryId,
      name: category.name,
      description: category.description || "",
      emoji: category.emoji,
      order: category.order,
      isActive: category.isActive,
    });
    setIsEditDialogOpen(true);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold tracking-tight">마일스톤 카테고리 관리</h2>
        <Button onClick={() => setIsCreateDialogOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          카테고리 추가
        </Button>
      </div>

      {isLoading ? (
        <div className="text-center py-10">데이터를 불러오는 중...</div>
      ) : (
        <div className="bg-card rounded-lg border shadow-sm">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>ID</TableHead>
                <TableHead>이모지</TableHead>
                <TableHead>이름</TableHead>
                <TableHead>설명</TableHead>
                <TableHead>상태</TableHead>
                <TableHead>순서</TableHead>
                <TableHead className="text-right">작업</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {categories.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center h-32 text-muted-foreground">
                    등록된 카테고리가 없습니다
                  </TableCell>
                </TableRow>
              ) : (
                categories.map((category: any) => (
                  <TableRow key={category.categoryId}>
                    <TableCell className="font-mono text-xs">{category.categoryId}</TableCell>
                    <TableCell className="text-xl">{category.emoji}</TableCell>
                    <TableCell className="font-medium">{category.name}</TableCell>
                    <TableCell className="max-w-xs truncate">{category.description}</TableCell>
                    <TableCell>
                      <span className={`px-2 py-1 rounded-full text-xs ${category.isActive ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>
                        {category.isActive ? '활성' : '비활성'}
                      </span>
                    </TableCell>
                    <TableCell>{category.order}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button variant="outline" size="icon" onClick={() => startEditing(category)}>
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button 
                          variant="outline" 
                          size="icon" 
                          className="text-red-500 hover:text-red-600"
                          onClick={() => {
                            setSelectedCategory(category);
                            setIsDeleteDialogOpen(true);
                          }}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      )}

      {/* 카테고리 생성 다이얼로그 */}
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>새 마일스톤 카테고리 추가</DialogTitle>
            <DialogDescription>
              마일스톤을 분류하기 위한 새로운 카테고리를 추가합니다.
            </DialogDescription>
          </DialogHeader>

          <Form {...createForm}>
            <form onSubmit={createForm.handleSubmit(onCreateSubmit)} className="space-y-4">
              <FormField
                control={createForm.control}
                name="categoryId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>카테고리 ID</FormLabel>
                    <FormControl>
                      <Input placeholder="category-id-format" {...field} />
                    </FormControl>
                    <FormDescription>
                      고유한 영문 ID (예: baby-development)
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={createForm.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>이름</FormLabel>
                    <FormControl>
                      <Input placeholder="카테고리 이름" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={createForm.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>설명</FormLabel>
                    <FormControl>
                      <Textarea 
                        placeholder="카테고리에 대한 설명 (선택사항)"
                        className="min-h-[80px]" 
                        {...field} 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={createForm.control}
                  name="emoji"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>이모지</FormLabel>
                      <FormControl>
                        <Input placeholder="📌" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={createForm.control}
                  name="order"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>표시 순서</FormLabel>
                      <FormControl>
                        <Input type="number" min={0} {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={createForm.control}
                name="isActive"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-start space-x-3 space-y-0 py-1">
                    <FormControl>
                      <Checkbox
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                    <div className="space-y-1 leading-none">
                      <FormLabel>활성화</FormLabel>
                      <FormDescription>
                        카테고리 활성화 여부
                      </FormDescription>
                    </div>
                  </FormItem>
                )}
              />

              <DialogFooter>
                <Button type="submit" className="w-full">카테고리 생성</Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* 카테고리 수정 다이얼로그 */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>마일스톤 카테고리 수정</DialogTitle>
            <DialogDescription>
              마일스톤 카테고리 정보를 수정합니다.
            </DialogDescription>
          </DialogHeader>

          <Form {...editForm}>
            <form onSubmit={editForm.handleSubmit(onEditSubmit)} className="space-y-4">
              <FormField
                control={editForm.control}
                name="categoryId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>카테고리 ID</FormLabel>
                    <FormControl>
                      <Input placeholder="category-id-format" {...field} disabled />
                    </FormControl>
                    <FormDescription>
                      카테고리 ID는 변경할 수 없습니다
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={editForm.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>이름</FormLabel>
                    <FormControl>
                      <Input placeholder="카테고리 이름" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={editForm.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>설명</FormLabel>
                    <FormControl>
                      <Textarea 
                        placeholder="카테고리에 대한 설명 (선택사항)"
                        className="min-h-[80px]" 
                        {...field} 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={editForm.control}
                  name="emoji"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>이모지</FormLabel>
                      <FormControl>
                        <Input placeholder="📌" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={editForm.control}
                  name="order"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>표시 순서</FormLabel>
                      <FormControl>
                        <Input type="number" min={0} {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={editForm.control}
                name="isActive"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-start space-x-3 space-y-0 py-1">
                    <FormControl>
                      <Checkbox
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                    <div className="space-y-1 leading-none">
                      <FormLabel>활성화</FormLabel>
                      <FormDescription>
                        카테고리 활성화 여부
                      </FormDescription>
                    </div>
                  </FormItem>
                )}
              />

              <DialogFooter>
                <Button type="submit" className="w-full">카테고리 수정</Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* 카테고리 삭제 확인 다이얼로그 */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>마일스톤 카테고리 삭제</DialogTitle>
            <DialogDescription>
              정말로 이 카테고리를 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.
              카테고리를 사용하는 마일스톤이 있는 경우 삭제할 수 없습니다.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:justify-center">
            <Button 
              type="button" 
              variant="outline" 
              onClick={() => setIsDeleteDialogOpen(false)}
            >
              취소
            </Button>
            <Button 
              type="button" 
              variant="destructive" 
              onClick={onDelete}
              className="bg-red-500 hover:bg-red-600"
            >
              삭제
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}