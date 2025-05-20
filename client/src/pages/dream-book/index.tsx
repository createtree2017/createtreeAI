import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { DreamBookWithImages } from '@shared/dream-book';
import { Link, useLocation } from 'wouter';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Plus, BookOpen } from "lucide-react";
import { useAuth } from '@/hooks/useAuth';
import { format } from 'date-fns';
import { ko } from 'date-fns/locale';

export default function DreamBookListPage() {
  const { isAuthenticated } = useAuth();
  const [, navigate] = useLocation();
  const { toast } = useToast();

  React.useEffect(() => {
    if (!isAuthenticated) {
      toast({
        title: "로그인이 필요합니다",
        description: "태몽동화 목록을 보기 위해 로그인해주세요.",
        variant: "destructive",
      });
      navigate('/login');
    }
  }, [isAuthenticated, navigate, toast]);

  const { data: dreamBooks, isLoading, error } = useQuery<DreamBookWithImages[]>({
    queryKey: ['/api/dream-books'],
    enabled: isAuthenticated,
  });

  const getDreamerName = (dreamerId: string) => {
    const dreamerMap: Record<string, string> = {
      'mother': '엄마',
      'father': '아빠',
      'grandmother_mom': '외할머니',
      'grandmother_dad': '친할머니',
      'grandfather_mom': '외할아버지',
      'grandfather_dad': '친할아버지',
      'relative': '친척',
    };
    return dreamerMap[dreamerId] || dreamerId;
  };

  if (error) {
    return (
      <div className="container mx-auto py-8 px-4 text-center">
        <div className="max-w-3xl mx-auto">
          <h1 className="text-3xl font-bold mb-8">태몽동화</h1>
          <Card>
            <CardContent className="pt-6">
              <p className="text-red-500">오류가 발생했습니다. 다시 시도해주세요.</p>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="max-w-6xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold">태몽동화</h1>
          <Button asChild>
            <Link href="/dream-book/create">
              <Plus className="mr-2 h-4 w-4" />
              새 태몽동화 만들기
            </Link>
          </Button>
        </div>

        {isLoading ? (
          <div className="flex justify-center items-center h-40">
            <Loader2 className="h-8 w-8 animate-spin" />
          </div>
        ) : dreamBooks && dreamBooks.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {dreamBooks.map((dreamBook) => {
              // 첫 번째 이미지 찾기
              const coverImage = dreamBook.images && dreamBook.images.length > 0
                ? dreamBook.images.sort((a, b) => a.sequence - b.sequence)[0]
                : null;

              return (
                <Card key={dreamBook.id} className="overflow-hidden hover:shadow-lg transition-shadow">
                  {coverImage ? (
                    <div className="relative h-48 overflow-hidden">
                      <img
                        src={coverImage.imageUrl}
                        alt={`${dreamBook.babyName}의 태몽동화 표지`}
                        className="w-full h-full object-cover"
                      />
                    </div>
                  ) : (
                    <div className="relative h-48 bg-gray-200 flex justify-center items-center">
                      <BookOpen className="h-12 w-12 text-gray-400" />
                    </div>
                  )}
                  <CardHeader>
                    <CardTitle>{dreamBook.babyName}의 태몽동화</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground">{getDreamerName(dreamBook.dreamer)}의 꿈</p>
                    <p className="text-sm text-muted-foreground mt-1">
                      작성일: {format(new Date(dreamBook.createdAt), 'yyyy년 MM월 dd일', { locale: ko })}
                    </p>
                  </CardContent>
                  <CardFooter>
                    <Button asChild variant="outline" className="w-full">
                      <Link href={`/dream-book/${dreamBook.id}`}>
                        <BookOpen className="mr-2 h-4 w-4" />
                        동화 보기
                      </Link>
                    </Button>
                  </CardFooter>
                </Card>
              );
            })}
          </div>
        ) : (
          <Card>
            <CardContent className="pt-6 text-center">
              <BookOpen className="h-16 w-16 mx-auto text-gray-400 mb-4" />
              <p className="text-xl mb-4">아직 만든 태몽동화가 없습니다.</p>
              <Button asChild>
                <Link href="/dream-book/create">
                  <Plus className="mr-2 h-4 w-4" />
                  첫 태몽동화 만들기
                </Link>
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}