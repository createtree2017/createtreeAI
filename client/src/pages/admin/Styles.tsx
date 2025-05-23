/**
 * Dream Book 이미지 일관성 고도화 - 스타일 관리 Admin UI
 * 작업지시서 4단계: 썸네일 목록 + 추가/수정/삭제/기본지정
 */

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Plus, Edit, Trash2, Star, StarOff, Image as ImageIcon } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";

interface StyleTemplate {
  id: number;
  name: string;
  prompt: string;
  thumbnailUrl?: string;
  isDefault: boolean;
  createdAt: string;
  updatedAt: string;
}

interface StyleFormData {
  name: string;
  prompt: string;
  thumbnailUrl: string;
  isDefault: boolean;
}

export default function StylesAdmin() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingStyle, setEditingStyle] = useState<StyleTemplate | null>(null);
  const [formData, setFormData] = useState<StyleFormData>({
    name: "",
    prompt: "",
    thumbnailUrl: "",
    isDefault: false
  });

  const { toast } = useToast();
  const queryClient = useQueryClient();

  // 스타일 목록 조회
  const { data: styles = [], isLoading } = useQuery({
    queryKey: ["/api/admin/style-templates"],
    retry: false
  });

  // 스타일 생성/수정 뮤테이션
  const createStyleMutation = useMutation({
    mutationFn: (data: StyleFormData) => 
      apiRequest("/api/admin/style-templates", "POST", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/style-templates"] });
      setIsDialogOpen(false);
      resetForm();
      toast({
        title: "성공",
        description: "스타일이 성공적으로 생성되었습니다.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "오류",
        description: error.message || "스타일 생성에 실패했습니다.",
        variant: "destructive"
      });
    }
  });

  const updateStyleMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: StyleFormData }) =>
      apiRequest(`/api/admin/style-templates/${id}`, "PUT", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/style-templates"] });
      setIsDialogOpen(false);
      resetForm();
      toast({
        title: "성공", 
        description: "스타일이 성공적으로 수정되었습니다.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "오류",
        description: error.message || "스타일 수정에 실패했습니다.",
        variant: "destructive"
      });
    }
  });

  // 스타일 삭제 뮤테이션
  const deleteStyleMutation = useMutation({
    mutationFn: (id: number) => 
      apiRequest(`/api/admin/style-templates/${id}`, "DELETE"),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/style-templates"] });
      toast({
        title: "성공",
        description: "스타일이 성공적으로 삭제되었습니다.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "오류", 
        description: error.message || "스타일 삭제에 실패했습니다.",
        variant: "destructive"
      });
    }
  });

  // 기본 스타일 설정 뮤테이션
  const setDefaultMutation = useMutation({
    mutationFn: (id: number) =>
      apiRequest(`/api/admin/style-templates/${id}/set-default`, "PUT"),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/style-templates"] });
      toast({
        title: "성공",
        description: "기본 스타일이 설정되었습니다.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "오류",
        description: error.message || "기본 스타일 설정에 실패했습니다.", 
        variant: "destructive"
      });
    }
  });

  const resetForm = () => {
    setFormData({
      name: "",
      prompt: "",
      thumbnailUrl: "",
      isDefault: false
    });
    setEditingStyle(null);
  };

  const openCreateDialog = () => {
    resetForm();
    setIsDialogOpen(true);
  };

  const openEditDialog = (style: StyleTemplate) => {
    setEditingStyle(style);
    setFormData({
      name: style.name,
      prompt: style.prompt,
      thumbnailUrl: style.thumbnailUrl || "",
      isDefault: style.isDefault
    });
    setIsDialogOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (editingStyle) {
      updateStyleMutation.mutate({ id: editingStyle.id, data: formData });
    } else {
      createStyleMutation.mutate(formData);
    }
  };

  const handleDelete = (id: number, name: string) => {
    if (window.confirm(`"${name}" 스타일을 정말 삭제하시겠습니까?`)) {
      deleteStyleMutation.mutate(id);
    }
  };

  const handleSetDefault = (id: number, name: string) => {
    if (window.confirm(`"${name}"을(를) 기본 스타일로 설정하시겠습니까?`)) {
      setDefaultMutation.mutate(id);
    }
  };

  if (isLoading) {
    return (
      <div className="container mx-auto py-8">
        <div className="flex justify-center items-center h-64">
          <div className="text-lg">스타일 목록을 불러오는 중...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold">스타일 관리</h1>
          <p className="text-muted-foreground mt-2">
            태몽동화 이미지 생성에 사용되는 스타일 템플릿을 관리합니다.
          </p>
        </div>
        <Button onClick={openCreateDialog} className="flex items-center gap-2">
          <Plus className="w-4 h-4" />
          새 스타일 추가
        </Button>
      </div>

      {/* 스타일 그리드 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {styles.map((style: StyleTemplate) => (
          <Card key={style.id} className="relative">
            <CardHeader className="pb-3">
              <div className="flex justify-between items-start">
                <CardTitle className="flex items-center gap-2">
                  {style.name}
                  {style.isDefault && (
                    <Badge variant="default" className="text-xs">
                      기본값
                    </Badge>
                  )}
                </CardTitle>
                <div className="flex gap-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleSetDefault(style.id, style.name)}
                    disabled={style.isDefault}
                  >
                    {style.isDefault ? <Star className="w-4 h-4 fill-current" /> : <StarOff className="w-4 h-4" />}
                  </Button>
                  <Button 
                    variant="ghost" 
                    size="sm"
                    onClick={() => openEditDialog(style)}
                  >
                    <Edit className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDelete(style.id, style.name)}
                    disabled={style.isDefault}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {/* 썸네일 */}
              <div className="mb-4 bg-gray-100 rounded-lg h-32 flex items-center justify-center">
                {style.thumbnailUrl ? (
                  <img 
                    src={style.thumbnailUrl} 
                    alt={style.name}
                    className="w-full h-full object-cover rounded-lg"
                  />
                ) : (
                  <div className="text-gray-400 flex flex-col items-center gap-2">
                    <ImageIcon className="w-8 h-8" />
                    <span className="text-sm">썸네일 없음</span>
                  </div>
                )}
              </div>
              
              {/* 프롬프트 미리보기 */}
              <div className="text-sm text-muted-foreground">
                <p className="line-clamp-3">{style.prompt}</p>
              </div>
              
              {/* 메타데이터 */}
              <div className="mt-4 text-xs text-muted-foreground">
                생성일: {new Date(style.createdAt).toLocaleDateString()}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {styles.length === 0 && (
        <Card className="text-center py-12">
          <CardContent>
            <ImageIcon className="w-12 h-12 mx-auto text-gray-400 mb-4" />
            <h3 className="text-lg font-medium mb-2">등록된 스타일이 없습니다</h3>
            <p className="text-muted-foreground mb-4">
              첫 번째 스타일 템플릿을 추가해보세요.
            </p>
            <Button onClick={openCreateDialog}>스타일 추가하기</Button>
          </CardContent>
        </Card>
      )}

      {/* 생성/수정 다이얼로그 */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {editingStyle ? "스타일 수정" : "새 스타일 추가"}
            </DialogTitle>
          </DialogHeader>
          
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="name">스타일 이름</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="예: 디즈니풍"
                  required
                />
              </div>
              
              <div>
                <Label htmlFor="thumbnailUrl">썸네일 URL</Label>
                <Input
                  id="thumbnailUrl"
                  value={formData.thumbnailUrl}
                  onChange={(e) => setFormData({ ...formData, thumbnailUrl: e.target.value })}
                  placeholder="https://example.com/thumbnail.png"
                />
              </div>
            </div>
            
            <div>
              <Label htmlFor="prompt">스타일 프롬프트</Label>
              <Textarea
                id="prompt"
                value={formData.prompt}
                onChange={(e) => setFormData({ ...formData, prompt: e.target.value })}
                placeholder="이미지 생성에 사용될 스타일 지시사항을 입력하세요..."
                rows={6}
                required
              />
            </div>
            
            <div className="flex items-center space-x-2">
              <Switch
                id="isDefault"
                checked={formData.isDefault}
                onCheckedChange={(checked) => setFormData({ ...formData, isDefault: checked })}
              />
              <Label htmlFor="isDefault">기본 스타일로 설정</Label>
            </div>
            
            <div className="flex justify-end gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsDialogOpen(false)}
              >
                취소
              </Button>
              <Button
                type="submit"
                disabled={createStyleMutation.isPending || updateStyleMutation.isPending}
              >
                {editingStyle ? "수정" : "생성"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}