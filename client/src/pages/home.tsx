import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import PolioCard from "@/components/PolioCard";
import FeaturedSlider from "@/components/FeaturedSlider";
import { 
  Music, 
  PaintbrushVertical, 
  MessageCircle, 
  Images, 
  Sparkles, 
  Award,
  Flame,
  Bot,
  BarChart,
  Zap,
  Palette
} from "lucide-react";

// 스타일 카드 타입 정의
interface StyleCard {
  id: number;
  title: string;
  styleId: string;
  imageSrc: string;
  href: string;
  isNew: boolean;
  isActive: boolean;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

interface RecentActivity {
  id: number;
  title: string;
  timestamp: string;
  type: "music" | "image";
}

interface Banner {
  id: number;
  title: string;
  description: string;
  imageSrc: string;
  href: string;
  isNew?: boolean;
  isActive: boolean;
  sortOrder: number;
}

export default function Home() {
  // 배너 데이터 가져오기
  const { data: banners, isLoading: bannersLoading } = useQuery({
    queryKey: ["/api/banners"],
    queryFn: async () => {
      const response = await fetch("/api/banners");
      if (!response.ok) {
        throw new Error("배너 데이터를 가져오는데 실패했습니다");
      }
      return response.json() as Promise<Banner[]>;
    }
  });
  
  // 임시 배너 데이터 (API가 준비되기 전까지 사용)
  const tempBanners = [
    {
      id: 1,
      title: "추억 예술 체험하기",
      description: "사진을 아름다운 예술 작품으로 변환하세요. 지브리, 디즈니, 픽사 등 다양한 스타일을 지원합니다.",
      imageSrc: "https://images.pexels.com/photos/235615/pexels-photo-235615.jpeg?auto=compress&cs=tinysrgb&w=600",
      href: "/image",
      isNew: true,
      isActive: true,
      sortOrder: 1
    },
    {
      id: 2,
      title: "자장가 생성기",
      description: "아기를 위한 맞춤형 음악을 AI로 만들어보세요. 아이의 이름을 넣어 특별한 자장가를 만들 수 있습니다.",
      imageSrc: "https://images.pexels.com/photos/3662850/pexels-photo-3662850.jpeg?auto=compress&cs=tinysrgb&w=600",
      href: "/music",
      isNew: true,
      isActive: true,
      sortOrder: 2
    }
  ];
  
  // 실제 배너 데이터 또는 임시 데이터 사용
  const displayBanners = banners?.length ? banners : tempBanners;
  
  // 스타일 카드 데이터 가져오기
  const { data: styleCardData = [], isLoading: styleCardsLoading } = useQuery<StyleCard[]>({
    queryKey: ["/api/style-cards"],
    queryFn: async () => {
      const response = await fetch("/api/style-cards");
      if (!response.ok) {
        throw new Error("스타일 카드 데이터를 가져오는데 실패했습니다");
      }
      return response.json() as Promise<StyleCard[]>;
    }
  });

  // AI 도구
  const aiTools = [
    {
      title: "추억 예술",
      icon: Palette,
      href: "/image",
      isNew: true,
    },
    {
      title: "자장가 제작",
      icon: Music,
      href: "/music",
      isNew: true,
    },
    {
      title: "AI 도우미",
      icon: MessageCircle,
      href: "/chat",
    },
    {
      title: "마일스톤",
      icon: Award,
      href: "/milestones",
    },
    {
      title: "내 갤러리",
      icon: Images,
      href: "/gallery",
    },
    {
      title: "진행 상황",
      icon: BarChart,
      href: "/progress",
    },
  ];

  // 캐릭터 도우미
  const characterHelpers = [
    {
      title: "산모 도우미",
      description: "임신과 출산에 대한 모든 질문을 물어보세요",
      imageSrc: "https://images.pexels.com/photos/7282589/pexels-photo-7282589.jpeg?auto=compress&cs=tinysrgb&w=600",
      href: "/chat?character=midwife",
      aspectRatio: "portrait" as const,
    },
    {
      title: "태교 전문가",
      description: "태교에 관한 질문에 답해드립니다",
      imageSrc: "https://images.pexels.com/photos/4473871/pexels-photo-4473871.jpeg?auto=compress&cs=tinysrgb&w=600",
      href: "/chat?character=prenatal",
      aspectRatio: "portrait" as const,
    },
    {
      title: "수면 코치",
      description: "아기 수면 패턴 개선을 도와드립니다",
      imageSrc: "https://images.pexels.com/photos/3933455/pexels-photo-3933455.jpeg?auto=compress&cs=tinysrgb&w=600",
      href: "/chat?character=sleep",
      aspectRatio: "portrait" as const,
    },
  ];

  // 인기 기능 및 참고 자료
  const trendingResources = [
    {
      title: "지브리 스타일",
      icon: Sparkles,
      imageSrc: "https://images.pexels.com/photos/757882/pexels-photo-757882.jpeg?auto=compress&cs=tinysrgb&w=600",
      href: "/image?style=ghibli",
    },
    {
      title: "자장가 모음",
      icon: Music,
      imageSrc: "https://images.pexels.com/photos/3662850/pexels-photo-3662850.jpeg?auto=compress&cs=tinysrgb&w=600",
      href: "/music?collection=lullabies",
    },
    {
      title: "마일스톤 챌린지",
      icon: Flame,
      imageSrc: "https://images.pexels.com/photos/4473768/pexels-photo-4473768.jpeg?auto=compress&cs=tinysrgb&w=600",
      href: "/milestones/challenge",
    },
    {
      title: "AI 콘텐츠 가이드",
      icon: Bot,
      imageSrc: "https://images.pexels.com/photos/1181271/pexels-photo-1181271.jpeg?auto=compress&cs=tinysrgb&w=600",
      href: "/guide/ai-content",
    },
  ];

  // 최근 활동 데이터 (임시) - API 연동 전 더미 데이터
  const recentActivities: any[] = [];
  const isLoading = false;

  return (
    <div className="pb-16 animate-fadeIn">
      {/* 배너 슬라이더 - PC에서는 최대 너비 제한 */}
      <section className="mb-6 px-2 md:px-4 pt-2">
        <div className="max-w-screen-xl mx-auto">
          <FeaturedSlider 
            items={displayBanners} 
          />
        </div>
      </section>
      
      {/* AI 스타일 그리드 - Pollo.ai 스타일 */}
      <section className="px-4 md:px-6 py-6 md:py-8">
        <div className="max-w-screen-xl mx-auto">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-white text-xl md:text-2xl font-medium">AI 이미지 스타일</h2>
          </div>
          
          <div className="grid grid-cols-2 gap-3 md:gap-4 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
            {styleCardData && styleCardData.length > 0 ? (
              // 데이터베이스에서 가져온 스타일 카드 렌더링
              styleCardData.map((card: StyleCard) => (
                <div
                  key={card.id}
                  className="relative rounded-2xl overflow-hidden bg-neutral-800 border border-neutral-700 hover:border-primary-lavender hover:shadow-lg transition-all duration-300"
                >
                  <Link href={card.href} className="block">
                    <div className="aspect-square relative overflow-hidden">
                      <img
                        src={card.imageSrc}
                        alt={card.title}
                        className="w-full h-full object-cover transition-transform duration-500 hover:scale-110"
                      />
                      {card.isNew && (
                        <div className="absolute top-3 right-3 px-3 py-1 bg-[#FF4D6D] text-white text-xs font-bold rounded-md">
                          신규
                        </div>
                      )}
                      <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent p-4 pt-16">
                        <h3 className="text-white font-bold text-xl">{card.title}</h3>
                      </div>
                    </div>
                  </Link>
                </div>
              ))
            ) : (
              // 데이터가 없을 경우 안내 메시지 표시
              <div className="col-span-full text-center py-8">
                <div className="flex flex-col items-center justify-center">
                  <ImagePlus className="h-12 w-12 text-muted-foreground mb-4" />
                  <h3 className="text-lg font-semibold mb-2">사용 가능한 이미지 스타일이 없습니다</h3>
                  <p className="text-muted-foreground max-w-md">
                    관리자 페이지에서 이미지 스타일을 추가해주세요. 관리자가 추가한 스타일만 이곳에 표시됩니다.
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </section>
      
      {/* 하단 여백 */}
      <div className="h-8"></div>
    </div>
  );
}
