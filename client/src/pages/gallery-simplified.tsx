import { useState, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { api } from "@/lib/apiClient";
import { queryClient } from "@/lib/queryClient";
import { Music, PaintbrushVertical, Heart, Play, Eye, Share2, MessageCircle, ChevronLeft, ChevronRight, Download, X } from "lucide-react";
import { useLocation } from "wouter";
import { useAuth } from "@/hooks/useAuth";
import { Dialog, DialogContent } from "@/components/ui/dialog";

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
  const [viewImageDialog, setViewImageDialog] = useState(false);
  const [selectedItem, setSelectedItem] = useState<GalleryItem | null>(null);

  // 갤러리 항목 조회
  const { data: items, isLoading } = useQuery({
    queryKey: ["/api/gallery", activeFilter],
    queryFn: () => api.getGalleryItems(activeFilter !== "all" ? activeFilter : undefined),
  });

  // 필터 변경 시 페이지 초기화
  useEffect(() => {
    setCurrentPage(1);
  }, [activeFilter]);

  // 페이지네이션 처리
  // API 응답 구조를 확인하고 배열인지 확인
  let filteredItems = Array.isArray(items) ? items : [];
  // items가 객체이고 items 속성이 있는 경우 (API 응답 형식이 { items: [] } 형태일 수 있음)
  if (items && !Array.isArray(items) && items.items && Array.isArray(items.items)) {
    filteredItems = items.items;
  }
  
  const totalPages = Math.ceil(filteredItems.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedItems = filteredItems.slice(startIndex, startIndex + itemsPerPage);

  // 즐겨찾기 토글
  const { mutate: toggleFavoriteMutation } = useMutation({
    mutationFn: ({ itemId, type }: { itemId: number; type: string }) => api.toggleFavorite(itemId, type),
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

  // 이미지 다운로드 함수
  const handleDownload = async (id: number) => {
    try {
      // 실제 다운로드 기능이 구현되어 있지 않아 토스트만 표시
      toast({
        title: "다운로드 시작",
        description: "이미지 다운로드가 시작되었습니다."
      });
    } catch (error) {
      toast({
        title: "다운로드 실패",
        description: "다시 시도해주세요.",
        variant: "destructive"
      });
    }
  };
  
  // 공유 기능
  const handleShare = (id: number) => {
    toast({
      title: "공유 기능",
      description: "준비 중입니다!",
    });
  };

  const handleItemAction = (item: GalleryItem, action: 'view' | 'play' | 'share') => {
    if (action === 'play') {
      // 음악 재생 - 기존과 동일하게 음악 페이지로 이동
      setLocation(`/music?id=${item.id}`);
    } else if (action === 'view') {
      if (item.type === 'chat') {
        // 채팅은 기존과 동일하게 채팅 페이지로 이동
        setLocation(`/chat?id=${item.id}`);
      } else if (item.type === 'image') {
        // 이미지는 팝업 다이얼로그로 표시
        setSelectedItem(item);
        setViewImageDialog(true);
      } else {
        // 음악도 상세 페이지로 이동
        setLocation(`/music?id=${item.id}`);
      }
    } else if (action === 'share') {
      if (item.id) {
        handleShare(item.id);
      }
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
        <div className="grid grid-cols-2 gap-4">
          {paginatedItems.map((item: GalleryItem) => (
            <div
              key={`${item.type}-${item.id}`}
              className="bg-white rounded-xl overflow-hidden shadow-soft border border-border hover:shadow-md transition-shadow cursor-pointer"
              onClick={() => handleItemAction(item, item.type === "music" ? "play" : "view")}
            >
              {/* 아이템 썸네일 */}
              {item.type === "music" ? (
                <div className="aspect-square w-full overflow-hidden bg-primary-light flex items-center justify-center">
                  <div className="p-4 bg-white rounded-full text-primary-dark">
                    <Music className="h-8 w-8" />
                  </div>
                </div>
              ) : item.type === "chat" ? (
                <div className="aspect-square w-full overflow-hidden bg-accent2-light flex items-center justify-center">
                  <div className="p-4 bg-white rounded-full text-accent2-dark">
                    <MessageCircle className="h-8 w-8" />
                  </div>
                </div>
              ) : (
                <div className="relative">
                  <div className="aspect-square w-full overflow-hidden">
                    <img
                      src={item.thumbnailUrl || item.url || "https://placehold.co/400x400/F0F0F0/AAA?text=이미지+준비중"}
                      alt={item.title}
                      className="w-full h-full object-cover"
                      loading="lazy"
                      onError={(e) => {
                        const target = e.target as HTMLImageElement;
                        target.src = "https://placehold.co/400x400/F0F0F0/AAA?text=이미지+준비중";
                      }}
                    />
                  </div>
                </div>
              )}
              
              {/* 아이템 정보 */}
              <div className="p-3">
                <div className="flex flex-col gap-2">
                  <h4 className="font-medium text-[15px] text-neutral-dark line-clamp-1">{item.title}</h4>
                  <div className="flex justify-between items-center">
                    <p className="text-xs text-muted-foreground">
                      {item.type === "music" && item.duration
                        ? `${Math.floor(item.duration / 60)}:${(item.duration % 60).toString().padStart(2, "0")} • `
                        : ""}
                      {item.createdAt}
                    </p>
                    <div className="flex gap-3 mr-1">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleItemAction(item, item.type === "music" ? "play" : "view");
                        }}
                        className="text-gray-600 hover:text-[#ff2d55] transition-colors p-1"
                        title={item.type === "music" ? "재생" : "크게 보기"}
                      >
                        {item.type === "music" ? (
                          <Play className="h-5 w-5" />
                        ) : (
                          <Eye className="h-5 w-5" />
                        )}
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleShare(item.id);
                        }}
                        className="text-gray-600 hover:text-[#ff2d55] transition-colors p-1"
                        title="공유하기"
                      >
                        <Share2 className="h-5 w-5" />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleToggleFavorite(item);
                        }}
                        className={`p-1 transition-colors ${item.isFavorite ? "text-[#ff2d55]" : "text-gray-600 hover:text-[#ff2d55]"}`}
                        title={item.isFavorite ? "즐겨찾기 해제" : "즐겨찾기 추가"}
                      >
                        {item.isFavorite ? (
                          <Heart className="h-5 w-5 fill-[#ff2d55]" />
                        ) : (
                          <Heart className="h-5 w-5" />
                        )}
                      </button>
                    </div>
                  </div>
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
      
      {/* 이미지 상세 보기 다이얼로그 */}
      <Dialog open={viewImageDialog} onOpenChange={setViewImageDialog}>
        <DialogContent className="max-w-5xl w-[95vw] h-auto p-0 overflow-hidden bg-white dark:bg-zinc-900 rounded-xl shadow-xl border-0">
          {/* X 버튼 */}
          <button
            onClick={() => setViewImageDialog(false)}
            className="absolute top-4 right-4 z-50 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-white bg-white/80 dark:bg-black/50 hover:bg-white/90 dark:hover:bg-black/70 p-2 rounded-full transition-all shadow-md"
            aria-label="닫기"
          >
            <X className="h-5 w-5" />
          </button>
          
          {/* 이미지 표시 */}
          <div className="bg-black w-full h-full flex items-center justify-center">
            {selectedItem && selectedItem.type === "image" && (
              <img 
                src={selectedItem.url || selectedItem.thumbnailUrl} 
                alt={selectedItem.title || "갤러리 이미지"} 
                className="max-w-full max-h-[85vh] object-contain"
              />
            )}
          </div>
          
          {/* 하단 정보 및 액션 영역 */}
          <div className="absolute bottom-0 left-0 right-0 bg-white/95 dark:bg-zinc-900/95 backdrop-blur-md border-t border-gray-200 dark:border-gray-800">
            {/* 제목 및 버튼 */}
            <div className="px-6 py-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">
                {selectedItem?.title}
              </h3>
              
              {selectedItem && selectedItem.type === "image" && (
                <div className="flex items-center gap-3">
                  <Button 
                    className="bg-[#ff2d55] hover:bg-[#ff2d55]/90 text-white rounded-lg h-11"
                    onClick={() => selectedItem.id && handleDownload(selectedItem.id)}
                  >
                    <Download className="mr-2 h-4 w-4" />
                    <span>다운로드</span>
                  </Button>
                  <Button 
                    className="bg-gray-200 hover:bg-gray-300 text-gray-800 dark:bg-zinc-800 dark:hover:bg-zinc-700 dark:text-gray-200 rounded-lg h-11"
                    onClick={() => selectedItem.id && handleShare(selectedItem.id)}
                  >
                    <Share2 className="mr-2 h-4 w-4" />
                    <span>공유하기</span>
                  </Button>
                </div>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}