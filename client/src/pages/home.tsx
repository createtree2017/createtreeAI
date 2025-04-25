import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import FeatureCard from "@/components/FeatureCard";
import ActivityItem from "@/components/ActivityItem";
import { Music, PaintbrushVertical, MessageCircle, Images, Lightbulb } from "lucide-react";
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
      title: "Baby Melody",
      description: "Create music with your baby's name",
      icon: Music,
      bgColor: "bg-primary-light",
      textColor: "text-primary-dark",
      href: "/music",
    },
    {
      title: "Memory Art",
      description: "Transform photos into artworks",
      icon: PaintbrushVertical,
      bgColor: "bg-secondary-light",
      textColor: "text-secondary-dark",
      href: "/image",
    },
    {
      title: "Mom Companion",
      description: "Chat with your supportive AI friend",
      icon: MessageCircle,
      bgColor: "bg-accent1-light",
      textColor: "text-accent1-dark",
      href: "/chat",
    },
    {
      title: "My Gallery",
      description: "Your creations and memories",
      icon: Images,
      bgColor: "bg-accent2-light",
      textColor: "text-accent2-dark",
      href: "/gallery",
    },
  ];

  const handleActivityAction = (activity: RecentActivity) => {
    if (activity.type === "music") {
      window.location.href = `/music?id=${activity.id}`;
    } else {
      window.location.href = `/image?id=${activity.id}`;
    }
  };

  return (
    <div className="p-5 animate-fadeIn">
      <div className="text-center mb-8">
        <h2 className="font-heading font-bold text-2xl mb-2">Welcome, Mommy! 👋</h2>
        <p className="text-neutral-dark">What would you like to do today?</p>
      </div>
      
      {/* Features Grid */}
      <div className="grid grid-cols-2 gap-4">
        {features.map((feature, index) => (
          <FeatureCard key={index} {...feature} />
        ))}
      </div>
      
      {/* Recent Activity */}
      <div className="mt-8">
        <h2 className="font-heading font-semibold text-lg mb-4">Recent Activity</h2>
        {isLoading ? (
          <div className="space-y-3">
            <div className="bg-neutral-lightest h-16 rounded-lg animate-pulse"></div>
            <div className="bg-neutral-lightest h-16 rounded-lg animate-pulse"></div>
          </div>
        ) : recentActivities && recentActivities.length > 0 ? (
          <div className="space-y-3">
            {recentActivities.map((activity: RecentActivity) => (
              <ActivityItem
                key={activity.id}
                icon={activity.type === "music" ? Music : PaintbrushVertical}
                bgColor={activity.type === "music" ? "bg-primary-light" : "bg-secondary-light"}
                textColor={activity.type === "music" ? "text-primary-dark" : "text-secondary-dark"}
                title={activity.title}
                timestamp={activity.timestamp}
                type={activity.type}
                onAction={() => handleActivityAction(activity)}
              />
            ))}
          </div>
        ) : (
          <div className="text-center py-6 bg-neutral-lightest rounded-lg">
            <p className="text-neutral-dark">No recent activities yet</p>
            <p className="text-sm mt-1">Try creating a melody or transforming an image!</p>
          </div>
        )}
      </div>
      
      {/* Daily Tip */}
      <div className="mt-8 bg-accent1-light p-4 rounded-lg border border-accent1">
        <div className="flex items-start space-x-3">
          <div className="bg-white rounded-full p-2 text-accent1-dark">
            <Lightbulb className="h-5 w-5" />
          </div>
          <div>
            <h3 className="font-heading font-semibold">Daily Tip</h3>
            <p className="text-sm mt-1">{dailyTip}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
