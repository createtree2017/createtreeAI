import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/api';
import { useToast } from '@/hooks/use-toast';
import { Link } from 'wouter';

// UI 컴포넌트
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { 
  Table, 
  TableHeader, 
  TableBody, 
  TableRow, 
  TableHead, 
  TableCell 
} from '@/components/ui/table';
import { Switch } from '@/components/ui/switch';

// 아이콘
import { Eye, Trash2 } from 'lucide-react';

// 태몽동화 목록 컴포넌트
export function DreamBookList() {
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const queryClient = useQueryClient();
  const { toast } = useToast();
  
  // 태몽동화 목록 조회
  const { data, isLoading, error } = useQuery({
    queryKey: ["/api/dream-books", { page, limit }],
  });
  
  // 태몽동화 공개 상태 전환 뮤테이션
  const togglePublicMutation = useMutation({
    mutationFn: ({ id, isPublic }: { id: number; isPublic: boolean }) => {
      return apiRequest(`/api/dream-books/${id}`, {
        method: "PATCH",
        body: JSON.stringify({ isPublic })
      });
    },
    onSuccess: () => {
      toast({
        title: "상태 변경 완료",
        description: "태몽동화의 공개 상태가 변경되었습니다.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/dream-books"] });
    },
    onError: (error) => {
      toast({
        title: "오류",
        description: "태몽동화 상태 변경 중 오류가 발생했습니다.",
        variant: "destructive",
      });
      console.error("Error toggling dreambook status:", error);
    },
  });
  
  // 태몽동화 삭제 뮤테이션
  const deleteDreamBookMutation = useMutation({
    mutationFn: (id: number) => {
      return apiRequest(`/api/dream-books/${id}`, {
        method: "DELETE",
      });
    },
    onSuccess: () => {
      toast({
        title: "삭제 완료",
        description: "태몽동화가 성공적으로 삭제되었습니다.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/dream-books"] });
    },
    onError: (error) => {
      toast({
        title: "오류",
        description: "태몽동화 삭제 중 오류가 발생했습니다.",
        variant: "destructive",
      });
      console.error("Error deleting dreambook:", error);
    },
  });
  
  const handleDeleteDreamBook = (id: number) => {
    if (window.confirm("정말로 이 태몽동화를 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.")) {
      deleteDreamBookMutation.mutate(id);
    }
  };
  
  const handleTogglePublic = (id: number, currentStatus: boolean) => {
    togglePublicMutation.mutate({ id, isPublic: !currentStatus });
  };
  
  if (isLoading) {
    return <div className="text-center py-10">태몽동화 목록을 불러오는 중...</div>;
  }
  
  if (error) {
    return <div className="text-center py-10 text-red-500">태몽동화 목록을 불러오는 중 오류가 발생했습니다.</div>;
  }
  
  const dreamBooks = data || [];
  
  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-xl font-bold">태몽동화 목록</h3>
      </div>
      
      {dreamBooks.length > 0 ? (
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>ID</TableHead>
                <TableHead>아기 이름</TableHead>
                <TableHead>꿈꾼 사람</TableHead>
                <TableHead>스타일</TableHead>
                <TableHead>이미지 수</TableHead>
                <TableHead>생성일</TableHead>
                <TableHead>공개 여부</TableHead>
                <TableHead>작업</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {dreamBooks.map((book: any) => (
                <TableRow key={book.id}>
                  <TableCell className="font-medium">{book.id}</TableCell>
                  <TableCell>{book.babyName}</TableCell>
                  <TableCell>{book.dreamer}</TableCell>
                  <TableCell>{book.style}</TableCell>
                  <TableCell>{book.images ? book.images.length : 0}</TableCell>
                  <TableCell>{new Date(book.createdAt).toLocaleDateString()}</TableCell>
                  <TableCell>
                    <Switch 
                      checked={book.isPublic} 
                      onCheckedChange={() => handleTogglePublic(book.id, book.isPublic)}
                    />
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center space-x-2">
                      <Button variant="ghost" size="sm" asChild>
                        <Link href={`/dream-book/${book.id}`}>
                          <Eye className="h-4 w-4" />
                        </Link>
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        onClick={() => handleDeleteDreamBook(book.id)}
                      >
                        <Trash2 className="h-4 w-4 text-red-500" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      ) : (
        <div className="text-center py-10 bg-gray-50 rounded-lg border border-dashed border-gray-300">
          <p className="text-gray-500">생성된 태몽동화가 없습니다.</p>
        </div>
      )}
    </div>
  );
}