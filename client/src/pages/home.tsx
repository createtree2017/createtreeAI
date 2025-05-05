import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import PolioCard from "@/components/PolioCard";
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
import { getGalleryItems } from "@/lib/api";

interface RecentActivity {
  id: number;
  title: string;
  timestamp: string;
  type: "music" | "image";
}

export default function Home() {
  // 피처링 기능
  const featuredTools = [
    {
      title: "추억 예술",
      description: "사진을 아름다운 예술 스타일로 변환하세요",
      icon: PaintbrushVertical,
      imageSrc: "https://images.pexels.com/photos/235615/pexels-photo-235615.jpeg?auto=compress&cs=tinysrgb&w=600",
      href: "/image",
      isNew: true,
      aspectRatio: "landscape" as const,
    },
    {
      title: "자장가 제작",
      description: "아기를 위한 맞춤형 음악을 만들어보세요",
      icon: Music,
      href: "/music",
      isNew: true,
    },
  ];

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

  // 최근 활동 가져오기
  const { data: recentActivities, isLoading } = useQuery({
    queryKey: ["/api/gallery", "recent"],
    queryFn: () => getGalleryItems("recent"),
  });

  return (
    <div className="pb-16 animate-fadeIn">
      {/* 헤더 */}
      <div className="mb-6 px-6 pt-6">
        <h1 className="text-white text-2xl font-semibold mb-1">Mom's Service</h1>
        <p className="text-neutral-400 text-sm">
          AI로 만드는 특별한 순간, 소중한 기억을 남겨보세요
        </p>
      </div>
      
      {/* 피처링 기능 */}
      <section className="mb-8 px-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-white text-lg font-medium">추천 기능</h2>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {featuredTools.map((item, i) => (
            <PolioCard
              key={i}
              title={item.title}
              description={item.description}
              icon={item.icon}
              imageSrc={item.imageSrc}
              href={item.href}
              isNew={item.isNew}
              aspectRatio={item.aspectRatio}
            />
          ))}
        </div>
      </section>
      
      {/* AI 도구 그리드 */}
      <section className="mb-8 px-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-white text-lg font-medium">AI 도구</h2>
        </div>
        
        <div className="grid grid-cols-3 gap-3">
          {aiTools.map((item, i) => (
            <PolioCard
              key={i}
              title={item.title}
              icon={item.icon}
              href={item.href}
              isNew={item.isNew}
            />
          ))}
        </div>
      </section>
      
      {/* 캐릭터 도우미 */}
      <section className="mb-8 px-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-white text-lg font-medium">AI 도우미 캐릭터</h2>
        </div>
        
        <div className="grid grid-cols-3 gap-3">
          {characterHelpers.map((item, i) => (
            <PolioCard
              key={i}
              title={item.title}
              description={item.description}
              imageSrc={item.imageSrc}
              href={item.href}
              aspectRatio={item.aspectRatio}
            />
          ))}
        </div>
      </section>
      
      {/* 인기 컨텐츠 */}
      <section className="px-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-white text-lg font-medium">인기 스타일</h2>
        </div>
        
        <div className="grid grid-cols-2 gap-3">
          {trendingResources.map((item, i) => (
            <PolioCard
              key={i}
              title={item.title}
              icon={item.icon}
              imageSrc={item.imageSrc}
              href={item.href}
            />
          ))}
        </div>
      </section>
      
      {/* 하단 여백 */}
      <div className="h-8"></div>
    </div>
  );
}
