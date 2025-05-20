import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { DreamBookWithImages } from '@shared/dream-book';
import { useRoute, Link } from 'wouter';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, ArrowLeft, Share, ChevronLeft, ChevronRight } from "lucide-react";
import { useAuth } from '@/hooks/useAuth';
import { format } from 'date-fns';
import { ko } from 'date-fns/locale';
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from "@/components/ui/carousel";

export default function DreamBookDetailPage() {
  const [match, params] = useRoute('/dream-book/:id');
  const { user } = useAuth();
  const [activeSlide, setActiveSlide] = React.useState(0);

  const { data: dreamBook, isLoading, error } = useQuery<DreamBookWithImages>({
    queryKey: ['/api/dream-books', params?.id],
    queryFn: async () => {
      if (!params?.id) {
        throw new Error('태몽동화 ID가 없습니다.');
      }
      
      const response = await fetch(`/api/dream-books/${params.id}`, {
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      if (!response.ok) {
        throw new Error('태몽동화를 불러오는 중 오류가 발생했습니다.');
      }
      
      return await response.json();
    },
    enabled: !!params?.id,
  });

  // 꿈을 꾼 사람 이름 가져오기
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

  // 스타일 ID를 스타일 이름으로 변환
  const getStyleName = (styleId: string | number) => {
    // 데이터베이스 스타일 ID를 실제 스타일 이름으로 매핑
    const styleIdMap: Record<string, string> = {
      '1': '테스트',
      '2': '지브리풍',
      '3': '디즈니풍',
      '4': '수채화풍',
      '5': '사실적',
      '6': '전통 한국화',
    };
    
    const styleId_str = String(styleId);
    return styleIdMap[styleId_str] || `스타일 ${styleId_str}`;
  };

  const sortedImages = dreamBook?.images
    ? [...dreamBook.images].sort((a, b) => a.sequence - b.sequence)
    : [];

  if (isLoading) {
    return (
      <div className="container mx-auto py-8 px-4 flex justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (error || !dreamBook) {
    return (
      <div className="container mx-auto py-8 px-4">
        <div className="max-w-4xl mx-auto">
          <Button asChild variant="ghost" className="mb-4">
            <Link href="/dream-book">
              <ArrowLeft className="mr-2 h-4 w-4" />
              목록으로 돌아가기
            </Link>
          </Button>

          <Card className="mb-8">
            <CardContent className="pt-6">
              <p className="text-red-500">태몽동화를 불러오는 중 오류가 발생했습니다.</p>
              <Button asChild className="mt-4">
                <Link href="/dream-book">목록으로 돌아가기</Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="max-w-4xl mx-auto">
        <Button asChild variant="ghost" className="mb-4">
          <Link href="/dream-book">
            <ArrowLeft className="mr-2 h-4 w-4" />
            태몽동화 목록으로
          </Link>
        </Button>

        <Card className="mb-8">
          <CardHeader>
            <div className="flex justify-between items-center">
              <CardTitle className="text-3xl">{dreamBook.babyName}의 태몽동화</CardTitle>
              <Button variant="outline" size="icon" onClick={() => {
                if (navigator.share) {
                  navigator.share({
                    title: `${dreamBook.babyName}의 태몽동화`,
                    text: '태몽동화를 확인해보세요!',
                    url: window.location.href,
                  }).catch(err => console.error('공유 실패:', err));
                }
              }}>
                <Share className="h-4 w-4" />
              </Button>
            </div>
            <div className="flex flex-col sm:flex-row sm:justify-between text-sm text-muted-foreground mt-2">
              <p>{getDreamerName(dreamBook.dreamer)}의 꿈 | {getStyleName(dreamBook.style)} 스타일</p>
              <p>작성일: {format(new Date(dreamBook.createdAt), 'yyyy년 MM월 dd일', { locale: ko })}</p>
            </div>
          </CardHeader>
          <CardContent>
            <div className="prose max-w-none mb-8">
              <p className="whitespace-pre-line">{dreamBook.summaryText}</p>
            </div>

            {sortedImages.length > 0 && (
              <div className="mt-8">
                <h3 className="text-xl font-bold mb-4">태몽동화 장면</h3>
                
                <Carousel className="w-full"
                  onSelect={(index) => setActiveSlide(index)}
                  opts={{
                    loop: true,
                  }}>
                  <CarouselContent>
                    {sortedImages.map((image, index) => (
                      <CarouselItem key={image.id}>
                        <div className="flex flex-col items-center p-1">
                          <div className="overflow-hidden rounded-lg w-full h-[50vh] flex items-center justify-center bg-black">
                            <img
                              src={image.imageUrl}
                              alt={`장면 ${index + 1}`}
                              className="object-contain w-full h-full"
                            />
                          </div>
                          <div className="mt-4 text-center">
                            <p className="text-lg font-medium">장면 {index + 1}</p>
                            <div className="mt-2 bg-purple-800 p-3 rounded shadow-lg">
                              <p className="text-sm text-white font-medium whitespace-pre-line max-h-32 overflow-y-auto">{image.prompt}</p>
                            </div>
                          </div>
                        </div>
                      </CarouselItem>
                    ))}
                  </CarouselContent>
                  <CarouselPrevious className="hidden sm:flex" />
                  <CarouselNext className="hidden sm:flex" />
                </Carousel>

                <div className="flex justify-center mt-4 gap-4 sm:hidden">
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => {
                      const prev = activeSlide - 1 < 0 ? sortedImages.length - 1 : activeSlide - 1;
                      setActiveSlide(prev);
                      document.querySelectorAll('.carousel-item')[prev].scrollIntoView({
                        behavior: 'smooth',
                        block: 'nearest',
                        inline: 'center'
                      });
                    }}
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <span className="flex items-center">
                    {activeSlide + 1} / {sortedImages.length}
                  </span>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => {
                      const next = (activeSlide + 1) % sortedImages.length;
                      setActiveSlide(next);
                      document.querySelectorAll('.carousel-item')[next].scrollIntoView({
                        behavior: 'smooth',
                        block: 'nearest',
                        inline: 'center'
                      });
                    }}
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}
            
            <div className="flex justify-center mt-8">
              <Button asChild>
                <Link href="/dream-book/create">
                  새 태몽동화 만들기
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}