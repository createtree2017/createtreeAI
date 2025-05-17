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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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

// 마일스톤 카테고리 정의
const MILESTONE_CATEGORIES = [
  { id: "baby_development", name: "태아 발달", description: "태아의 발달 단계와 관련된 마일스톤" },
  { id: "maternal_health", name: "산모 건강", description: "산모의 건강과 관련된 마일스톤" },
  { id: "preparations", name: "준비 사항", description: "출산 및 육아 준비와 관련된 마일스톤" },
  { id: "medical_checkups", name: "의료 검진", description: "산전 검진 및 의료 관련 마일스톤" },
  { id: "emotional_wellbeing", name: "정서적 웰빙", description: "정서적 건강과 관련된 마일스톤" },
];

// 마일스톤 유효성 검사 스키마
const milestoneFormSchema = z.object({
  milestoneId: z.string().min(3, "ID는 최소 3자 이상이어야 합니다"),
  title: z.string().min(2, "제목은 최소 2자 이상이어야 합니다"),
  description: z.string().min(10, "설명은 최소 10자 이상이어야 합니다"),
  weekStart: z.coerce.number().min(1, "시작 주차는 1 이상이어야 합니다").max(42, "시작 주차는 42 이하여야 합니다"),
  weekEnd: z.coerce.number().min(1, "종료 주차는 1 이상이어야 합니다").max(42, "종료 주차는 42 이하여야 합니다"),
  badgeEmoji: z.string().min(1, "배지 이모지를 입력해주세요"),
  badgeImageUrl: z.string().optional(),
  encouragementMessage: z.string().min(5, "응원 메시지는 최소 5자 이상이어야 합니다"),
  category: z.string().min(1, "카테고리를 선택해주세요"),
  order: z.coerce.number().int().min(0),
  isActive: z.boolean().default(true),
});

type MilestoneFormValues = z.infer<typeof milestoneFormSchema>;

