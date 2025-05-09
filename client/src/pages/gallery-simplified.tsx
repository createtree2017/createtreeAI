import { useState, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { getGalleryItems, toggleFavorite } from "@/lib/api";
import { queryClient } from "@/lib/queryClient";
import { Music, PaintbrushVertical, Heart, Play, Eye, Share2, MessageCircle, ChevronLeft, ChevronRight } from "lucide-react";
import { useLocation } from "wouter";
import { useAuth } from "@/hooks/useAuth";

interface GalleryItem {
  id: number;
  title: string;
  type: "music" | "image" | "chat";
  url: string;
  thumbnailUrl?: string;
  duration?: number;
  createdAt: string;
  isFavorite: boolean;
}

type FilterType = "all" | "music" | "image" | "chat" | "favorite";

export default function Gallery() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const { user } = useAuth();
  const [activeFilter, setActiveFilter] = useState<FilterType>("all");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 6; // 한 페이지당 6개 항목

  // 갤러리 항목 조회
  const { data: items, isLoading } = useQuery({
    queryKey: ["/api/gallery", activeFilter],
    queryFn: () => getGalleryItems(activeFilter !== "all" ? activeFilter : undefined),
  });

  // 필터 변경 시 페이지 초기화
  useEffect(() => {
    setCurrentPage(1);
  }, [activeFilter]);

  // 페이지네이션 처리
  const filteredItems = items || [];
  const totalPages = Math.ceil(filteredItems.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedItems = filteredItems.slice(startIndex, startIndex + itemsPerPage);

  // 즐겨찾기 토글
  const { mutate: toggleFavoriteMutation } = useMutation({
    mutationFn: ({ itemId, type }: { itemId: number; type: string }) => toggleFavorite(itemId, type),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/gallery"] });
      toast({
        title: "즐겨찾기 업데이트됨",
        description: "갤러리가 업데이트되었습니다",
      });
    },
    onError: (error) => {
      toast({
        title: "즐겨찾기 업데이트 오류",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleFilterGallery = (filter: FilterType) => {
    setActiveFilter(filter);
  };

  const handleToggleFavorite = (item: GalleryItem) => {
    if (item.type === 'chat') {
      toast({
        title: "지원되지 않는 기능",
        description: "채팅은 현재 즐겨찾기를 지원하지 않습니다.",
        variant: "destructive"
      });
      return;
    }
    toggleFavoriteMutation({ itemId: item.id, type: item.type });
  };

  const handleItemAction = (item: GalleryItem, action: 'view' | 'play' | 'share') => {
    if (action === 'view' || action === 'play') {
      if (item.type === 'chat') {
        setLocation(`/chat?id=${item.id}`);
      } else {
        setLocation(`/${item.type === 'music' ? 'music' : 'image'}?id=${item.id}`);
      }
    } else if (action === 'share') {
      toast({
        title: "공유 기능",
        description: "준비 중입니다!",
      });
    }
  };

  const filters = [
    { type: "all" as FilterType, label: "전체 컨텐츠" },
    { type: "image" as FilterType, label: "이미지" },
    { type: "music" as FilterType, label: "노래" },
    { type: "chat" as FilterType, label: "채팅" },
    { type: "favorite" as FilterType, label: "즐겨찾기" },
  ];

  // 빈 상태 메시지
  const getEmptyMessage = () => {
    if (activeFilter === "favorite") return "즐겨찾기 항목을 추가하면 여기에 표시됩니다!";
    if (activeFilter === "music") return "태교 음악 메뉴에서 첫 음악을 만들어보세요!";
    if (activeFilter === "image") return "추억 예술 메뉴에서 사진을 변환해보세요!";
    if (activeFilter === "chat") return "엄마 상담사 메뉴에서 대화를 나눠보세요!";
    return "음악을 만들거나 사진을 변환하거나 상담사와 대화해보세요!";
  };

  return (
    <div className="p-5 animate-fadeIn">
      {/* 헤더 */}
      <div className="text-center mb-6">
        <h2 className="font-heading font-bold text-2xl mb-2">나의 갤러리</h2>
        <p className="text-neutral-dark">소중한 추억이 모두 모인 공간</p>
      </div>
      
      {/* 필터 버튼 */}
      <div className="mb-5 flex items-center space-x-2 overflow-x-auto py-2 custom-scrollbar">
        {filters.map((filter) => (
          <button
            key={filter.type}
            className={`text-sm py-2 px-4 rounded-full whitespace-nowrap font-semibold ${
              activeFilter === filter.type ? "bg-primary text-white" : "bg-gray-700 text-white"
            }`}
            onClick={() => handleFilterGallery(filter.type)}
          >
            {filter.label}
          </button>
        ))}
      </div>
      
      {/* 로딩 상태 */}
      {isLoading && (
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-neutral-lightest h-56 rounded-lg animate-pulse"></div>
          <div className="bg-neutral-lightest h-56 rounded-lg animate-pulse"></div>
          <div className="bg-neutral-lightest h-56 rounded-lg animate-pulse"></div>
          <div className="bg-neutral-lightest h-56 rounded-lg animate-pulse"></div>
        </div>
      )}
      
      {/* 갤러리 그리드 */}
      {!isLoading && paginatedItems.length > 0 && (
        <div className="grid grid-cols-2 gap-3">
          {paginatedItems.map((item) => (
            <div
              key={`${item.type}-${item.id}`}
              className="bg-white rounded-lg overflow-hidden shadow-softer border border-neutral-light"
            >
              {/* 아이템 썸네일 */}
              {item.type === "music" ? (
                <div className="h-32 bg-primary-light flex items-center justify-center">
                  <div className="p-3 bg-white rounded-full text-primary-dark">
                    <Music className="h-5 w-5" />
                  </div>
                </div>
              ) : item.type === "chat" ? (
                <div className="h-32 bg-accent2-light flex items-center justify-center">
                  <div className="p-3 bg-white rounded-full text-accent2-dark">
                    <MessageCircle className="h-5 w-5" />
                  </div>
                </div>
              ) : (
                <div className="relative">
                  <img
                    src={item.thumbnailUrl || item.url || "https://placehold.co/300x200/e2e8f0/1e293b?text=이미지+준비중"}
                    alt={item.title}
                    className="w-full h-32 object-cover"
                    onError={(e) => {
                      const target = e.target as HTMLImageElement;
                      target.src = "https://placehold.co/300x200/e2e8f0/1e293b?text=이미지+준비중";
                    }}
                  />
                </div>
              )}
              
              {/* 아이템 정보 */}
              <div className="p-3">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="font-medium">{item.title}</p>
                    <p className="text-xs text-neutral-dark">
                      {item.type === "music" && item.duration
                        ? `${Math.floor(item.duration / 60)}:${(item.duration % 60).toString().padStart(2, "0")} • `
                        : ""}
                      {item.createdAt}
                    </p>
                  </div>
                  <button
                    className={`${item.isFavorite ? "text-primary" : "text-neutral hover:text-primary"}`}
                    onClick={() => handleToggleFavorite(item)}
                  >
                    {item.isFavorite ? (
                      <Heart className="h-4 w-4 fill-primary" />
                    ) : (
                      <Heart className="h-4 w-4" />
                    )}
                  </button>
                </div>
                
                {/* 액션 버튼 */}
                <div className="flex mt-2 space-x-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="flex-1"
                    onClick={() => handleItemAction(item, item.type === "music" ? "play" : "view")}
                  >
                    {item.type === "music" ? (
                      <>
                        <Play className="mr-1 h-3 w-3" /> 재생
                      </>
                    ) : (
                      <>
                        <Eye className="mr-1 h-3 w-3" /> 보기
                      </>
                    )}
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="flex-1"
                    onClick={() => handleItemAction(item, "share")}
                  >
                    <Share2 className="mr-1 h-3 w-3" /> 공유
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
      
      {/* 페이지네이션 */}
      {!isLoading && paginatedItems.length > 0 && totalPages > 1 && (
        <div className="flex justify-center items-center mt-8 mb-4">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
            disabled={currentPage === 1}
            className="rounded-full p-2"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          
          <span className="mx-4 text-sm font-medium">
            {currentPage} / {totalPages}
          </span>
          
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}
            disabled={currentPage === totalPages}
            className="rounded-full p-2"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      )}
      
      {/* 빈 상태 */}
      {!isLoading && paginatedItems.length === 0 && (
        <div className="text-center py-10 bg-neutral-lightest rounded-lg">
          <div className="mb-3 w-16 h-16 mx-auto bg-accent2-light rounded-full flex items-center justify-center">
            {activeFilter === "music" ? (
              <Music className="h-8 w-8 text-accent2-dark" />
            ) : activeFilter === "image" ? (
              <PaintbrushVertical className="h-8 w-8 text-accent2-dark" />
            ) : activeFilter === "chat" ? (
              <MessageCircle className="h-8 w-8 text-accent2-dark" />
            ) : activeFilter === "favorite" ? (
              <Heart className="h-8 w-8 text-accent2-dark" />
            ) : (
              <div className="flex">
                <Music className="h-8 w-8 text-accent2-dark" />
                <PaintbrushVertical className="h-8 w-8 text-accent2-dark ml-1" />
                <MessageCircle className="h-8 w-8 text-accent2-dark ml-1" />
              </div>
            )}
          </div>
          <h3 className="font-heading font-semibold text-lg mb-1">
            찾을 수 없습니다
          </h3>
          <p className="text-neutral-dark">{getEmptyMessage()}</p>
        </div>
      )}
    </div>
  );
}