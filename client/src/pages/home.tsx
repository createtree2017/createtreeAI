import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import FeatureCard from "@/components/FeatureCard";
import ActivityItem from "@/components/ActivityItem";
import HeroSection from "@/components/HeroSection";
import { 
  Music, 
  PaintbrushVertical, 
  MessageCircle, 
  Images, 
  Lightbulb, 
  Sparkles, 
  Baby,
  BookOpen
} from "lucide-react";
import { getGalleryItems } from "@/lib/api";

interface RecentActivity {
  id: number;
  title: string;
  timestamp: string;
  type: "music" | "image";
}

export default function Home() {
  const { toast } = useToast();
  const [dailyTip, setDailyTip] = useState<string>(
    "Singing to your baby can help develop their language skills from a very early age."
  );

  // Fetch recent activities
  const { data: recentActivities, isLoading } = useQuery({
    queryKey: ["/api/gallery", "recent"],
    queryFn: () => getGalleryItems("recent"),
  });

  const features = [
    {
      title: "추억 예술",
      description: "사진을 아름다운 예술 작품으로 변환하세요",
      icon: PaintbrushVertical,
      bgColor: "bg-gradient-to-br from-[#ff9fb5] to-[#ff8aa3]", // Soft pink gradient
      textColor: "text-white",
      href: "/image",
      highlight: true,  // Special property to mark this as the highlighted card
    },
    {
      title: "자장가 제작",
      description: "아기를 위한 맞춤형 음악을 만들어보세요",
      icon: Music,
      bgColor: "bg-primary-mint",
      textColor: "text-neutral-darkest",
      href: "/music",
    },
    {
      title: "AI 도우미",
      description: "엄마 상담사와 대화하세요",
      icon: MessageCircle,
      bgColor: "bg-primary-lavender",
      textColor: "text-neutral-darkest",
      href: "/chat",
    },
    {
      title: "내 갤러리",
      description: "모든 창작물과 추억을 확인하세요",
      icon: Images,
      bgColor: "bg-primary-beige",
      textColor: "text-neutral-darkest",
      href: "/gallery",
    },
  ];

  const programs = [
    {
      title: "마법 같은 추억",
      description: "아이와 함께 특별한 순간을 만들어보세요",
      icon: Baby,
      bgColor: "bg-primary-lavender",
      textColor: "text-neutral-darkest",
      href: "/programs/memories",
    },
    {
      title: "산전 관리",
      description: "예비 엄마를 위한 필수 가이드",
      icon: Sparkles,
      bgColor: "bg-gradient-to-br from-[#FFD1B3] to-[#FFBF99]", // Peach gradient based on style guide
      textColor: "text-neutral-darkest",
      href: "/programs/prenatal",
      highlight: true, // Add highlight to make it stand out
    },
    {
      title: "엄마 이야기",
      description: "다른 엄마들의 영감을 주는 이야기",
      icon: BookOpen,
      bgColor: "bg-primary-mint",
      textColor: "text-neutral-darkest",
      href: "/programs/stories",
    },
  ];

  const handleActivityAction = (activity: RecentActivity) => {
    if (activity.type === "music") {
      window.location.href = `/music?id=${activity.id}`;
    } else {
      window.location.href = `/image?id=${activity.id}`;
    }
  };

  // Hero section image should be a real, emotional mother and baby image
  // Here we're using a placeholder URL - this should be replaced with an actual image URL
  const heroImageUrl = "https://images.pexels.com/photos/3662833/pexels-photo-3662833.jpeg";

  return (
    <div className="pb-6 animate-fadeIn">
      {/* Hero Section */}
      <HeroSection
        title="마법 같은 순간을 만들어보세요"
        subtitle="사진을 변환하고 아이를 위한 맞춤형 자장가를 만들어보세요"
        ctaText="지금 시작하기"
        ctaLink="/image"
        imageSrc={heroImageUrl}
      />
      
      <div className="px-4">
        {/* AI Tools Section */}
        <section className="mb-8 bg-gradient-to-r from-primary-lavender/30 to-primary-mint/30 p-5 rounded-xl shadow-soft">
          <div className="flex items-center justify-between mb-5">
            <h2 className="font-semibold text-2xl text-neutral-darkest font-heading">AI 도구</h2>
            <a href="/all-tools" className="text-sm font-medium bg-primary-lavender text-white px-4 py-2 rounded-full shadow-button hover:opacity-90 transition-all">
              모두 보기
            </a>
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            {/* First card with special styling to make it stand out */}
            <div className="transform hover:scale-[1.03] transition-all duration-300 shadow-lg relative z-10 ring-4 ring-[#e9779d]/30 rounded-xl">
              <FeatureCard {...features[0]} />
            </div>
            
            {/* Remaining cards */}
            {features.slice(1).map((feature, index) => (
              <FeatureCard key={index} {...feature} />
            ))}
          </div>
        </section>
        
        {/* Programs Section */}
        <section className="mb-8 bg-gradient-to-r from-primary-peach/30 to-primary-beige/50 p-5 rounded-xl shadow-soft">
          <div className="flex items-center justify-between mb-5">
            <h2 className="font-semibold text-2xl text-neutral-darkest font-heading">프로그램</h2>
            <a href="/programs" className="text-sm font-medium bg-gradient-to-r from-[#FFD1B3] to-[#FFBF99] text-neutral-darkest px-4 py-2 rounded-full shadow-button hover:opacity-90 transition-all">
              모두 보기
            </a>
          </div>
          
          <div className="space-y-5">
            {programs.map((program, index) => (
              <div key={index} className={`${program.highlight ? 'shadow-lg transform hover:scale-[1.01] transition-all duration-300 rounded-xl ring-4 ring-[#ff9480]/30' : 'hover:scale-[1.01] transition-all duration-300'}`}>
                <FeatureCard {...program} />
              </div>
            ))}
          </div>
        </section>
        
        {/* Recent Activity */}
        <section className="mb-8 bg-white p-5 rounded-xl shadow-soft border border-neutral-light">
          <h2 className="font-semibold text-2xl text-neutral-darkest mb-5 font-heading">최근 활동</h2>
          {isLoading ? (
            <div className="space-y-3" data-testid="loading-skeleton">
              <div key="loading-skeleton-1" className="bg-neutral-light h-16 rounded-lg animate-pulse"></div>
              <div key="loading-skeleton-2" className="bg-neutral-light h-16 rounded-lg animate-pulse"></div>
            </div>
          ) : recentActivities && recentActivities.length > 0 ? (
            <div className="space-y-3">
              {recentActivities.map((activity: RecentActivity) => (
                <ActivityItem
                  key={activity.id}
                  icon={activity.type === "music" ? Music : PaintbrushVertical}
                  bgColor={activity.type === "music" ? "bg-primary-lavender" : "bg-primary-mint"}
                  textColor="text-neutral-darkest"
                  title={activity.title}
                  timestamp={activity.timestamp}
                  type={activity.type}
                  onAction={() => handleActivityAction(activity)}
                />
              ))}
            </div>
          ) : (
            <div className="text-center py-6 bg-neutral-light rounded-lg">
              <p className="text-neutral-dark">아직 최근 활동이 없습니다</p>
              <p className="text-sm mt-1">자장가를 만들거나 사진을 변환해보세요!</p>
            </div>
          )}
        </section>
        
        {/* Daily Tip */}
        <section>
          <div className="bg-gradient-to-r from-primary-mint/40 to-primary-mint/20 p-5 rounded-xl border border-primary-mint/30 shadow-card">
            <div className="flex items-start">
              <div className="bg-primary-mint text-white rounded-full p-3 mr-4 shadow-soft">
                <Lightbulb className="h-6 w-6" />
              </div>
              <div>
                <h3 className="font-semibold text-xl mb-2 font-heading">오늘의 팁</h3>
                <p className="text-neutral-dark font-body">아기에게 노래를 불러주면 매우 어린 나이부터 언어 능력 발달에 도움이 됩니다.</p>
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
