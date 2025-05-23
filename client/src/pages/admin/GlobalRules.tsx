/**
 * Dream Book 이미지 일관성 고도화 - 전역 규칙 관리 Admin UI  
 * 작업지시서 5단계: 규칙 목록, JSON 편집, 활성화 토글(항상 1개만 활성화)
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
import { Plus, Edit, Trash2, Power, PowerOff, Settings } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";

interface GlobalPromptRule {
  id: number;
  name: string;
  jsonRules: any;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

interface RuleFormData {
  name: string;
  jsonRules: string; // JSON 문자열 형태로 편집
  isActive: boolean;
}

export default function GlobalRulesAdmin() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingRule, setEditingRule] = useState<GlobalPromptRule | null>(null);
  const [formData, setFormData] = useState<RuleFormData>({
    name: "",
    jsonRules: "",
    isActive: false
  });

  const { toast } = useToast();
  const queryClient = useQueryClient();

  // 전역 규칙 목록 조회
  const { data: rules = [], isLoading } = useQuery({
    queryKey: ["/api/admin/global-prompt-rules"],
    retry: false
  });

  // 규칙 생성/수정 뮤테이션
  const createRuleMutation = useMutation({
    mutationFn: (data: RuleFormData) => {
      try {
        const parsedData = {
          ...data,
          jsonRules: JSON.parse(data.jsonRules)
        };
        return apiRequest("/api/admin/global-prompt-rules", "POST", parsedData);
      } catch (error) {
        throw new Error("유효하지 않은 JSON 형식입니다.");
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/global-prompt-rules"] });
      setIsDialogOpen(false);
      resetForm();
      toast({
        title: "성공",
        description: "전역 규칙이 성공적으로 생성되었습니다.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "오류",
        description: error.message || "규칙 생성에 실패했습니다.",
        variant: "destructive"
      });
    }
  });

  const updateRuleMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: RuleFormData }) => {
      try {
        const parsedData = {
          ...data,
          jsonRules: JSON.parse(data.jsonRules)
        };
        return apiRequest(`/api/admin/global-prompt-rules/${id}`, "PUT", parsedData);
      } catch (error) {
        throw new Error("유효하지 않은 JSON 형식입니다.");
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/global-prompt-rules"] });
      setIsDialogOpen(false);
      resetForm();
      toast({
        title: "성공",
        description: "전역 규칙이 성공적으로 수정되었습니다.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "오류",
        description: error.message || "규칙 수정에 실패했습니다.",
        variant: "destructive"
      });
    }
  });

  // 규칙 삭제 뮤테이션
  const deleteRuleMutation = useMutation({
    mutationFn: (id: number) => 
      apiRequest(`/api/admin/global-prompt-rules/${id}`, "DELETE"),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/global-prompt-rules"] });
      toast({
        title: "성공",
        description: "전역 규칙이 성공적으로 삭제되었습니다.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "오류",
        description: error.message || "규칙 삭제에 실패했습니다.",
        variant: "destructive"
      });
    }
  });

  // 규칙 활성화/비활성화 뮤테이션 (항상 1개만 활성화)
  const toggleActiveMutation = useMutation({
    mutationFn: (id: number) =>
      apiRequest(`/api/admin/global-prompt-rules/${id}/toggle-active`, "PUT"),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/global-prompt-rules"] });
      toast({
        title: "성공",
        description: "전역 규칙 활성화 상태가 변경되었습니다.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "오류",
        description: error.message || "활성화 상태 변경에 실패했습니다.",
        variant: "destructive"
      });
    }
  });

  const resetForm = () => {
    setFormData({
      name: "",
      jsonRules: "",
      isActive: false
    });
    setEditingRule(null);
  };

  const openCreateDialog = () => {
    resetForm();
    // 기본 JSON 템플릿 제공
    setFormData({
      name: "",
      jsonRules: JSON.stringify({
        ratio: "1:1",
        subject: "pregnant Korean woman in her 20s",
        quality: "high quality, detailed, professional",
        style: "warm and gentle atmosphere",
        technical: "8k resolution, soft lighting, cinematic composition"
      }, null, 2),
      isActive: false
    });
    setIsDialogOpen(true);
  };

  const openEditDialog = (rule: GlobalPromptRule) => {
    setEditingRule(rule);
    setFormData({
      name: rule.name,
      jsonRules: JSON.stringify(rule.jsonRules, null, 2),
      isActive: rule.isActive
    });
    setIsDialogOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (editingRule) {
      updateRuleMutation.mutate({ id: editingRule.id, data: formData });
    } else {
      createRuleMutation.mutate(formData);
    }
  };

  const handleDelete = (id: number, name: string) => {
    if (window.confirm(`"${name}" 규칙을 정말 삭제하시겠습니까?`)) {
      deleteRuleMutation.mutate(id);
    }
  };

  const handleToggleActive = (id: number, name: string, currentActive: boolean) => {
    const action = currentActive ? "비활성화" : "활성화";
    if (window.confirm(`"${name}" 규칙을 ${action}하시겠습니까?`)) {
      toggleActiveMutation.mutate(id);
    }
  };

  const addJSONHelper = (key: string, value: string) => {
    try {
      const currentRules = JSON.parse(formData.jsonRules);
      currentRules[key] = value;
      setFormData({
        ...formData,
        jsonRules: JSON.stringify(currentRules, null, 2)
      });
    } catch (error) {
      // JSON 파싱 오류 시 새로운 객체로 시작
      const newRules = { [key]: value };
      setFormData({
        ...formData,
        jsonRules: JSON.stringify(newRules, null, 2)
      });
    }
  };

  const activeRule = rules.find((rule: GlobalPromptRule) => rule.isActive);

  if (isLoading) {
    return (
      <div className="container mx-auto py-8">
        <div className="flex justify-center items-center h-64">
          <div className="text-lg">전역 규칙을 불러오는 중...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold">전역 프롬프트 규칙 관리</h1>
          <p className="text-muted-foreground mt-2">
            모든 이미지 생성에 적용되는 전역 규칙을 관리합니다. 항상 하나의 규칙만 활성화됩니다.
          </p>
        </div>
        <Button onClick={openCreateDialog} className="flex items-center gap-2">
          <Plus className="w-4 h-4" />
          새 규칙 추가
        </Button>
      </div>

      {/* 활성 규칙 표시 */}
      {activeRule && (
        <Card className="mb-6 border-green-200 bg-green-50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-green-800">
              <Power className="w-5 h-5" />
              현재 활성 규칙: {activeRule.name}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <pre className="bg-white p-4 rounded border text-sm overflow-x-auto">
              {JSON.stringify(activeRule.jsonRules, null, 2)}
            </pre>
          </CardContent>
        </Card>
      )}

      {/* 규칙 목록 */}
      <div className="grid grid-cols-1 gap-4">
        {rules.map((rule: GlobalPromptRule) => (
          <Card key={rule.id} className={rule.isActive ? "border-green-500" : ""}>
            <CardHeader>
              <div className="flex justify-between items-start">
                <div className="flex items-center gap-3">
                  <CardTitle>{rule.name}</CardTitle>
                  {rule.isActive && (
                    <Badge variant="default" className="bg-green-500">
                      활성화
                    </Badge>
                  )}
                </div>
                <div className="flex gap-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleToggleActive(rule.id, rule.name, rule.isActive)}
                  >
                    {rule.isActive ? 
                      <PowerOff className="w-4 h-4" /> : 
                      <Power className="w-4 h-4" />
                    }
                  </Button>
                  <Button 
                    variant="ghost" 
                    size="sm"
                    onClick={() => openEditDialog(rule)}
                  >
                    <Edit className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDelete(rule.id, rule.name)}
                    disabled={rule.isActive}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {/* JSON 규칙 미리보기 */}
              <div className="bg-gray-50 p-3 rounded border">
                <div className="text-sm font-medium mb-2">규칙 내용:</div>
                <pre className="text-xs overflow-x-auto">
                  {JSON.stringify(rule.jsonRules, null, 2)}
                </pre>
              </div>
              
              {/* 메타데이터 */}
              <div className="mt-3 text-xs text-muted-foreground">
                생성일: {new Date(rule.createdAt).toLocaleDateString()} | 
                수정일: {new Date(rule.updatedAt).toLocaleDateString()}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {rules.length === 0 && (
        <Card className="text-center py-12">
          <CardContent>
            <Settings className="w-12 h-12 mx-auto text-gray-400 mb-4" />
            <h3 className="text-lg font-medium mb-2">등록된 전역 규칙이 없습니다</h3>
            <p className="text-muted-foreground mb-4">
              첫 번째 전역 프롬프트 규칙을 추가해보세요.
            </p>
            <Button onClick={openCreateDialog}>규칙 추가하기</Button>
          </CardContent>
        </Card>
      )}

      {/* 생성/수정 다이얼로그 */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>
              {editingRule ? "전역 규칙 수정" : "새 전역 규칙 추가"}
            </DialogTitle>
          </DialogHeader>
          
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="name">규칙 이름</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="예: 기본 이미지 규칙"
                  required
                />
              </div>
              
              <div className="flex items-center space-x-2">
                <Switch
                  id="isActive"
                  checked={formData.isActive}
                  onCheckedChange={(checked) => setFormData({ ...formData, isActive: checked })}
                />
                <Label htmlFor="isActive">활성화 (다른 규칙은 자동 비활성화)</Label>
              </div>
            </div>
            
            {/* JSON 입력 헬퍼 */}
            <div className="border rounded-lg p-4 bg-gray-50">
              <div className="text-sm font-medium mb-3">빠른 추가:</div>
              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => addJSONHelper("ratio", "1:1")}
                >
                  비율: 1:1
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => addJSONHelper("ratio", "4:3")}
                >
                  비율: 4:3
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => addJSONHelper("subject", "pregnant Korean woman in her 20s")}
                >
                  주제: 임산부
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => addJSONHelper("quality", "high quality, detailed, professional")}
                >
                  품질: 고품질
                </Button>
              </div>
            </div>
            
            <div>
              <Label htmlFor="jsonRules">JSON 규칙</Label>
              <Textarea
                id="jsonRules"
                value={formData.jsonRules}
                onChange={(e) => setFormData({ ...formData, jsonRules: e.target.value })}
                placeholder="JSON 형태의 규칙을 입력하세요..."
                rows={12}
                className="font-mono text-sm"
                required
              />
              <div className="text-xs text-muted-foreground mt-1">
                유효한 JSON 형식으로 입력해주세요. ratio, subject, quality, style, technical 등의 키를 사용할 수 있습니다.
              </div>
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
                disabled={createRuleMutation.isPending || updateRuleMutation.isPending}
              >
                {editingRule ? "수정" : "생성"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}