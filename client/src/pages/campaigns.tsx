import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { apiRequest } from "@/lib/queryClient";
import { Campaign } from "@shared/schema";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2 } from "lucide-react";

export default function CampaignsPage() {
  // 공개된 캠페인 목록 가져오기
  const { data: campaigns = [], isLoading } = useQuery<Campaign[]>({
    queryKey: ["/api/campaigns"],
    queryFn: async () => {
      const response = await apiRequest("/api/campaigns");
      return await response.json();
    }
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-8">캠페인 신청</h1>
      
      {campaigns.length === 0 ? (
        <div className="text-center py-16">
          <p className="text-muted-foreground">현재 진행 중인 캠페인이 없습니다.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {campaigns.map((campaign) => (
            <Card key={campaign.id} className="overflow-hidden flex flex-col h-full">
              {campaign.bannerImage ? (
                <div className="w-full h-48 overflow-hidden">
                  <img 
                    src={campaign.bannerImage} 
                    alt={campaign.title} 
                    className="w-full h-full object-cover"
                    loading="lazy"
                  />
                </div>
              ) : (
                <div className="w-full h-48 bg-muted flex items-center justify-center">
                  <span className="text-muted-foreground">이미지 없음</span>
                </div>
              )}
              
              <CardHeader className="pb-2">
                <CardTitle>{campaign.title}</CardTitle>
              </CardHeader>
              
              <CardContent className="flex-grow">
                <p className="text-sm text-muted-foreground line-clamp-3">
                  {campaign.description || "설명이 없습니다."}
                </p>
              </CardContent>
              
              <CardFooter>
                <Link 
                  to={`/campaign/${campaign.slug}`}
                  className="text-sm text-primary hover:underline inline-flex items-center"
                >
                  자세히 보기 
                  <svg 
                    xmlns="http://www.w3.org/2000/svg" 
                    className="h-4 w-4 ml-1" 
                    fill="none" 
                    viewBox="0 0 24 24" 
                    stroke="currentColor"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </Link>
              </CardFooter>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}