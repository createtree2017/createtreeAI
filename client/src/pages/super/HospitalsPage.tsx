import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useHospital } from '../../lib/HospitalContext';
import { 
  Table, 
  TableHeader, 
  TableRow, 
  TableHead, 
  TableBody, 
  TableCell 
} from '@/components/ui/table';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogFooter, 
  DialogTrigger
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription
} from '@/components/ui/form';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { toast } from '@/hooks/use-toast';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { queryClient, apiRequest } from '@/lib/queryClient';
import { Loader2, Plus, Pencil, Trash2, Calendar } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { ko } from 'date-fns/locale';
import { DatePicker } from '@/components/ui/date-picker';

// 병원 폼 스키마 정의
const hospitalSchema = z.object({
  name: z.string().min(1, '병원 이름은 필수입니다.'),
  address: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().email('올바른 이메일 주소를 입력하세요.').optional().or(z.literal('')),
  domain: z.string().optional(),
  contractStartDate: z.string().optional(), // 계약 시작일
  contractEndDate: z.string().optional(), // 계약 종료일
  packageType: z.string().default('basic'),
  isActive: z.boolean().default(true)
});

type HospitalFormValues = z.infer<typeof hospitalSchema>;

export default function HospitalsPage() {
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [editingHospital, setEditingHospital] = useState<any>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [hospitalToDelete, setHospitalToDelete] = useState<number | null>(null);
  
  const { data: hospitals = [], isLoading, error } = useQuery<any[]>({
    queryKey: ['/api/super/hospitals'],
    queryFn: async () => {
      const response = await apiRequest('/api/super/hospitals');
      return response.json();
    },
    staleTime: 5 * 60 * 1000, // 5분
  });

  // 병원 생성 뮤테이션
  const createHospitalMutation = useMutation({
    mutationFn: async (data: HospitalFormValues) => {
      const response = await apiRequest('/api/super/hospitals', { 
        method: 'POST',
        data
      });
      return response.json();
    },
    onSuccess: () => {
      toast({ title: '완료', description: '병원이 성공적으로 추가되었습니다.' });
      setIsCreateDialogOpen(false);
      queryClient.invalidateQueries({ queryKey: ['/api/super/hospitals'] });
    },
    onError: (error: any) => {
      toast({ 
        title: '오류 발생', 
        description: error.message || '병원을 추가하는 중 오류가 발생했습니다.', 
        variant: 'destructive' 
      });
    }
  });
  
  // 병원 수정 뮤테이션
  const updateHospitalMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number, data: HospitalFormValues }) => {
      const response = await apiRequest(`/api/super/hospitals/${id}`, {
        method: 'PUT',
        data
      });
      return response.json();
    },
    onSuccess: () => {
      toast({ title: '완료', description: '병원 정보가 성공적으로 수정되었습니다.' });
      setEditingHospital(null);
      queryClient.invalidateQueries({ queryKey: ['/api/super/hospitals'] });
    },
    onError: (error: any) => {
      toast({ 
        title: '오류 발생', 
        description: error.message || '병원 정보를 수정하는 중 오류가 발생했습니다.', 
        variant: 'destructive' 
      });
    }
  });
  
  // 병원 삭제 뮤테이션
  const deleteHospitalMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest(`/api/super/hospitals/${id}`, {
        method: 'DELETE'
      });
    },
    onSuccess: () => {
      toast({ title: '완료', description: '병원이 성공적으로 삭제되었습니다.' });
      setIsDeleteDialogOpen(false);
      setHospitalToDelete(null);
      queryClient.invalidateQueries({ queryKey: ['/api/super/hospitals'] });
    },
    onError: (error: any) => {
      toast({ 
        title: '오류 발생', 
        description: error.message || '병원을 삭제하는 중 오류가 발생했습니다.', 
        variant: 'destructive' 
      });
    }
  });
  
  // 생성 폼
  const createForm = useForm<HospitalFormValues>({
    resolver: zodResolver(hospitalSchema),
    defaultValues: {
      name: '',
      address: '',
      phone: '',
      email: '',
      domain: '',
      contractStartDate: '',
      contractEndDate: '',
      packageType: 'basic'
    }
  });
  
  // 생성폼용 날짜 선택 핸들러
  const [createStartDate, setCreateStartDate] = useState<Date | undefined>(undefined);
  const [createEndDate, setCreateEndDate] = useState<Date | undefined>(undefined);
  
  // 생성폼의 날짜 변경 시 폼 값 업데이트
  const updateCreateStartDate = (date: Date | undefined) => {
    setCreateStartDate(date);
    if (date) {
      createForm.setValue('contractStartDate', date.toISOString());
    } else {
      createForm.setValue('contractStartDate', '');
    }
  };
  
  const updateCreateEndDate = (date: Date | undefined) => {
    setCreateEndDate(date);
    if (date) {
      createForm.setValue('contractEndDate', date.toISOString());
    } else {
      createForm.setValue('contractEndDate', '');
    }
  };
  
  // 수정 폼
  const editForm = useForm<HospitalFormValues>({
    resolver: zodResolver(hospitalSchema),
    defaultValues: {
      name: '',
      address: '',
      phone: '',
      email: '',
      domain: '',
      contractStartDate: '',
      contractEndDate: '',
      packageType: 'basic'
    }
  });
  
  // 날짜 선택 핸들러
  const [startDate, setStartDate] = useState<Date | undefined>(undefined);
  const [endDate, setEndDate] = useState<Date | undefined>(undefined);
  
  // 날짜 변경 시 폼 값 업데이트
  const updateStartDate = (date: Date | undefined) => {
    setStartDate(date);
    if (date) {
      editForm.setValue('contractStartDate', date.toISOString());
    } else {
      editForm.setValue('contractStartDate', '');
    }
  };
  
  const updateEndDate = (date: Date | undefined) => {
    setEndDate(date);
    if (date) {
      editForm.setValue('contractEndDate', date.toISOString());
    } else {
      editForm.setValue('contractEndDate', '');
    }
  };
  
  // 병원 생성 제출 핸들러
  const onCreateSubmit = (data: HospitalFormValues) => {
    createHospitalMutation.mutate(data);
  };
  
  // 병원 수정 제출 핸들러
  const onEditSubmit = (data: HospitalFormValues) => {
    if (editingHospital) {
      updateHospitalMutation.mutate({ id: editingHospital.id, data });
    }
  };
  
  // 수정 모달 열기
  const handleEditHospital = (hospital: any) => {
    setEditingHospital(hospital);
    // 날짜 상태 업데이트
    setStartDate(hospital.contractStartDate ? new Date(hospital.contractStartDate) : undefined);
    setEndDate(hospital.contractEndDate ? new Date(hospital.contractEndDate) : undefined);
    
    editForm.reset({
      name: hospital.name || '',
      address: hospital.address || '',
      phone: hospital.phone || '',
      email: hospital.email || '',
      domain: hospital.domain || '',
      contractStartDate: hospital.contractStartDate || '',
      contractEndDate: hospital.contractEndDate || '',
      packageType: hospital.packageType || 'basic',
      isActive: hospital.isActive !== undefined ? hospital.isActive : true
    });
  };
  
  // 삭제 확인 모달 열기
  const handleDeleteConfirm = (hospitalId: number) => {
    setHospitalToDelete(hospitalId);
    setIsDeleteDialogOpen(true);
  };
  
  // 삭제 실행
  const confirmDelete = () => {
    if (hospitalToDelete) {
      deleteHospitalMutation.mutate(hospitalToDelete);
    }
  };
  
  // 로딩 중 상태
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }
  
  // 오류 상태
  if (error) {
    return (
      <div className="rounded-md bg-destructive/10 p-6 text-center">
        <p className="text-destructive">병원 목록을 불러오는 중 오류가 발생했습니다.</p>
        <Button
          variant="outline"
          className="mt-4"
          onClick={() => queryClient.invalidateQueries({ queryKey: ['/api/super/hospitals'] })}
        >
          다시 시도
        </Button>
      </div>
    );
  }

  return (
    <>
      <div className="mb-8">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold">병원 관리</h1>
          <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button className="flex items-center gap-2">
                <Plus size={16} />
                병원 추가
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>신규 병원 추가</DialogTitle>
              </DialogHeader>
              <Form {...createForm}>
                <form onSubmit={createForm.handleSubmit(onCreateSubmit)} className="space-y-4">
                  <FormField
                    control={createForm.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>병원명 *</FormLabel>
                        <FormControl>
                          <Input placeholder="병원 이름을 입력하세요" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={createForm.control}
                    name="address"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>주소</FormLabel>
                        <FormControl>
                          <Input placeholder="주소를 입력하세요" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={createForm.control}
                    name="phone"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>연락처</FormLabel>
                        <FormControl>
                          <Input placeholder="연락처를 입력하세요" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={createForm.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>이메일</FormLabel>
                        <FormControl>
                          <Input 
                            type="email" 
                            placeholder="이메일을 입력하세요" 
                            {...field} 
                            value={field.value || ''}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  {/* 계약 시작일 */}
                  <FormField
                    control={createForm.control}
                    name="contractStartDate"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>계약 시작일</FormLabel>
                        <FormControl>
                          <div>
                            <DatePicker date={createStartDate} setDate={updateCreateStartDate} />
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  {/* 계약 종료일 */}
                  <FormField
                    control={createForm.control}
                    name="contractEndDate"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>계약 종료일</FormLabel>
                        <FormControl>
                          <div>
                            <DatePicker date={createEndDate} setDate={updateCreateEndDate} />
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
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
                      disabled={createHospitalMutation.isPending}
                    >
                      {createHospitalMutation.isPending && (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      )}
                      추가
                    </Button>
                  </DialogFooter>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
        </div>
        
        <div className="border rounded-md">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>ID</TableHead>
                <TableHead>병원명</TableHead>
                <TableHead>연락처</TableHead>
                <TableHead>계약 기간</TableHead>
                <TableHead>계약상태</TableHead>
                <TableHead>가입일</TableHead>
                <TableHead className="text-right">관리</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {hospitals && hospitals.length > 0 ? (
                hospitals.map((hospital: any) => (
                  <TableRow key={hospital.id}>
                    <TableCell>{hospital.id}</TableCell>
                    <TableCell className="font-medium">{hospital.name}</TableCell>
                    <TableCell>{hospital.phone || '-'}</TableCell>
                    <TableCell>
                      {hospital.contractStartDate && hospital.contractEndDate ? (
                        <>
                          {format(new Date(hospital.contractStartDate), 'yyyy-MM-dd', { locale: ko })}
                          <span className="mx-1">~</span>
                          {format(new Date(hospital.contractEndDate), 'yyyy-MM-dd', { locale: ko })}
                        </>
                      ) : (
                        '-'
                      )}
                    </TableCell>
                    <TableCell>
                      {hospital.isActive ? (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                          활성
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                          비활성
                        </span>
                      )}
                    </TableCell>
                    <TableCell>
                      {hospital.createdAt && format(new Date(hospital.createdAt), 'yyyy-MM-dd', { locale: ko })}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          onClick={() => handleEditHospital(hospital)}
                        >
                          <Pencil size={16} />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={() => handleDeleteConfirm(hospital.id)}
                        >
                          <Trash2 size={16} />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={7} className="text-center h-24">
                    등록된 병원이 없습니다.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </div>
      
      {/* 수정 다이얼로그 */}
      <Dialog open={!!editingHospital} onOpenChange={(open) => !open && setEditingHospital(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>병원 정보 수정</DialogTitle>
          </DialogHeader>
          <Form {...editForm}>
            <form onSubmit={editForm.handleSubmit(onEditSubmit)} className="space-y-4">
              <FormField
                control={editForm.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>병원명 *</FormLabel>
                    <FormControl>
                      <Input placeholder="병원 이름을 입력하세요" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={editForm.control}
                name="address"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>주소</FormLabel>
                    <FormControl>
                      <Input placeholder="주소를 입력하세요" {...field} value={field.value || ''} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={editForm.control}
                name="phone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>연락처</FormLabel>
                    <FormControl>
                      <Input placeholder="연락처를 입력하세요" {...field} value={field.value || ''} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={editForm.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>이메일</FormLabel>
                    <FormControl>
                      <Input 
                        type="email" 
                        placeholder="이메일을 입력하세요" 
                        {...field} 
                        value={field.value || ''}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              {/* 계약 시작일 */}
              <FormField
                control={editForm.control}
                name="contractStartDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>계약 시작일</FormLabel>
                    <FormControl>
                      <div>
                        <DatePicker date={startDate} setDate={updateStartDate} />
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              {/* 계약 종료일 */}
              <FormField
                control={editForm.control}
                name="contractEndDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>계약 종료일</FormLabel>
                    <FormControl>
                      <div>
                        <DatePicker date={endDate} setDate={updateEndDate} />
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={editForm.control}
                name="isActive"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between space-x-2 rounded-lg border p-4">
                    <div className="space-y-0.5">
                      <FormLabel className="text-base">계약 상태</FormLabel>
                      <FormDescription>
                        병원 계약이 활성 상태인지 설정합니다. 비활성화 시 소속 회원들의 멤버십이 일반 회원으로 변경됩니다.
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
              
              <DialogFooter>
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => setEditingHospital(null)}
                >
                  취소
                </Button>
                <Button 
                  type="submit" 
                  disabled={updateHospitalMutation.isPending}
                >
                  {updateHospitalMutation.isPending && (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  )}
                  저장
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
      
      {/* 삭제 확인 다이얼로그 */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>병원 삭제</DialogTitle>
          </DialogHeader>
          <p className="py-4">
            정말 이 병원을 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.
          </p>
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
              onClick={confirmDelete}
              disabled={deleteHospitalMutation.isPending}
            >
              {deleteHospitalMutation.isPending && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              삭제
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}