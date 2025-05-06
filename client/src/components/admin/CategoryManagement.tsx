import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  getServiceCategories,
  createServiceCategory,
  updateServiceCategory,
  deleteServiceCategory
} from '@/lib/api';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { toast } from '@/hooks/use-toast';
import { Edit, PlusCircle, Trash2, CheckCircle, X } from 'lucide-react';
import { format } from 'date-fns';

// Lucide 아이콘 목록 (카테고리에서 선택 가능한 아이콘)
const availableIcons = [
  "ImagePlus", 
  "Image", 
  "PaintBucket", 
  "Music", 
  "Music2", 
  "MessageCircle", 
  "Users", 
  "Heart", 
  "Award", 
  "Star",
  "BookOpen",
  "Baby",
  "Puzzle",
  "LucideIcon"
];

// 폼 유효성 검사 스키마
const categoryFormSchema = z.object({
  categoryId: z.string().min(1, "카테고리 ID는 필수입니다."),
  title: z.string().min(1, "카테고리 제목은 필수입니다."),
  isPublic: z.boolean().default(true),
  icon: z.string().min(1, "아이콘은 필수입니다."),
  order: z.number().int().default(0)
});

type CategoryFormValues = z.infer<typeof categoryFormSchema>;

// 카테고리 관리 컴포넌트
export default function CategoryManagement() {
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<any>(null);
  const queryClient = useQueryClient();

  // 서비스 카테고리 데이터 가져오기
  const { data: categories, isLoading, error } = useQuery({
    queryKey: ['/api/admin/service-categories'],
    queryFn: getServiceCategories
  });

  // 카테고리 생성 mutation
  const createCategoryMutation = useMutation({
    mutationFn: (data: CategoryFormValues) => createServiceCategory(data),
    onSuccess: () => {
      toast({
        title: "카테고리 생성 완료",
        description: "새 카테고리가 성공적으로 생성되었습니다.",
      });
      setIsCreateDialogOpen(false);
      queryClient.invalidateQueries({ queryKey: ['/api/admin/service-categories'] });
    },
    onError: (error) => {
      toast({
        title: "오류 발생",
        description: "카테고리 생성 중 오류가 발생했습니다.",
        variant: "destructive",
      });
      console.error("카테고리 생성 오류:", error);
    }
  });

  // 카테고리 수정 mutation
  const updateCategoryMutation = useMutation({
    mutationFn: ({ id, data }: { id: number, data: CategoryFormValues }) => 
      updateServiceCategory(id, data),
    onSuccess: () => {
      toast({
        title: "카테고리 수정 완료",
        description: "카테고리가 성공적으로 업데이트되었습니다.",
      });
      setIsEditDialogOpen(false);
      queryClient.invalidateQueries({ queryKey: ['/api/admin/service-categories'] });
    },
    onError: (error) => {
      toast({
        title: "오류 발생",
        description: "카테고리 수정 중 오류가 발생했습니다.",
        variant: "destructive",
      });
      console.error("카테고리 수정 오류:", error);
    }
  });

  // 카테고리 삭제 mutation
  const deleteCategoryMutation = useMutation({
    mutationFn: (id: number) => deleteServiceCategory(id),
    onSuccess: () => {
      toast({
        title: "카테고리 삭제 완료",
        description: "카테고리가 성공적으로 삭제되었습니다.",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/service-categories'] });
    },
    onError: (error) => {
      toast({
        title: "오류 발생",
        description: "카테고리 삭제 중 오류가 발생했습니다.",
        variant: "destructive",
      });
      console.error("카테고리 삭제 오류:", error);
    }
  });

  // 카테고리 편집 핸들러
  const handleEditCategory = (category: any) => {
    setEditingCategory(category);
    setIsEditDialogOpen(true);
  };

  // 카테고리 삭제 핸들러
  const handleDeleteCategory = (id: number) => {
    if (window.confirm("이 카테고리를 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.")) {
      deleteCategoryMutation.mutate(id);
    }
  };

  // 공개/비공개 상태 전환 핸들러
  const handleTogglePublic = (category: any, isPublic: boolean) => {
    updateCategoryMutation.mutate({
      id: category.id,
      data: {
        ...category,
        isPublic
      }
    });
  };

  if (isLoading) {
    return <div className="text-center py-10">카테고리를 불러오는 중...</div>;
  }

  if (error) {
    return (
      <div className="text-center py-10 text-red-500">
        카테고리를 불러오는 도중 오류가 발생했습니다. 페이지를 새로고침해 주세요.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h3 className="text-xl font-semibold">서비스 카테고리 관리</h3>
        <Button onClick={() => setIsCreateDialogOpen(true)}>
          <PlusCircle className="h-4 w-4 mr-2" />
          새 카테고리 추가
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>서비스 카테고리</CardTitle>
          <CardDescription>
            사이드바에 표시되는 AI 서비스 카테고리의 이름 변경 및 공개/비공개 설정을 관리합니다.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {categories && categories.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>ID</TableHead>
                  <TableHead>아이콘</TableHead>
                  <TableHead>카테고리 제목</TableHead>
                  <TableHead>공개 상태</TableHead>
                  <TableHead>표시 순서</TableHead>
                  <TableHead>생성일</TableHead>
                  <TableHead>작업</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {categories.map((category: any) => (
                  <TableRow key={category.id}>
                    <TableCell className="font-mono text-sm">
                      {category.categoryId}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="px-2 py-1">
                        {category.icon}
                      </Badge>
                    </TableCell>
                    <TableCell className="font-medium">{category.title}</TableCell>
                    <TableCell>
                      <div className="flex items-center space-x-2">
                        <Switch 
                          checked={category.isPublic} 
                          onCheckedChange={(checked) => handleTogglePublic(category, checked)}
                        />
                        <span className={category.isPublic ? "text-green-600" : "text-red-600"}>
                          {category.isPublic ? "공개" : "비공개"}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>{category.order}</TableCell>
                    <TableCell>
                      {category.createdAt ? format(new Date(category.createdAt), 'yyyy-MM-dd') : '-'}
                    </TableCell>
                    <TableCell>
                      <div className="flex space-x-2">
                        <Button variant="ghost" size="sm" onClick={() => handleEditCategory(category)}>
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => handleDeleteCategory(category.id)}>
                          <Trash2 className="h-4 w-4 text-red-500" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="text-center py-10 bg-gray-50 rounded-lg border border-dashed border-gray-300">
              <p className="text-gray-500">등록된 카테고리가 없습니다. 첫 번째 카테고리를 추가해 보세요!</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* 카테고리 생성 다이얼로그 */}
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>새 카테고리 추가</DialogTitle>
            <DialogDescription>
              사이드바에 표시될 AI 서비스 카테고리를 추가합니다.
            </DialogDescription>
          </DialogHeader>
          <CategoryForm 
            onSubmit={(data) => createCategoryMutation.mutate(data)} 
            isPending={createCategoryMutation.isPending}
          />
        </DialogContent>
      </Dialog>

      {/* 카테고리 수정 다이얼로그 */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>카테고리 수정</DialogTitle>
            <DialogDescription>
              선택한 카테고리의 정보를 수정합니다.
            </DialogDescription>
          </DialogHeader>
          {editingCategory && (
            <CategoryForm 
              initialData={editingCategory}
              onSubmit={(data) => updateCategoryMutation.mutate({ id: editingCategory.id, data })} 
              isPending={updateCategoryMutation.isPending}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

// 카테고리 폼 컴포넌트
function CategoryForm({ 
  initialData, 
  onSubmit, 
  isPending 
}: { 
  initialData?: any, 
  onSubmit: (data: CategoryFormValues) => void,
  isPending: boolean
}) {
  const form = useForm<CategoryFormValues>({
    resolver: zodResolver(categoryFormSchema),
    defaultValues: initialData ? {
      categoryId: initialData.categoryId,
      title: initialData.title,
      isPublic: initialData.isPublic,
      icon: initialData.icon,
      order: initialData.order
    } : {
      categoryId: '',
      title: '',
      isPublic: true,
      icon: 'ImagePlus',
      order: 0
    }
  });

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <FormField
          control={form.control}
          name="categoryId"
          render={({ field }) => (
            <FormItem>
              <FormLabel>카테고리 ID</FormLabel>
              <FormControl>
                <Input 
                  placeholder="image, music, chat 등" 
                  {...field} 
                  disabled={!!initialData}
                />
              </FormControl>
              <FormDescription>
                고유 ID로 시스템에서 사용됩니다 (예: image, music, chat)
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="title"
          render={({ field }) => (
            <FormItem>
              <FormLabel>카테고리 제목</FormLabel>
              <FormControl>
                <Input placeholder="AI 이미지 만들기" {...field} />
              </FormControl>
              <FormDescription>
                사이드바에 표시될 카테고리 제목입니다.
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="icon"
          render={({ field }) => (
            <FormItem>
              <FormLabel>아이콘</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="아이콘 선택" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {availableIcons.map((icon) => (
                    <SelectItem key={icon} value={icon}>
                      {icon}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormDescription>
                카테고리 옆에 표시될 Lucide 아이콘을 선택하세요.
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="isPublic"
          render={({ field }) => (
            <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm">
              <div className="space-y-0.5">
                <FormLabel>공개 상태</FormLabel>
                <FormDescription>
                  이 카테고리가 사이드바에 표시될지 여부를 설정합니다.
                </FormDescription>
              </div>
              <FormControl>
                <Switch
                  checked={field.value}
                  onCheckedChange={field.onChange}
                />
              </FormControl>
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="order"
          render={({ field }) => (
            <FormItem>
              <FormLabel>표시 순서</FormLabel>
              <FormControl>
                <Input 
                  type="number" 
                  {...field}
                  onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                />
              </FormControl>
              <FormDescription>
                낮은 번호가 먼저, 높은 번호가 나중에 표시됩니다.
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <DialogFooter>
          <Button type="submit" disabled={isPending}>
            {isPending && <span className="mr-2 animate-spin">🔄</span>}
            {initialData ? '카테고리 수정' : '카테고리 생성'}
          </Button>
        </DialogFooter>
      </form>
    </Form>
  );
}