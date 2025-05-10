import { useState, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { getGalleryItems } from "@/lib/api";
import { Music, PaintbrushVertical, Heart, Play, Eye, Share2, MessageCircle, ChevronLeft, ChevronRight } from "lucide-react";
import { useLocation } from "wouter";
import { useAuth } from "@/hooks/useAuth";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

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

export default function Profile() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const { user } = useAuth();
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 6; // 한 페이지당 6개 항목
  const [activeTab, setActiveTab] = useState("gallery");

  // 갤러리 항목 조회 - 사용자의 모든 항목 조회
  const { data: items, isLoading, error } = useQuery({
    queryKey: ["/api/gallery", user?.username],
    queryFn: async () => {
      try {
        // 사용자 정보가 있으면 이미지 필터를 적용하여 사용자 관련 항목을 가져옴
        return await getGalleryItems();
      } catch (err) {
        console.error('갤러리 데이터 가져오기 실패:', err);
        return [];
      }
    },
    enabled: !!user // 사용자가 로그인된 경우에만 쿼리 활성화
  });

  // 페이지네이션 처리
  const filteredItems = items || [];
  const totalPages = Math.ceil(filteredItems.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedItems = filteredItems.slice(startIndex, startIndex + itemsPerPage);

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

  // 빈 상태 메시지
  const getEmptyMessage = () => {
    return "추억 예술 메뉴에서 사진을 변환해보세요!";
  };

  return (
    <div className="p-5 animate-fadeIn">
      {/* 헤더 */}
      <div className="text-center mb-6">
        <h2 className="font-heading font-bold text-2xl mb-2">마이페이지</h2>
        <p className="text-neutral-dark">나의 계정 정보와 콘텐츠</p>
      </div>
      
      {/* 프로필 정보 */}
      <div className="bg-white p-4 rounded-lg shadow-softer border border-neutral-light mb-6">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 bg-primary-light rounded-full flex items-center justify-center">
            <User className="w-8 h-8 text-primary" />
          </div>
          <div>
            <h3 className="font-semibold text-lg">{user?.username || "사용자"}</h3>
            <p className="text-sm text-neutral-dark">{user?.email || "이메일 정보 없음"}</p>
          </div>
        </div>
      </div>

      {/* 탭 내비게이션 */}
      <Tabs defaultValue="gallery" className="mb-4" value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="w-full grid grid-cols-2">
          <TabsTrigger value="gallery">나의 갤러리</TabsTrigger>
          <TabsTrigger value="account">계정 설정</TabsTrigger>
        </TabsList>
        
        <TabsContent value="gallery" className="pt-4">
          {/* 이미지 갤러리 섹션 */}
          <div className="mb-4">
            <h3 className="font-semibold text-lg mb-2">내가 만든 이미지</h3>
            
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
                {paginatedItems.map((item: GalleryItem) => (
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
                            {new Date(item.createdAt).toLocaleDateString()}
                          </p>
                        </div>
                        <div className={`${item.isFavorite ? "text-primary" : "text-neutral"}`}>
                          {item.isFavorite ? (
                            <Heart className="h-4 w-4 fill-primary" />
                          ) : (
                            <Heart className="h-4 w-4" />
                          )}
                        </div>
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
                  <PaintbrushVertical className="h-8 w-8 text-accent2-dark" />
                </div>
                <h3 className="font-heading font-semibold text-lg mb-1">
                  이미지가 없습니다
                </h3>
                <p className="text-neutral-dark">{getEmptyMessage()}</p>
              </div>
            )}
          </div>
        </TabsContent>
        
        <TabsContent value="account">
          <div className="bg-white p-4 rounded-lg shadow-softer border border-neutral-light">
            <h3 className="font-semibold text-lg mb-4">계정 정보</h3>
            
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-neutral-dark">사용자 이름</label>
                <div className="bg-neutral-lightest p-2 rounded-md">{user?.username || "사용자"}</div>
              </div>
              
              <div>
                <label className="text-sm font-medium text-neutral-dark">이메일</label>
                <div className="bg-neutral-lightest p-2 rounded-md">{user?.email || "이메일 정보 없음"}</div>
              </div>
              
              <div>
                <label className="text-sm font-medium text-neutral-dark">계정 유형</label>
                <div className="bg-neutral-lightest p-2 rounded-md">{user?.memberType || "일반 사용자"}</div>
              </div>
              
              <Button variant="secondary" size="sm" className="w-full">
                프로필 수정
              </Button>
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

// User 아이콘 컴포넌트
const User = ({ className }: { className?: string }) => {
  return (
    <svg 
      xmlns="http://www.w3.org/2000/svg" 
      viewBox="0 0 24 24" 
      fill="none" 
      stroke="currentColor" 
      strokeWidth="2" 
      strokeLinecap="round" 
      strokeLinejoin="round" 
      className={className}
    >
      <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"></path>
      <circle cx="12" cy="7" r="4"></circle>
    </svg>
  );
};