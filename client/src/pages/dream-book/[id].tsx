import React, { useState, useEffect } from "react";
import { useParams, useLocation, useNavigate } from "wouter";
import { useQuery } from "@tanstack/react-query";

// UI 컴포넌트
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel";
import { Loader2, Home, Share } from "lucide-react";
import { toast, useToast } from "@/hooks/use-toast";
import { useAuthContext } from "@/lib/AuthProvider";

export default function DreamBookDetail() {
  const params = useParams<{ id: string }>();
  const { id } = params;
  const [, navigate] = useLocation();
  const { user } = useAuthContext();
  const [imagesLoaded, setImagesLoaded] = useState<{ [key: number]: boolean }>(
    {},
  );

  const {
    data: dreamBook,
    isLoading,
    error,
  } = useQuery({
    queryKey: [`/api/dream-books/${id}`],
    queryFn: async () => {
      const response = await fetch(`/api/dream-books/${id}`);
      if (!response.ok) {
        throw new Error("태몽동화를 불러오는데 실패했습니다");
      }
      return response.json();
    },
    enabled: !!id,
  });

  // 무한 로딩 방지 로직
  useEffect(() => {
    if (!dreamBook) return;

    // 이미지 존재하지 않거나 에러 이미지인 경우 즉시 로드 완료 처리
    if (dreamBook.images && dreamBook.images.length > 0) {
      const newLoadedState: { [key: number]: boolean } = {};

      dreamBook.images.forEach((image, index) => {
        const imageUrl = image.imageUrl;
        if (
          !imageUrl ||
          imageUrl === "/static/uploads/dream-books/error.png" ||
          !imageUrl.startsWith("/static/uploads/dream-books/")
        ) {
          newLoadedState[index] = true;
        }
      });

      setImagesLoaded((prev) => ({ ...prev, ...newLoadedState }));
    }
  }, [dreamBook]);

  const handleShare = async () => {
    if (navigator.share && window.location.href) {
      try {
        await navigator.share({
          title: `${dreamBook?.babyName}의 태몽동화`,
          text: `${dreamBook?.dreamer}님이 꾼 태몽으로 만든 ${dreamBook?.babyName}의 동화를 확인해보세요!`,
          url: window.location.href,
        });
      } catch (err) {
        toast({
          title: "공유 실패",
          description: "공유하는 도중 오류가 발생했습니다.",
          variant: "destructive",
        });
      }
    } else {
      try {
        await navigator.clipboard.writeText(window.location.href);
        toast({
          title: "링크 복사됨",
          description: "이 태몽동화의 주소가 클립보드에 복사되었습니다.",
        });
      } catch (err) {
        toast({
          title: "복사 실패",
          description: "주소를 복사하는 도중 오류가 발생했습니다.",
          variant: "destructive",
        });
      }
    }
  };

  if (!user) {
    return (
      <div className="container mx-auto py-10 px-4">
        <Card>
          <CardContent className="p-6 text-center">
            <h2 className="text-2xl font-bold mb-4">로그인이 필요합니다</h2>
            <p className="text-gray-500 mb-6">
              태몽동화를 보기 위해서는 로그인이 필요합니다.
            </p>
            <Button onClick={() => navigate("/login")}>
              로그인 페이지로 이동
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="container mx-auto py-10 px-4 flex flex-col items-center justify-center min-h-[50vh]">
        <Loader2 className="h-16 w-16 animate-spin text-primary mb-4" />
        <p>태몽동화를 불러오는 중...</p>
      </div>
    );
  }

  if (error || !dreamBook) {
    return (
      <div className="container mx-auto py-10 px-4">
        <Card>
          <CardContent className="p-6 text-center">
            <h2 className="text-2xl font-bold mb-4">
              태몽동화를 찾을 수 없습니다
            </h2>
            <p className="text-gray-500 mb-6">
              요청하신 태몽동화를 불러오는 중 오류가 발생했거나 존재하지
              않습니다.
            </p>
            <Button onClick={() => navigate("/dream-book")}>
              태몽동화 목록으로
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-10 px-4">
      <div className="mb-8 flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">
            {dreamBook.babyName}의 태몽동화
          </h1>
          <p className="text-gray-500 mt-2">
            {dreamBook.dreamer}님이 꾼 태몽으로 만든 특별한 이야기
          </p>
          <p className="text-sm text-gray-400 mt-1">
            생성일: {new Date(dreamBook.createdAt).toLocaleDateString("ko-KR")}
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="icon"
            onClick={() => navigate("/dream-book")}
          >
            <Home className="h-5 w-5" />
          </Button>
          <Button variant="outline" size="icon" onClick={handleShare}>
            <Share className="h-5 w-5" />
          </Button>
        </div>
      </div>

      <div className="mb-10">
        <Carousel className="w-full max-w-3xl mx-auto">
          <CarouselContent>
            {dreamBook.images && dreamBook.images.length > 0 ? (
              dreamBook.images.map((image, index) => (
                <CarouselItem key={index}>
                  <Card className="overflow-hidden">
                    <div className="relative aspect-[4/3] bg-gray-100 overflow-hidden">
                      <img
                        src={(() => {
                          const imageUrl = image.imageUrl;
                          const isValidImage = imageUrl?.startsWith(
                            "/static/uploads/dream-books/",
                          );
                          return isValidImage
                            ? imageUrl
                            : "/static/uploads/dream-books/error.png";
                        })()}
                        alt={`태몽동화 장면 ${index + 1}`}
                        className="object-cover w-full h-full"
                        onError={(e) => {
                          const target = e.target as HTMLImageElement;
                          target.src = "/static/uploads/dream-books/error.png";
                          setImagesLoaded((prev) => ({
                            ...prev,
                            [index]: true,
                          }));
                        }}
                        onLoad={() =>
                          setImagesLoaded((prev) => ({
                            ...prev,
                            [index]: true,
                          }))
                        }
                      />
                    </div>
                    <CardContent className="p-6">
                      <div className="grid gap-4">
                        <div>
                          <h3 className="text-xl font-semibold mb-2">
                            장면 {index + 1}
                          </h3>
                          <p className="text-gray-700 whitespace-pre-line">
                            {image.prompt}
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </CarouselItem>
              ))
            ) : (
              <CarouselItem>
                <Card className="overflow-hidden">
                  <div className="relative aspect-[4/3] bg-gray-100 overflow-hidden">
                    <img
                      src="/static/uploads/dream-books/error.png"
                      alt="이미지를 찾을 수 없음"
                      className="object-cover w-full h-full"
                    />
                  </div>
                  <CardContent className="p-6">
                    <div className="grid gap-4">
                      <div>
                        <h3 className="text-xl font-semibold mb-2">
                          태몽동화 장면
                        </h3>
                        <p className="text-gray-700">
                          태몽동화 데이터가 손상되었거나 장면 정보가 없습니다.
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </CarouselItem>
            )}
          </CarouselContent>
          <CarouselPrevious className="absolute left-0 -translate-x-1/2" />
          <CarouselNext className="absolute right-0 translate-x-1/2" />
        </Carousel>
      </div>

      <div className="flex justify-center gap-4 mt-10">
        <Button variant="outline" onClick={() => navigate("/dream-book")}>
          목록으로 돌아가기
        </Button>
        <Button onClick={() => navigate("/dream-book/create")}>
          새 태몽동화 만들기
        </Button>
      </div>
    </div>
  );
}
