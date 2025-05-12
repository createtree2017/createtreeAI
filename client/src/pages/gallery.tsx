import { useState, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { getGalleryItems, toggleFavorite, toggleImageSharing } from "@/lib/api";
import { queryClient } from "@/lib/queryClient";
import { Music, PaintbrushVertical, Heart, Play, Eye, Share2, MessageCircle, ChevronLeft, ChevronRight, Globe, Share } from "lucide-react";
import { useLocation } from "wouter";
import { useAuth } from "@/hooks/useAuth";
import ImageDetailModal from "@/components/ImageDetailModal";

interface GalleryItem {
  id: number;
  title: string;
  type: "music" | "image" | "chat";
  url: string;
  thumbnailUrl?: string;
  duration?: number;
  createdAt: string;
  isFavorite: boolean;
  isShared?: boolean;   // 이미지가 공유되었는지 여부
  userId?: number;      // 항목 소유자의 사용자 ID
  isOwner?: boolean;    // 현재 로그인한 사용자가 소유자인지 여부
}

type FilterType = "all" | "music" | "image" | "chat" | "favorite" | "shared";

export default function Gallery() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const { user } = useAuth();
  const [activeFilter, setActiveFilter] = useState<FilterType>("all");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 6; // 한 페이지당 6개 항목
  const [selectedImageId, setSelectedImageId] = useState<number | null>(null);

  // 사용자 인증 상태에 따라 다른 쿼리키 사용
  const { data: items, isLoading, isError } = useQuery({
    queryKey: ["/api/gallery", activeFilter, user?.id],
    queryFn: () => getGalleryItems(activeFilter !== "all" ? activeFilter : undefined),
    // 재시도 옵션 추가
    retry: 1,
    // 사용자 변경 시 자동으로 쿼리 리프레시
    enabled: true
  });

  // 필터 변경 또는 사용자 변경 시 페이지 초기화
  useEffect(() => {
    setCurrentPage(1);
  }, [activeFilter, user?.id]);

  // 페이지네이션 처리
  const filteredItems = items || [];
  
  useEffect(() => {
    // 디버깅: 갤러리 항목과 사용자 정보 출력
    console.log('갤러리 데이터:', filteredItems);
    console.log('현재 사용자:', user ? `ID: ${user.id}, 이름: ${user.username || 'Unknown'}` : 'Not logged in');
  }, [filteredItems, user]);
  
  // 로깅을 통한 디버깅 지원
  console.log('갤러리 페이지 필터링 시작', {
    activeFilter,
    userId: user?.id,
    username: user?.username || '로그인 안됨',
    totalItems: filteredItems.length
  });
  
  // "shared" 필터가 활성화된 경우 공유된 이미지만 표시
  let displayItems = filteredItems;
  
  if (activeFilter === "shared") {
    // 이미지 중에서 공유된 항목만 필터링 (모든 사용자의 공유 이미지)
    displayItems = filteredItems.filter((item: GalleryItem) => 
      item.type === 'image' && item.isShared === true
    );
    console.log('공유된 이미지 필터링:', displayItems.length);
  } else {
    // 일반 필터: 사용자가 로그인한 경우 자신의 항목만 표시
    displayItems = user 
      ? filteredItems.filter((item: GalleryItem) => {
          // 아이템 소유권 디버깅 로그
          console.log(`항목 확인: ID=${item.id}, 타입=${item.type}, isOwner=${item.isOwner || false}, 항목 userId=${item.userId || 'none'}, 현재 userId=${user.id}`);
          
          // isOwner 속성이 명시적으로 설정된 경우 해당 값 사용
          if (item.isOwner === true) {
            return true;
          }
          
          // userId가 존재하고 현재 사용자의 ID와 일치하는 경우
          if (item.userId && item.userId === user.id) {
            return true;
          }
          
          // 필터링에서 제외
          return false;
        })
      : filteredItems;
  }
    
  console.log(`필터링 결과: ${displayItems.length}/${filteredItems.length} 항목 표시됨. 필터: ${activeFilter}`);
  
  // 개별 항목의 상세 디버깅 정보 (첫 번째 항목)
  if (displayItems.length > 0) {
    const firstItem = displayItems[0];
    console.log('첫 번째 갤러리 항목 세부 정보:', {
      id: firstItem.id,
      type: firstItem.type,
      title: firstItem.title,
      isOwner: firstItem.isOwner || false,
      userId: firstItem.userId,
      currentUserId: user?.id || 'not logged in',
      isFavorite: firstItem.isFavorite,
      isShared: firstItem.isShared || false
    });
  }
  
  
  const totalPages = Math.ceil(displayItems.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedItems = displayItems.slice(startIndex, startIndex + itemsPerPage);
  
  // Toggle favorite mutation
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
  
  // 이미지 공유 토글 mutation
  const { mutate: toggleImageSharingMutation } = useMutation({
    mutationFn: (imageId: number) => toggleImageSharing(imageId),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/gallery"] });
      toast({
        title: data.isShared ? "이미지 공유됨" : "이미지 공유 해제됨",
        description: data.isShared ? "다른 사용자들이 이미지를 볼 수 있습니다." : "다른 사용자들이 이미지를 볼 수 없습니다.",
      });
    },
    onError: (error) => {
      toast({
        title: "이미지 공유 상태 변경 실패",
        description: error.message,
        variant: "destructive",
      });
    },
  });
  
  const handleFilterGallery = (filter: FilterType) => {
    setActiveFilter(filter);
  };
  
  const handleToggleSharing = (item: GalleryItem) => {
    // 이미지만 공유 가능
    if (item.type !== 'image') {
      toast({
        title: "지원되지 않는 기능",
        description: "이미지만 공유할 수 있습니다.",
        variant: "destructive"
      });
      return;
    }
    
    // 자신의 이미지만 공유/비공유 설정 가능
    if (!item.isOwner) {
      toast({
        title: "권한 없음",
        description: "자신의 이미지만 공유 설정을 변경할 수 있습니다.",
        variant: "destructive"
      });
      return;
    }
    
    toggleImageSharingMutation(item.id);
  };
  
  const handleToggleFavorite = (item: GalleryItem) => {
    // 채팅은 즐겨찾기를 지원하지 않음
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
        // 채팅은 채팅 페이지로 이동
        setLocation(`/chat?id=${item.id}`);
      } else if (item.type === 'music') {
        // 음악은 음악 페이지로 이동
        setLocation(`/music?id=${item.id}`);
      } else if (item.type === 'image') {
        // 이미지는 모달로 표시
        console.log(`이미지 ${item.id} 모달 열기`);
        setSelectedImageId(item.id);
      }
    } else if (action === 'share') {
      if (item.type === 'image' && item.isOwner) {
        // 본인 소유 이미지인 경우 공유 상태 토글
        handleToggleSharing(item);
      } else {
        toast({
          title: "공유 기능",
          description: "자신의 이미지만 공유 설정을 변경할 수 있습니다.",
          variant: "destructive"
        });
      }
    }
  };
  
  const filters: { type: FilterType; label: string }[] = [
    { type: "all", label: "전체 컨텐츠" },
    { type: "image", label: "이미지" },
    { type: "music", label: "노래" },
    { type: "chat", label: "채팅" },
    { type: "favorite", label: "즐겨찾기" },
    { type: "shared", label: "공유된 이미지" },
  ];
  
  return (
    <div className="p-5 animate-fadeIn">
      {/* 이미지 상세 모달 */}
      <ImageDetailModal 
        imageId={selectedImageId} 
        onClose={() => setSelectedImageId(null)} 
      />
      
      <div className="text-center mb-6">
        <h2 className="font-heading font-bold text-2xl mb-2">나의 갤러리</h2>
        <p className="text-neutral-dark">소중한 추억이 모두 모인 공간</p>
      </div>
      
      {/* Gallery Filters */}
      <div className="mb-5 flex items-center space-x-2 overflow-x-auto py-2 custom-scrollbar">
        {filters.map((filter) => (
          <button
            key={filter.type}
            className={`text-sm py-2 px-4 rounded-full whitespace-nowrap font-semibold ${
              activeFilter === filter.type
                ? "bg-primary text-white"
                : "bg-gray-700 text-white"
            }`}
            onClick={() => handleFilterGallery(filter.type)}
          >
            {filter.label}
          </button>
        ))}
      </div>
      
      {/* Gallery Grid */}
      {isLoading ? (
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-neutral-lightest h-56 rounded-lg animate-pulse"></div>
          <div className="bg-neutral-lightest h-56 rounded-lg animate-pulse"></div>
          <div className="bg-neutral-lightest h-56 rounded-lg animate-pulse"></div>
          <div className="bg-neutral-lightest h-56 rounded-lg animate-pulse"></div>
        </div>
      ) : displayItems.length > 0 ? (
        <>
          <div className="grid grid-cols-2 gap-3">
            {paginatedItems.map((item: GalleryItem) => (
              <div
                key={`${item.type}-${item.id}`}
                className="bg-white rounded-lg overflow-hidden shadow-softer border border-neutral-light"
                data-item-type={item.type}
              >
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
                  <div 
                    className="relative cursor-pointer"
                    onClick={() => handleItemAction(item, item.type === "music" ? "play" : "view")}
                  >
                    <img
                      src={item.thumbnailUrl || item.url || "https://placehold.co/300x200/e2e8f0/1e293b?text=이미지+준비중"}
                      alt={item.title}
                      className="w-full h-32 object-cover"
                      onError={(e) => {
                        const target = e.target as HTMLImageElement;
                        target.src = "https://placehold.co/300x200/e2e8f0/1e293b?text=이미지+준비중";
                      }}
                    />
                    
                    {/* 타입 아이콘 */}
                    <div className="absolute top-2 left-2 bg-black bg-opacity-50 rounded-md p-1 z-10">
                      <PaintbrushVertical className="h-4 w-4 text-white" />
                    </div>
                    
                    {/* 공유 상태 표시 */}
                    {item.isShared && (
                      <div className="absolute top-2 right-2 bg-primary bg-opacity-70 rounded-md px-2 py-1 z-10">
                        <div className="flex items-center">
                          <Globe className="h-3 w-3 text-white mr-1" />
                          <span className="text-xs text-white font-medium">공유됨</span>
                        </div>
                      </div>
                    )}
                  </div>
                )}
                <div className="p-3">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="font-medium">{item.title}</p>
                      <p className="text-xs text-neutral-dark">
                        {item.type === "music" && item.duration
                          ? `${Math.floor(item.duration / 60)}:${(
                              item.duration % 60
                            )
                              .toString()
                              .padStart(2, "0")} • `
                          : ""}
                        {item.createdAt}
                      </p>
                    </div>
                    <button
                      className={`${
                        item.isFavorite ? "text-primary" : "text-neutral hover:text-primary"
                      }`}
                      onClick={() => handleToggleFavorite(item)}
                    >
                      {item.isFavorite ? (
                        <Heart className="h-4 w-4 fill-primary" />
                      ) : (
                        <Heart className="h-4 w-4" />
                      )}
                    </button>
                  </div>
                  <div className="flex mt-2 space-x-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="flex-1"
                      onClick={() =>
                        handleItemAction(
                          item,
                          item.type === "music" ? "play" : "view"
                        )
                      }
                    >
                      {item.type === "music" ? (
                        <>
                          <Play className="mr-1 h-3 w-3" /> 재생
                        </>
                      ) : item.type === "chat" ? (
                        <>
                          <Eye className="mr-1 h-3 w-3" /> 보기
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
                      disabled={item.type === 'image' && !item.isOwner}
                    >
                      {item.type === 'image' && item.isOwner ? (
                        <>
                          {item.isShared ? (
                            <>
                              <Globe className="mr-1 h-3 w-3 text-primary" /> 공유중
                            </>
                          ) : (
                            <>
                              <Share className="mr-1 h-3 w-3" /> 공유하기
                            </>
                          )}
                        </>
                      ) : (
                        <>
                          <Share2 className="mr-1 h-3 w-3" /> 공유
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
          
          {/* Pagination UI */}
          {totalPages > 1 && (
            <div className="flex justify-center items-center mt-8 mb-4">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
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
                onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                disabled={currentPage === totalPages}
                className="rounded-full p-2"
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          )}
        </>
      ) : (
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
            {!user ? "로그인이 필요합니다" : "찾을 수 없습니다"}
          </h3>
          <p className="text-neutral-dark mb-4">
            {!user 
              ? "콘텐츠를 보려면 먼저 로그인해주세요"
              : activeFilter === "favorite"
                ? "즐겨찾기 항목을 추가하면 여기에 표시됩니다!"
                : activeFilter === "music"
                ? "태교 음악 메뉴에서 첫 음악을 만들어보세요!"
                : activeFilter === "image"
                ? "추억 예술 메뉴에서 사진을 변환해보세요!"
                : activeFilter === "chat"
                ? "엄마 상담사 메뉴에서 대화를 나눠보세요!"
              : "음악을 만들거나 사진을 변환하거나 상담사와 대화해보세요!"}
          </p>
          
          {/* 로그인이 필요한 경우 로그인 버튼 표시 */}
          {!user && (
            <Button 
              variant="default" 
              className="bg-primary hover:bg-primary-dark text-white font-semibold"
              onClick={() => setLocation("/auth")}
            >
              로그인하기
            </Button>
          )}
        </div>
      )}
    </div>
  );
}