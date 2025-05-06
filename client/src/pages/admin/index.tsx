import { useState } from "react";
import { Link, useLocation } from "wouter";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import PersonaManagement from "@/components/admin/PersonaManagement";
import ConceptManagement from "@/components/admin/ConceptManagement";
import BannerManagement from "@/components/admin/BannerManagement";
import StyleCardManagement from "@/components/admin/StyleCardManagement";
import ABTestManagement from "@/components/admin/ABTestManagement";
import ImageTemplateManagement from "@/components/admin/ImageTemplateManagement";

export default function AdminPage() {
  const [, setLocation] = useLocation();
  
  return (
    <div className="container py-8 animate-fadeIn">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-2xl font-bold text-white">관리자 도구</h1>
          <p className="text-muted-foreground">시스템 설정 및 콘텐츠 관리</p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setLocation("/")}
          className="text-primary-foreground"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          홈으로 돌아가기
        </Button>
      </div>

      <Tabs defaultValue="banners" className="w-full">
        <TabsList className="w-full border-b rounded-none justify-start mb-6 bg-background">
          <TabsTrigger value="personas">AI 캐릭터</TabsTrigger>
          <TabsTrigger value="concepts">스타일 컨셉</TabsTrigger>
          <TabsTrigger value="style-cards">스타일 카드</TabsTrigger>
          <TabsTrigger value="banners">배너 관리</TabsTrigger>
          <TabsTrigger value="image-templates">이미지 템플릿</TabsTrigger>
          <TabsTrigger value="ab-tests">A/B 테스트</TabsTrigger>
        </TabsList>
        
        <TabsContent value="personas">
          <PersonaManagement />
        </TabsContent>
        
        <TabsContent value="concepts">
          <ConceptManagement />
        </TabsContent>
        
        <TabsContent value="style-cards">
          <StyleCardManagement />
        </TabsContent>
        
        <TabsContent value="banners">
          <BannerManagement />
        </TabsContent>
        
        <TabsContent value="image-templates">
          <ImageTemplateManagement />
        </TabsContent>
        
        <TabsContent value="ab-tests">
          <ABTestManagement />
        </TabsContent>
      </Tabs>
    </div>
  );
}