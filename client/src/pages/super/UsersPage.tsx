import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { 
  Table, 
  TableHeader, 
  TableRow, 
  TableHead, 
  TableBody, 
  TableCell 
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from '@/components/ui/dropdown-menu';
import { Loader2, Search, Filter, MoreHorizontal, UserPlus } from 'lucide-react';
import { format } from 'date-fns';
import { ko } from 'date-fns/locale';
import { useHospital } from '@/lib/HospitalContext';
import UserDetailDialog from '@/components/dialogs/UserDetailDialog';
import UserEditDialog from '@/components/dialogs/UserEditDialog';
import UserDeleteConfirmDialog from '@/components/dialogs/UserDeleteConfirmDialog';

// 멤버십 타입에 따른 배지 컬러
const memberTypeColors = {
  superadmin: "bg-purple-100 text-purple-800",
  admin: "bg-blue-100 text-blue-800",
  hospital_admin: "bg-indigo-100 text-indigo-800",
  pro: "bg-green-100 text-green-800",
  general: "bg-gray-100 text-gray-800"
};

// 멤버십 타입 한글 표시
const memberTypeLabels = {
  superadmin: "슈퍼관리자",
  admin: "관리자",
  hospital_admin: "병원관리자",
  pro: "프로회원",
  membership: "멤버십회원",
  general: "일반회원"
};

export default function UsersPage() {
  const { selectedHospital } = useHospital();
  const [searchTerm, setSearchTerm] = useState('');
  const [memberTypeFilter, setMemberTypeFilter] = useState('');
  const [page, setPage] = useState(1);
  const [isSearching, setIsSearching] = useState(false);
  
  // 다이얼로그 상태 관리
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState<number | null>(null);
  const [selectedUsername, setSelectedUsername] = useState('');
  
  // 검색 조건 구성
  const buildQueryString = () => {
    const params = new URLSearchParams();
    
    if (searchTerm) {
      params.append('search', searchTerm);
    }
    
    if (memberTypeFilter && memberTypeFilter !== 'all') {
      params.append('memberType', memberTypeFilter);
    }
    
    if (selectedHospital) {
      params.append('hospitalId', selectedHospital.id.toString());
    }
    
    params.append('page', page.toString());
    params.append('limit', '10');
    
    return params.toString();
  };
  
  // 회원 목록 쿼리
  const { 
    data: usersData,
    isLoading,
    isError,
    error,
    refetch
  } = useQuery({
    queryKey: ['/api/super/users', searchTerm, memberTypeFilter, selectedHospital?.id, page],
    queryFn: async () => {
      const queryString = buildQueryString();
      const response = await fetch(`/api/super/users?${queryString}`, {
        credentials: 'include'
      });
      
      if (!response.ok) {
        throw new Error('회원 목록을 불러오는데 실패했습니다');
      }
      
      return response.json();
    },
    refetchOnWindowFocus: false
  });
  
  // 검색 핸들러
  const handleSearch = () => {
    setIsSearching(true);
    setPage(1);
    refetch().finally(() => setIsSearching(false));
  };
  
  // 회원 필터링 핸들러
  const handleFilter = (value: string) => {
    setMemberTypeFilter(value);
    setPage(1);
    refetch();
  };
  
  // 페이지 이동 핸들러
  const handlePageChange = (newPage: number) => {
    setPage(newPage);
    refetch();
  };
  
  // 사용자 상세 정보 다이얼로그 열기
  const handleOpenDetailDialog = (userId: number) => {
    setSelectedUserId(userId);
    setDetailDialogOpen(true);
  };
  
  // 사용자 수정 다이얼로그 열기
  const handleOpenEditDialog = (userId: number) => {
    setSelectedUserId(userId);
    setEditDialogOpen(true);
  };
  
  // 사용자 삭제 다이얼로그 열기
  const handleOpenDeleteDialog = (userId: number, username: string) => {
    setSelectedUserId(userId);
    setSelectedUsername(username);
    setDeleteDialogOpen(true);
  };
  
  // 로딩 상태 표시
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }
  
  // 에러 상태 표시
  if (isError) {
    return (
      <div className="rounded-md bg-destructive/10 p-6 text-center">
        <p className="text-destructive">회원 목록을 불러오는 중 오류가 발생했습니다.</p>
        <Button variant="outline" className="mt-4" onClick={() => refetch()}>
          다시 시도
        </Button>
      </div>
    );
  }
  
  // 페이지네이션 정보
  const pagination = usersData?.pagination || { page: 1, limit: 10, total: 0, totalPages: 1 };
  const users = usersData?.users || [];
  
  return (
    <div className="space-y-6">
      <div className="flex justify-between">
        <h1 className="text-2xl font-bold">회원 관리</h1>
        <Button className="flex items-center gap-2">
          <UserPlus className="h-4 w-4" />
          회원 추가
        </Button>
      </div>
      
      {/* 검색 및 필터 */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle>회원 검색</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col space-y-4 md:flex-row md:space-y-0 md:space-x-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  type="search"
                  placeholder="이름, 이메일, 아이디로 검색"
                  className="pl-8"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                />
              </div>
            </div>
            
            <div className="w-full md:w-[200px]">
              <Select
                value={memberTypeFilter}
                onValueChange={handleFilter}
              >
                <SelectTrigger>
                  <div className="flex items-center">
                    <Filter className="mr-2 h-4 w-4" />
                    <SelectValue placeholder="회원 유형" />
                  </div>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">전체 회원</SelectItem>
                  <SelectItem value="general">일반 회원</SelectItem>
                  <SelectItem value="pro">프로 회원</SelectItem>
                  <SelectItem value="membership">멤버십 회원</SelectItem>
                  <SelectItem value="hospital_admin">병원 관리자</SelectItem>
                  <SelectItem value="admin">관리자</SelectItem>
                  <SelectItem value="superadmin">슈퍼관리자</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <Button 
              className="w-full md:w-auto"
              onClick={handleSearch}
              disabled={isSearching}
            >
              {isSearching && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              검색
            </Button>
          </div>
        </CardContent>
      </Card>
      
      {/* 회원 목록 테이블 */}
      <div className="border rounded-md">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>ID</TableHead>
              <TableHead>사용자명</TableHead>
              <TableHead>이메일</TableHead>
              <TableHead>소속 병원</TableHead>
              <TableHead>멤버십</TableHead>
              <TableHead>가입일</TableHead>
              <TableHead className="text-right">관리</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {users.length > 0 ? (
              users.map((user: any) => (
                <TableRow key={user.id}>
                  <TableCell>{user.id}</TableCell>
                  <TableCell className="font-medium">{user.fullName || user.username || '-'}</TableCell>
                  <TableCell>{user.email || '-'}</TableCell>
                  <TableCell>{user.hospitalName || '-'}</TableCell>
                  <TableCell>
                    <Badge className={memberTypeColors[user.memberType as keyof typeof memberTypeColors] || "bg-gray-100"}>
                      {memberTypeLabels[user.memberType as keyof typeof memberTypeLabels] || user.memberType}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {user.createdAt && format(new Date(user.createdAt), 'yyyy-MM-dd', { locale: ko })}
                  </TableCell>
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" className="h-8 w-8 p-0">
                          <span className="sr-only">메뉴 열기</span>
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => handleOpenDetailDialog(user.id)}>
                          상세 정보
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleOpenEditDialog(user.id)}>
                          수정
                        </DropdownMenuItem>
                        <DropdownMenuItem 
                          className="text-destructive"
                          onClick={() => handleOpenDeleteDialog(user.id, user.username)}
                        >
                          삭제
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={7} className="h-24 text-center">
                  {searchTerm || memberTypeFilter || selectedHospital
                    ? '검색 결과가 없습니다.'
                    : '등록된 회원이 없습니다.'}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
      
      {/* 페이지네이션 */}
      {pagination.totalPages > 1 && (
        <div className="flex items-center justify-center space-x-2 py-4">
          <Button
            variant="outline"
            size="sm"
            onClick={() => handlePageChange(page - 1)}
            disabled={page <= 1}
          >
            이전
          </Button>
          
          <span className="text-sm text-muted-foreground">
            {page} / {pagination.totalPages} 페이지
          </span>
          
          <Button
            variant="outline"
            size="sm"
            onClick={() => handlePageChange(page + 1)}
            disabled={page >= pagination.totalPages}
          >
            다음
          </Button>
        </div>
      )}

      {/* 사용자 관리 다이얼로그 */}
      <UserDetailDialog 
        userId={selectedUserId}
        open={detailDialogOpen}
        onClose={() => setDetailDialogOpen(false)}
      />
      
      <UserEditDialog 
        userId={selectedUserId}
        open={editDialogOpen}
        onClose={() => setEditDialogOpen(false)}
      />
      
      <UserDeleteConfirmDialog 
        userId={selectedUserId}
        username={selectedUsername}
        open={deleteDialogOpen}
        onClose={() => setDeleteDialogOpen(false)}
      />
    </div>
  );
}