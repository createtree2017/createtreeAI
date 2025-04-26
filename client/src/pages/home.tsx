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
      title: "Memory Art",
      description: "Transform photos into beautiful artworks",
      icon: PaintbrushVertical,
      bgColor: "bg-gradient-to-br from-[#ff9fb5] to-[#ff8aa3]", // Soft pink gradient
      textColor: "text-white",
      href: "/image",
      highlight: true,  // Special property to mark this as the highlighted card
    },
    {
      title: "Lullaby Creator",
      description: "Create personalized music for your baby",
      icon: Music,
      bgColor: "bg-primary-mint",
      textColor: "text-neutral-darkest",
      href: "/music",
    },
    {
      title: "AI Companion",
      description: "Chat with your supportive mom advisor",
      icon: MessageCircle,
      bgColor: "bg-primary-lavender",
      textColor: "text-neutral-darkest",
      href: "/chat",
    },
    {
      title: "My Gallery",
      description: "View all your creations and memories",
      icon: Images,
      bgColor: "bg-primary-beige",
      textColor: "text-neutral-darkest",
      href: "/gallery",
    },
  ];

  const programs = [
    {
      title: "Magical Memories",
      description: "Create special moments with your little one",
      icon: Baby,
      bgColor: "bg-primary-lavender",
      textColor: "text-neutral-darkest",
      href: "/programs/memories",
    },
    {
      title: "Prenatal Care",
      description: "Essential guidance for expectant mothers",
      icon: Sparkles,
      bgColor: "bg-gradient-to-br from-[#FFD1B3] to-[#FFBF99]", // Peach gradient based on style guide
      textColor: "text-neutral-darkest",
      href: "/programs/prenatal",
      highlight: true, // Add highlight to make it stand out
    },
    {
      title: "Mom Stories",
      description: "Inspiring stories from other mothers",
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
        title="Create Magical Moments"
        subtitle="Transform your photos and create personalized lullabies for your little one"
        ctaText="Create Now"
        ctaLink="/image"
        imageSrc={heroImageUrl}
      />
      
      <div className="px-4">
        {/* AI Tools Section */}
        <section className="mb-8 bg-gradient-to-r from-primary-lavender/30 to-primary-mint/30 p-5 rounded-xl shadow-soft">
          <div className="flex items-center justify-between mb-5">
            <h2 className="font-semibold text-2xl text-neutral-darkest font-heading">AI Tools</h2>
            <a href="/all-tools" className="text-sm font-medium bg-primary-lavender text-white px-4 py-2 rounded-full shadow-button hover:opacity-90 transition-all">
              View All
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
            <h2 className="font-semibold text-2xl text-neutral-darkest font-heading">Programs</h2>
            <a href="/programs" className="text-sm font-medium bg-gradient-to-r from-[#FFD1B3] to-[#FFBF99] text-neutral-darkest px-4 py-2 rounded-full shadow-button hover:opacity-90 transition-all">
              View All
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
          <h2 className="font-semibold text-2xl text-neutral-darkest mb-5 font-heading">Recent Activity</h2>
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
              <p className="text-neutral-dark">No recent activities yet</p>
              <p className="text-sm mt-1">Try creating a lullaby or transforming a photo!</p>
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
                <h3 className="font-semibold text-xl mb-2 font-heading">Daily Tip</h3>
                <p className="text-neutral-dark font-body">{dailyTip}</p>
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
