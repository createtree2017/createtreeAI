import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { useLocation } from 'wouter';
import { format } from 'date-fns';
import { ko } from 'date-fns/locale';

// UI 컴포넌트
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter } from '@/components/ui/card';
import { PlusCircle, Book, Loader2, AlertCircle } from 'lucide-react';
import { useAuthContext } from '@/lib/AuthProvider';

export default function DreamBookList() {
  const [, navigate] = useLocation();
  const { user } = useAuthContext();
  
  // 태몽동화 목록 조회
  const { 
    data: dreamBooks, 
    isLoading, 
    error 
  } = useQuery({
    queryKey: ['/api/dream-books'],
    queryFn: async () => {
      const response = await fetch('/api/dream-books');
      if (!response.ok) {
        throw new Error('태몽동화 목록을 불러오는데 실패했습니다');
      }
      return response.json();
    },
    enabled: !!user,
  });

  // 로그인 확인
  if (!user) {
    return (
      <div className="container mx-auto py-10 px-4">
        <Card>
          <CardContent className="p-6 text-center">
            <h2 className="text-2xl font-bold mb-4">로그인이 필요합니다</h2>
            <p className="text-gray-500 mb-6">태몽동화 목록을 보기 위해서는 로그인이 필요합니다.</p>
            <Button onClick={() => navigate('/login')}>로그인 페이지로 이동</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // 로딩 상태
  if (isLoading) {
    return (
      <div className="container mx-auto py-10 px-4 flex flex-col items-center justify-center min-h-[50vh]">
        <Loader2 className="h-16 w-16 animate-spin text-primary mb-4" />
        <p>태몽동화 목록을 불러오는 중...</p>
      </div>
    );
  }

  // 에러 상태
  if (error) {
    return (
      <div className="container mx-auto py-10 px-4">
        <Card>
          <CardContent className="p-6 text-center">
            <AlertCircle className="mx-auto h-12 w-12 text-red-500 mb-4" />
            <h2 className="text-2xl font-bold mb-4">오류가 발생했습니다</h2>
            <p className="text-gray-500 mb-6">
              태몽동화 목록을 불러오는 중 오류가 발생했습니다.
            </p>
            <Button onClick={() => navigate('/')}>홈으로 돌아가기</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // 데이터가 없는 경우
  if (!dreamBooks || dreamBooks.length === 0) {
    return (
      <div className="container mx-auto py-10 px-4">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold">내 태몽동화</h1>
            <p className="text-gray-500 mt-2">태몽으로 만든 특별한 아기 이야기</p>
          </div>
          <Button onClick={() => navigate('/dream-book/create')}>
            <PlusCircle className="h-5 w-5 mr-2" />
            새 태몽동화 만들기
          </Button>
        </div>
        
        <Card className="text-center p-8">
          <CardContent className="pt-6 pb-8 flex flex-col items-center">
            <Book className="h-16 w-16 text-gray-300 mb-4" />
            <h2 className="text-xl font-medium mb-2">아직 생성한 태몽동화가 없습니다</h2>
            <p className="text-gray-500">
              새로운 태몽동화를 만들어 특별한 이야기를 시작해보세요.
            </p>
          </CardContent>
          <CardFooter className="justify-center pt-0">
            <Button onClick={() => navigate('/dream-book/create')}>
              태몽동화 만들기
            </Button>
          </CardFooter>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-10 px-4">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold">내 태몽동화</h1>
          <p className="text-gray-500 mt-2">태몽으로 만든 특별한 아기 이야기</p>
        </div>
        <Button onClick={() => navigate('/dream-book/create')}>
          <PlusCircle className="h-5 w-5 mr-2" />
          새 태몽동화 만들기
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {dreamBooks.map((dreamBook: any) => (
          <Card 
            key={dreamBook.id} 
            className="overflow-hidden cursor-pointer hover:shadow-md transition-shadow"
            onClick={() => navigate(`/dream-book/${dreamBook.id}`)}
          >
            <div className="aspect-[4/3] relative">
              <img
                src={
                  dreamBook.coverImage || 
                  (dreamBook.images && dreamBook.images[0] && dreamBook.images[0].imageUrl) || 
                  '/static/uploads/dream-books/error.png'
                }
                alt={`${dreamBook.babyName}의 태몽동화`}
                className="object-cover w-full h-full"
                onError={(e) => {
                  const target = e.target as HTMLImageElement;
                  target.src = '/static/uploads/dream-books/error.png';
                }}
              />
            </div>
            <CardContent className="p-4">
              <h3 className="text-lg font-semibold truncate mb-1">
                {dreamBook.babyName}의 태몽동화
              </h3>
              <p className="text-gray-500 text-sm mb-2 truncate">
                {dreamBook.dreamer}님의 꿈
              </p>
              {dreamBook.createdAt && (
                <p className="text-xs text-gray-400">
                  {format(
                    new Date(dreamBook.createdAt), 
                    'yyyy년 M월 d일 HH:mm', 
                    { locale: ko }
                  )}
                </p>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}