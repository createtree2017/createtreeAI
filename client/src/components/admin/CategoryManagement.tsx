import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  TableHead,
  TableRow,
  TableHeader,
  TableCell,
  TableBody,
  Table,
} from "@/components/ui/table";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { 
  getServiceCategories, 
  createServiceCategory, 
  updateServiceCategory, 
  deleteServiceCategory 
} from "@/lib/api";

// Zod 스키마 정의
const categoryFormSchema = z.object({
  title: z.string()
    .min(1, "카테고리 이름은 필수입니다.")
    .max(100, "카테고리 이름은 100자 이내로 입력해주세요."),
  icon: z.string()
    .min(1, "아이콘 이름은 필수입니다.")
    .max(50, "아이콘 이름은 50자 이내로 입력해주세요."),
  isPublic: z.boolean().default(true),
  order: z.number().int().default(0),
});

type CategoryFormValues = z.infer<typeof categoryFormSchema>;

export default function CategoryManagement() {
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<any>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: categories, isLoading } = useQuery({
    queryKey: ['/api/service-categories'],
    queryFn: getServiceCategories,
  });

  const createMutation = useMutation({
    mutationFn: (data: CategoryFormValues) => createServiceCategory(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/service-categories'] });
      toast({
        title: "카테고리 생성 완료",
        description: "새로운 서비스 카테고리가 생성되었습니다.",
      });
      setIsFormOpen(false);
    },
    onError: (error) => {
      console.error("Error creating category:", error);
      toast({
        title: "카테고리 생성 실패",
        description: "카테고리를 생성하는 중 오류가 발생했습니다.",
        variant: "destructive",
      });
    }
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number, data: CategoryFormValues }) => 
      updateServiceCategory(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/service-categories'] });
      toast({
        title: "카테고리 수정 완료",
        description: "서비스 카테고리가 업데이트되었습니다.",
      });
      setIsFormOpen(false);
      setEditingCategory(null);
    },
    onError: (error) => {
      console.error("Error updating category:", error);
      toast({
        title: "카테고리 수정 실패",
        description: "카테고리를 수정하는 중 오류가 발생했습니다.",
        variant: "destructive",
      });
    }
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => deleteServiceCategory(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/service-categories'] });
      toast({
        title: "카테고리 삭제 완료",
        description: "서비스 카테고리가 삭제되었습니다.",
      });
    },
    onError: (error) => {
      console.error("Error deleting category:", error);
      toast({
        title: "카테고리 삭제 실패",
        description: "카테고리를 삭제하는 중 오류가 발생했습니다.",
        variant: "destructive",
      });
    }
  });

  const handleCreateCategory = () => {
    setEditingCategory(null);
    setIsFormOpen(true);
  };

  const handleEditCategory = (category: any) => {
    setEditingCategory(category);
    setIsFormOpen(true);
  };

  const handleDeleteCategory = (id: number) => {
    if (window.confirm("이 카테고리를 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.")) {
      deleteMutation.mutate(id);
    }
  };

  const renderCategories = () => {
    if (isLoading) {
      return (
        <TableRow>
          <TableCell colSpan={5} className="text-center py-6">
            로딩 중...
          </TableCell>
        </TableRow>
      );
    }

    if (!categories || categories.length === 0) {
      return (
        <TableRow>
          <TableCell colSpan={5} className="text-center py-6">
            카테고리가 없습니다. 새 카테고리를 생성해주세요.
          </TableCell>
        </TableRow>
      );
    }

    return categories.map((category: any) => (
      <TableRow key={category.id}>
        <TableCell>{category.id}</TableCell>
        <TableCell className="font-medium">{category.title}</TableCell>
        <TableCell>{category.icon}</TableCell>
        <TableCell>{category.isPublic ? "공개" : "비공개"}</TableCell>
        <TableCell>{category.order}</TableCell>
        <TableCell>
          <div className="flex items-center space-x-2">
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={() => handleEditCategory(category)}
            >
              <Pencil className="w-4 h-4" />
            </Button>
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={() => handleDeleteCategory(category.id)}
            >
              <Trash2 className="w-4 h-4 text-destructive" />
            </Button>
          </div>
        </TableCell>
      </TableRow>
    ));
  };

  return (
    <Card className="w-full">
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle>카테고리 관리</CardTitle>
          <CardDescription>
            AI 서비스 카테고리를 관리하고 사이드바에 보여줄 항목을 설정합니다.
          </CardDescription>
        </div>
        <Button onClick={handleCreateCategory}>
          <Plus className="mr-2 h-4 w-4" />
          새 카테고리
        </Button>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>ID</TableHead>
              <TableHead>이름</TableHead>
              <TableHead>아이콘</TableHead>
              <TableHead>공개 상태</TableHead>
              <TableHead>순서</TableHead>
              <TableHead>작업</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {renderCategories()}
          </TableBody>
        </Table>

        {/* 카테고리 추가/수정 다이얼로그 */}
        <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>
                {editingCategory ? "카테고리 수정" : "새 카테고리 생성"}
              </DialogTitle>
              <DialogDescription>
                서비스 카테고리 정보를 입력하세요. 이 카테고리는 사이드바 메뉴에 표시됩니다.
              </DialogDescription>
            </DialogHeader>
            <CategoryForm 
              initialData={editingCategory} 
              onSubmit={(data) => {
                if (editingCategory) {
                  updateMutation.mutate({ id: editingCategory.id, data });
                } else {
                  createMutation.mutate(data);
                }
              }}
              onCancel={() => setIsFormOpen(false)}
            />
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}

interface CategoryFormProps {
  initialData?: any;
  onSubmit: (data: CategoryFormValues) => void;
  onCancel: () => void;
}

function CategoryForm({ initialData, onSubmit, onCancel }: CategoryFormProps) {
  const form = useForm<CategoryFormValues>({
    resolver: zodResolver(categoryFormSchema),
    defaultValues: initialData ? {
      title: initialData.title,
      icon: initialData.icon,
      isPublic: initialData.isPublic,
      order: initialData.order,
    } : {
      title: "",
      icon: "layout",
      isPublic: true,
      order: 0,
    },
  });

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="title"
          render={({ field }) => (
            <FormItem>
              <FormLabel>카테고리 이름</FormLabel>
              <FormControl>
                <Input placeholder="AI 이미지 만들기" {...field} />
              </FormControl>
              <FormDescription>
                사이드바에 표시될 카테고리 이름입니다.
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
              <FormControl>
                <Input placeholder="image" {...field} />
              </FormControl>
              <FormDescription>
                lucide-react 아이콘 이름을 입력하세요 (image, music, message-square 등)
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        
        <FormField
          control={form.control}
          name="isPublic"
          render={({ field }) => (
            <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
              <div className="space-y-0.5">
                <FormLabel className="text-base">공개 상태</FormLabel>
                <FormDescription>
                  이 카테고리를 사이드바에 공개할지 여부를 설정합니다.
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
              <FormLabel>순서</FormLabel>
              <FormControl>
                <Input 
                  type="number" 
                  min="0"
                  {...field}
                  onChange={(e) => field.onChange(parseInt(e.target.value))}
                />
              </FormControl>
              <FormDescription>
                사이드바에 표시될 순서입니다. 낮은 숫자가 먼저 표시됩니다.
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        
        <DialogFooter>
          <Button type="button" variant="outline" onClick={onCancel}>
            취소
          </Button>
          <Button type="submit">
            {initialData ? "수정" : "생성"}
          </Button>
        </DialogFooter>
      </form>
    </Form>
  );
}