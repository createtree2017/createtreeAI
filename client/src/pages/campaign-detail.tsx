import { useQuery } from "@tanstack/react-query";
import { useRoute } from "wouter";
import { apiRequest } from "@/lib/queryClient";
import { Campaign } from "@shared/schema";
import { Loader2, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";

export default function CampaignDetailPage() {
  // URL에서 슬러그 가져오기
  const [match, params] = useRoute<{ slug: string }>("/campaign/:slug");
  
  if (!match) {
    return <div>캠페인을 찾을 수 없습니다.</div>;
  }

  const { slug } = params;

  // 캠페인 상세 정보 가져오기
  const { data: campaign, isLoading, error } = useQuery<Campaign>({
    queryKey: ["/api/campaigns", slug],
    queryFn: async () => {
      const response = await apiRequest(`/api/campaigns/${slug}`);
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

  if (error || !campaign) {
    return (
      <div className="container mx-auto px-4 py-16 text-center">
        <h1 className="text-2xl font-bold mb-4">오류가 발생했습니다</h1>
        <p className="text-muted-foreground mb-8">
          요청하신 캠페인을 찾을 수 없거나 오류가 발생했습니다.
        </p>
        <Link to="/campaign-1">
          <Button>캠페인 목록으로 돌아가기</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-6">
        <Link to="/campaigns" className="inline-flex items-center text-primary hover:underline">
          <ArrowLeft className="h-4 w-4 mr-1" />
          캠페인 목록으로 돌아가기
        </Link>
      </div>
      
      <article className="max-w-4xl mx-auto">
        <h1 className="text-3xl md:text-4xl font-bold mb-6">{campaign.title}</h1>
        
        {campaign.bannerImage && (
          <div className="rounded-lg overflow-hidden mb-8">
            <img 
              src={campaign.bannerImage} 
              alt={campaign.title}
              className="w-full h-auto object-cover"
            />
          </div>
        )}
        
        <div className="prose prose-lg max-w-none">
          {campaign.description ? (
            <p>{campaign.description}</p>
          ) : (
            <p className="text-muted-foreground">캠페인에 대한 자세한 설명이 없습니다.</p>
          )}
        </div>
        
        <div className="mt-12">
          <Button size="lg">캠페인 신청하기</Button>
        </div>
      </article>
    </div>
  );
}