export default function MilestoneManagement() {
  const queryClient = useQueryClient();
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [selectedMilestone, setSelectedMilestone] = useState<any>(null);

  // API 응답의 인터페이스 정의
  interface MilestoneResponse {
    [category: string]: Array<{
      id: number;
      milestoneId: string;
      title: string;
      description: string;
      weekStart: number;
      weekEnd: number;
      badgeEmoji: string;
      badgeImageUrl?: string;
      encouragementMessage: string;
      order: number;
      isActive: boolean;
    }>;
  }
  
  // 마일스톤 목록 가져오기
  const { data: milestones = [], isLoading } = useQuery({
    queryKey: ['/api/milestones'],
    queryFn: async () => {
      try {
        // apiRequest의 반환 타입을 명시적으로 지정
        const response = await apiRequest('/api/milestones') as unknown as MilestoneResponse;
        
        // API 응답이 객체 형태로 카테고리별로 구성되어 있으므로 배열로 변환
        if (response && typeof response === 'object') {
          const allMilestones: any[] = [];
          
          Object.keys(response).forEach(category => {
            if (Array.isArray(response[category])) {
              response[category].forEach(milestone => {
                // 카테고리 정보 추가
                allMilestones.push({
                  ...milestone,
                  category
                });
              });
            }
          });
          
          return allMilestones;
        }
        return [];
      } catch (error) {
        console.error("마일스톤 데이터 로딩 중 오류:", error);
        return [];
      }
    }
  });

  // 생성 폼
  const createForm = useForm<MilestoneFormValues>({
    resolver: zodResolver(milestoneFormSchema),
    defaultValues: {
      milestoneId: "",
      title: "",
      description: "",
      weekStart: 1,
      weekEnd: 40,
      badgeEmoji: "🎯",
      badgeImageUrl: "",
      encouragementMessage: "",
      category: "",
      order: 0,
      isActive: true,
    }
  });

  // 수정 폼
  const editForm = useForm<MilestoneFormValues>({
    resolver: zodResolver(milestoneFormSchema),
    defaultValues: {
      milestoneId: "",
      title: "",
      description: "",
      weekStart: 1,
      weekEnd: 40,
      badgeEmoji: "🎯",
      badgeImageUrl: "",
      encouragementMessage: "",
      category: "",
      order: 0,
      isActive: true,
    }
  });

  // 마일스톤 생성 뮤테이션
  const createMilestoneMutation = useMutation({
    mutationFn: async (data: MilestoneFormValues) => {
      return apiRequest('/api/admin/milestones', {
        method: 'POST',
        data
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/milestones'] });
      toast({
        title: "마일스톤 생성 성공",
        description: "새로운 마일스톤이 성공적으로 생성되었습니다."
      });
      setIsCreateDialogOpen(false);
      createForm.reset();
    },
    onError: (error) => {
      toast({
        title: "마일스톤 생성 실패",
        description: "마일스톤 생성 중 오류가 발생했습니다.",
        variant: "destructive"
      });
      console.error("마일스톤 생성 에러:", error);
    }
  });

  // 마일스톤 수정 뮤테이션
  const updateMilestoneMutation = useMutation({
    mutationFn: async (data: MilestoneFormValues) => {
      return apiRequest(`/api/admin/milestones/${data.milestoneId}`, {
        method: 'PUT',
        data
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/milestones'] });
      toast({
        title: "마일스톤 수정 성공",
        description: "마일스톤이 성공적으로 수정되었습니다."
      });
      setIsEditDialogOpen(false);
    },
    onError: (error) => {
      toast({
        title: "마일스톤 수정 실패",
        description: "마일스톤 수정 중 오류가 발생했습니다.",
        variant: "destructive"
      });
      console.error("마일스톤 수정 에러:", error);
    }
  });

  // 마일스톤 삭제 뮤테이션
  const deleteMilestoneMutation = useMutation({
    mutationFn: async (milestoneId: string) => {
      return apiRequest(`/api/admin/milestones/${milestoneId}`, {
        method: 'DELETE'
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/milestones'] });
      toast({
        title: "마일스톤 삭제 성공",
        description: "마일스톤이 성공적으로 삭제되었습니다."
      });
      setIsDeleteDialogOpen(false);
      setSelectedMilestone(null);
    },
    onError: (error) => {
      toast({
        title: "마일스톤 삭제 실패",
        description: "마일스톤 삭제 중 오류가 발생했습니다.",
        variant: "destructive"
      });
      console.error("마일스톤 삭제 에러:", error);
    }
  });

  // 마일스톤 생성 제출 핸들러
  const onCreateSubmit = (data: MilestoneFormValues) => {
    createMilestoneMutation.mutate(data);
  };

  // 마일스톤 수정 제출 핸들러
  const onEditSubmit = (data: MilestoneFormValues) => {
    updateMilestoneMutation.mutate(data);
  };

  // 마일스톤 삭제 핸들러
  const onDelete = () => {
    if (selectedMilestone) {
      deleteMilestoneMutation.mutate(selectedMilestone.milestoneId);
    }
  };

  // 마일스톤 수정 시작 핸들러
  const startEditing = (milestone: any) => {
    setSelectedMilestone(milestone);
    editForm.reset({
      milestoneId: milestone.milestoneId,
      title: milestone.title,
      description: milestone.description,
      weekStart: milestone.weekStart,
      weekEnd: milestone.weekEnd,
      badgeEmoji: milestone.badgeEmoji,
      badgeImageUrl: milestone.badgeImageUrl || "",
      encouragementMessage: milestone.encouragementMessage,
      category: milestone.category,
      order: milestone.order,
      isActive: milestone.isActive,
    });
    setIsEditDialogOpen(true);
  };

  // 카테고리 이름 가져오기
  const getCategoryName = (categoryId: string) => {
    const category = MILESTONE_CATEGORIES.find(cat => cat.id === categoryId);
    return category ? category.name : categoryId;
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold tracking-tight">마일스톤 관리</h2>
        <Button onClick={() => setIsCreateDialogOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          마일스톤 추가
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
                <TableHead>제목</TableHead>
                <TableHead>카테고리</TableHead>
                <TableHead>주차 범위</TableHead>
                <TableHead>배지</TableHead>
                <TableHead>상태</TableHead>
                <TableHead>순서</TableHead>
                <TableHead className="text-right">작업</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {milestones.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center h-32 text-muted-foreground">
                    등록된 마일스톤이 없습니다
                  </TableCell>
                </TableRow>
              ) : (
                milestones.map((milestone: any) => (
                  <TableRow key={milestone.milestoneId}>
                    <TableCell className="font-mono text-xs">{milestone.milestoneId}</TableCell>
                    <TableCell className="font-medium">{milestone.title}</TableCell>
                    <TableCell>{getCategoryName(milestone.category)}</TableCell>
                    <TableCell>{milestone.weekStart}주 - {milestone.weekEnd}주</TableCell>
                    <TableCell className="text-xl">{milestone.badgeEmoji}</TableCell>
                    <TableCell>
                      <span className={`px-2 py-1 rounded-full text-xs ${milestone.isActive ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>
                        {milestone.isActive ? '활성' : '비활성'}
                      </span>
                    </TableCell>
                    <TableCell>{milestone.order}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button variant="outline" size="icon" onClick={() => startEditing(milestone)}>
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button 
                          variant="outline" 
                          size="icon" 
                          className="text-red-500 hover:text-red-600"
                          onClick={() => {
                            setSelectedMilestone(milestone);
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

      {/* 마일스톤 생성 다이얼로그 */}
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>새 마일스톤 추가</DialogTitle>
            <DialogDescription>
              임신 및 출산 과정을 추적하기 위한 새로운 마일스톤을 추가합니다.
            </DialogDescription>
          </DialogHeader>

          <Form {...createForm}>
            <form onSubmit={createForm.handleSubmit(onCreateSubmit)} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={createForm.control}
                  name="milestoneId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>마일스톤 ID</FormLabel>
                      <FormControl>
                        <Input placeholder="milestone-id-format" {...field} />
                      </FormControl>
                      <FormDescription>
                        고유한 영문 ID (예: first-ultrasound)
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={createForm.control}
                  name="title"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>제목</FormLabel>
                      <FormControl>
                        <Input placeholder="마일스톤 제목" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={createForm.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>설명</FormLabel>
                    <FormControl>
                      <Textarea 
                        placeholder="마일스톤에 대한 자세한 설명"
                        className="min-h-[100px]" 
                        {...field} 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-3 gap-4">
                <FormField
                  control={createForm.control}
                  name="weekStart"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>시작 주차</FormLabel>
                      <FormControl>
                        <Input type="number" min={1} max={42} {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={createForm.control}
                  name="weekEnd"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>종료 주차</FormLabel>
                      <FormControl>
                        <Input type="number" min={1} max={42} {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={createForm.control}
                  name="category"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>카테고리</FormLabel>
                      <Select 
                        onValueChange={field.onChange} 
                        defaultValue={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="카테고리 선택" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {MILESTONE_CATEGORIES.map(category => (
                            <SelectItem key={category.id} value={category.id}>
                              {category.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={createForm.control}
                  name="badgeEmoji"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>배지 이모지</FormLabel>
                      <FormControl>
                        <Input placeholder="🎯" {...field} />
                      </FormControl>
                      <FormDescription>
                        대표 이모지 (예: 👶, 🏥, 💪)
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={createForm.control}
                  name="badgeImageUrl"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>배지 이미지 URL (선택사항)</FormLabel>
                      <FormControl>
                        <Input placeholder="https://example.com/image.png" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={createForm.control}
                name="encouragementMessage"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>응원 메시지</FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="이 마일스톤을 달성했을 때 보여줄 메시지"
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
                  name="order"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>정렬 순서</FormLabel>
                      <FormControl>
                        <Input type="number" min={0} {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={createForm.control}
                  name="isActive"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between space-x-3 space-y-0 rounded-md border p-4">
                      <div className="space-y-1 leading-none">
                        <FormLabel>활성 상태</FormLabel>
                        <FormDescription>
                          이 마일스톤을 사용자에게 표시할지 여부
                        </FormDescription>
                      </div>
                      <FormControl>
                        <Checkbox
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />
              </div>

              <DialogFooter>
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => setIsCreateDialogOpen(false)}
                >
                  취소
                </Button>
                <Button 
                  type="submit" 
                  disabled={createMilestoneMutation.isPending}
                >
                  {createMilestoneMutation.isPending ? "저장 중..." : "마일스톤 저장"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* 마일스톤 수정 다이얼로그 */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>마일스톤 수정</DialogTitle>
            <DialogDescription>
              마일스톤 정보를 수정합니다.
            </DialogDescription>
          </DialogHeader>

          <Form {...editForm}>
            <form onSubmit={editForm.handleSubmit(onEditSubmit)} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={editForm.control}
                  name="milestoneId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>마일스톤 ID</FormLabel>
                      <FormControl>
                        <Input placeholder="milestone-id-format" {...field} disabled />
                      </FormControl>
                      <FormDescription>
                        마일스톤 ID는 수정할 수 없습니다
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={editForm.control}
                  name="title"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>제목</FormLabel>
                      <FormControl>
                        <Input placeholder="마일스톤 제목" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={editForm.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>설명</FormLabel>
                    <FormControl>
                      <Textarea 
                        placeholder="마일스톤에 대한 자세한 설명"
                        className="min-h-[100px]" 
                        {...field} 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-3 gap-4">
                <FormField
                  control={editForm.control}
                  name="weekStart"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>시작 주차</FormLabel>
                      <FormControl>
                        <Input type="number" min={1} max={42} {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={editForm.control}
                  name="weekEnd"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>종료 주차</FormLabel>
                      <FormControl>
                        <Input type="number" min={1} max={42} {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={editForm.control}
                  name="category"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>카테고리</FormLabel>
                      <Select 
                        onValueChange={field.onChange} 
                        defaultValue={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="카테고리 선택" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {MILESTONE_CATEGORIES.map(category => (
                            <SelectItem key={category.id} value={category.id}>
                              {category.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={editForm.control}
                  name="badgeEmoji"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>배지 이모지</FormLabel>
                      <FormControl>
                        <Input placeholder="🎯" {...field} />
                      </FormControl>
                      <FormDescription>
                        대표 이모지 (예: 👶, 🏥, 💪)
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={editForm.control}
                  name="badgeImageUrl"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>배지 이미지 URL (선택사항)</FormLabel>
                      <FormControl>
                        <Input placeholder="https://example.com/image.png" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={editForm.control}
                name="encouragementMessage"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>응원 메시지</FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="이 마일스톤을 달성했을 때 보여줄 메시지"
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
                  name="order"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>정렬 순서</FormLabel>
                      <FormControl>
                        <Input type="number" min={0} {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={editForm.control}
                  name="isActive"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between space-x-3 space-y-0 rounded-md border p-4">
                      <div className="space-y-1 leading-none">
                        <FormLabel>활성 상태</FormLabel>
                        <FormDescription>
                          이 마일스톤을 사용자에게 표시할지 여부
                        </FormDescription>
                      </div>
                      <FormControl>
                        <Checkbox
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />
              </div>

              <DialogFooter>
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => setIsEditDialogOpen(false)}
                >
                  취소
                </Button>
                <Button 
                  type="submit" 
                  disabled={updateMilestoneMutation.isPending}
                >
                  {updateMilestoneMutation.isPending ? "저장 중..." : "변경사항 저장"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* 마일스톤 삭제 확인 다이얼로그 */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>마일스톤 삭제</DialogTitle>
            <DialogDescription>
              정말 이 마일스톤을 삭제하시겠습니까? 이 작업은 되돌릴 수 없으며, 사용자가 이미 달성한 마일스톤 데이터도 함께 삭제됩니다.
            </DialogDescription>
          </DialogHeader>
          
          {selectedMilestone && (
            <div className="py-4">
              <div className="flex items-center gap-3 py-2 px-4 bg-muted rounded-lg">
                <span className="text-2xl">{selectedMilestone.badgeEmoji}</span>
                <div>
                  <p className="font-medium">{selectedMilestone.title}</p>
                  <p className="text-xs text-muted-foreground">{selectedMilestone.milestoneId}</p>
                </div>
              </div>
            </div>
          )}
          
          <DialogFooter>
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
              disabled={deleteMilestoneMutation.isPending}
              onClick={onDelete}
            >
              {deleteMilestoneMutation.isPending ? "삭제 중..." : "마일스톤 삭제"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}