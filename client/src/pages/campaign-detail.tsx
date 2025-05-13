import { useQuery, useMutation } from "@tanstack/react-query";
import { useRoute } from "wouter";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Campaign, InsertCampaignApplication } from "@shared/schema";
import { Loader2, ArrowLeft, User, Phone, MessageSquare } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { useState, useEffect } from "react";
import React from "react";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";

// 신청 폼 스키마 정의
const applicationFormSchema = z.object({
  name: z.string().min(2, "이름은 2자 이상 입력해주세요."),
  contact: z.string().min(5, "연락처는 5자 이상 입력해주세요."),
  memo: z.string().optional(),
  campaignId: z.number()
});

type ApplicationFormValues = z.infer<typeof applicationFormSchema>;

export default function CampaignDetailPage() {
  // 모달 상태 관리
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const { toast } = useToast();
  
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
  
  // 폼 설정
  const form = useForm<ApplicationFormValues>({
    resolver: zodResolver(applicationFormSchema),
    defaultValues: {
      name: "",
      contact: "",
      memo: "",
      campaignId: campaign?.id || 0
    }
  });
  
  // 캠페인 ID가 로드되면 기본값 업데이트
  React.useEffect(() => {
    if (campaign) {
      form.setValue("campaignId", campaign.id);
    }
  }, [campaign, form]);
  
  // 캠페인 신청 mutation
  const applicationMutation = useMutation({
    mutationFn: async (data: ApplicationFormValues) => {
      const response = await apiRequest("POST", "/api/campaign-applications", data);
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "신청 처리 중 오류가 발생했습니다.");
      }
      return await response.json();
    },
    onSuccess: () => {
      setIsDialogOpen(false);
      form.reset();
      toast({
        title: "신청 완료",
        description: "캠페인 신청이 성공적으로 접수되었습니다.",
        variant: "default",
      });
    },
    onError: (error: Error) => {
      // 이미 신청한 경우 (409 Conflict)
      if (error.message.includes("이미 신청한 캠페인")) {
        toast({
          title: "신청 중복",
          description: "이미 신청한 캠페인입니다.",
          variant: "destructive",
        });
        setIsDialogOpen(false);
      } else {
        toast({
          title: "신청 실패",
          description: error.message,
          variant: "destructive",
        });
      }
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