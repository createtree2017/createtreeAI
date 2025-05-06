import React, { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { storage } from "@/lib/storage";

import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FileUpload } from "@/components/ui/file-upload";
import { Separator } from "@/components/ui/separator";
import { toast } from "@/hooks/use-toast";
import { useTheme } from "@/hooks/use-theme";

import { Image, ChevronLeft, Upload, Camera, ImageIcon, Loader2 } from "lucide-react";
import { t } from "@/lib/i18n";
import { cn } from "@/lib/utils";

// 이미지 템플릿 타입 정의
interface ImageTemplate {
  id: number;
  title: string;
  description: string | null;
  templateImageUrl: string;
  templateType: string;
  promptTemplate: string;
  thumbnailUrl: string | null;
  maskArea: any | null;
  isActive: boolean;
  isFeatured: boolean;
  createdAt: string;
  updatedAt: string;
}

// 템플릿 타입 옵션
const templateTypeOptions = [
  { label: "배경 교체", value: "background" },
  { label: "프레임 적용", value: "frame" },
  { label: "오버레이 추가", value: "overlay" },
  { label: "이미지 혼합", value: "blend" },
  { label: "얼굴 스타일 변환", value: "face" },
];

export default function CompositeImagePage() {
  const [location, setLocation] = useLocation();
  const { theme } = useTheme();
  
  // 상태 관리
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>("");
  const [generatingImage, setGeneratingImage] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [customPrompt, setCustomPrompt] = useState<string>("");
  const [templateType, setTemplateType] = useState<string>("blend");
  
  // 템플릿 목록 가져오기
  const { data: templates, isLoading: loadingTemplates } = useQuery({
    queryKey: ["/api/admin/image-templates"],
    queryFn: async () => {
      const response = await fetch("/api/admin/image-templates");
      if (!response.ok) {
        throw new Error("Failed to fetch templates");
      }
      return response.json();
    }
  });
  
  // 선택된 템플릿 정보
  const selectedTemplate = templates?.find((t: ImageTemplate) => 
    t.id.toString() === selectedTemplateId
  );
  
  // 파일 선택 핸들러
  const handleFileSelected = (file: File) => {
    setSelectedFile(file);
    // 파일 선택 시 결과 초기화
    setResult(null);
  };
  
  // 이미지 합성 요청 처리
  const handleCompositeImage = async () => {
    if (!selectedFile) {
      toast({
        title: "파일을 선택해주세요",
        variant: "destructive",
      });
      return;
    }
    
    if (!selectedTemplateId) {
      toast({
        title: "템플릿을 선택해주세요",
        variant: "destructive",
      });
      return;
    }
    
    try {
      setGeneratingImage(true);
      
      const formData = new FormData();
      formData.append("userImage", selectedFile);
      formData.append("templateId", selectedTemplateId);
      formData.append("templateType", templateType);
      
      if (customPrompt) {
        formData.append("prompt", customPrompt);
      }
      
      if (selectedTemplate?.maskArea) {
        formData.append("maskArea", typeof selectedTemplate.maskArea === 'string' 
          ? selectedTemplate.maskArea 
          : JSON.stringify(selectedTemplate.maskArea)
        );
      }
      
      const response = await fetch("/api/composite-image", {
        method: "POST",
        body: formData,
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "이미지 합성에 실패했습니다.");
      }
      
      const data = await response.json();
      setResult(data);
      
      toast({
        title: "이미지 합성 완료",
        description: "이미지가 성공적으로 합성되었습니다.",
      });
      
      // 세션 스토리지에도 결과 저장 (새로고침 대비)
      storage.set("lastCompositeResult", data);
      
    } catch (error) {
      console.error("이미지 합성 중 오류 발생:", error);
      toast({
        title: "이미지 합성 실패",
        description: error instanceof Error ? error.message : "알 수 없는 오류가 발생했습니다.",
        variant: "destructive",
      });
    } finally {
      setGeneratingImage(false);
    }
  };
  
  // 파일 다운로드 처리
  const handleDownload = () => {
    if (!result) return;
    
    const link = document.createElement('a');
    link.href = result.transformedUrl;
    link.download = `composite_${new Date().getTime()}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    toast({
      title: "다운로드 시작",
      description: "이미지 다운로드가 시작되었습니다.",
    });
  };
  
  // 세션 스토리지에서 이전 결과 복원 (새로고침 대응)
  useEffect(() => {
    const storedResult = storage.get("lastCompositeResult");
    if (storedResult) {
      setResult(storedResult);
    }
  }, []);
  
  return (
    <div className="container mx-auto p-4 max-w-4xl">
      <div className="flex items-center mb-6">
        <Button 
          variant="outline" 
          className="mr-2" 
          onClick={() => setLocation("/")}
        >
          <ChevronLeft className="h-4 w-4 mr-1" />
          {t("back")}
        </Button>
        <h1 className="text-2xl font-bold">{t("imageComposite")}</h1>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* 왼쪽 패널: 이미지 업로드 및 템플릿 선택 */}
        <div className="md:col-span-1">
          <Card>
            <CardHeader>
              <CardTitle>{t("uploadImage")}</CardTitle>
              <CardDescription>{t("uploadImageDescription")}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <FileUpload
                accept="image/*"
                maxSize={10 * 1024 * 1024} // 10MB
                onFileSelected={handleFileSelected}
              />
              
              <div className="mt-4">
                <Label htmlFor="template-select">{t("selectTemplate")}</Label>
                <Select
                  value={selectedTemplateId}
                  onValueChange={setSelectedTemplateId}
                >
                  <SelectTrigger id="template-select">
                    <SelectValue placeholder={t("selectTemplatePlaceholder")} />
                  </SelectTrigger>
                  <SelectContent>
                    {loadingTemplates ? (
                      <div className="flex items-center justify-center p-4">
                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                        {t("loading")}...
                      </div>
                    ) : (
                      templates?.filter((t: ImageTemplate) => t.isActive).map((template: ImageTemplate) => (
                        <SelectItem key={template.id} value={template.id.toString()}>
                          {template.title}
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
              </div>
              
              {selectedTemplate && (
                <div className="mt-4">
                  <h3 className="font-medium mb-2">{t("selectedTemplate")}: {selectedTemplate.title}</h3>
                  {selectedTemplate.thumbnailUrl && (
                    <div className="aspect-w-16 aspect-h-9 mb-2 overflow-hidden rounded-md">
                      <img 
                        src={selectedTemplate.thumbnailUrl} 
                        alt={selectedTemplate.title}
                        className="object-cover w-full h-auto"
                      />
                    </div>
                  )}
                  <p className="text-sm text-muted-foreground">{selectedTemplate.description}</p>
                </div>
              )}
              
              <div className="mt-4">
                <Label htmlFor="template-type">{t("compositeType")}</Label>
                <Select
                  value={templateType}
                  onValueChange={setTemplateType}
                >
                  <SelectTrigger id="template-type">
                    <SelectValue placeholder={t("selectCompositeType")} />
                  </SelectTrigger>
                  <SelectContent>
                    {templateTypeOptions.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div className="mt-4">
                <Label htmlFor="custom-prompt">{t("customPrompt")}</Label>
                <Textarea
                  id="custom-prompt"
                  placeholder={t("customPromptPlaceholder")}
                  value={customPrompt}
                  onChange={(e) => setCustomPrompt(e.target.value)}
                  className="h-24"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  {t("customPromptDescription")}
                </p>
              </div>
            </CardContent>
            <CardFooter>
              <Button
                className="w-full"
                onClick={handleCompositeImage}
                disabled={!selectedFile || !selectedTemplateId || generatingImage}
              >
                {generatingImage ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    {t("generating")}...
                  </>
                ) : (
                  <>
                    <ImageIcon className="mr-2 h-4 w-4" />
                    {t("compositeImage")}
                  </>
                )}
              </Button>
            </CardFooter>
          </Card>
        </div>
        
        {/* 오른쪽 패널: 결과 및 미리보기 */}
        <div className="md:col-span-2">
          <Card className="h-full">
            <CardHeader>
              <CardTitle>{t("result")}</CardTitle>
              <CardDescription>{t("resultDescription")}</CardDescription>
            </CardHeader>
            <CardContent className="flex items-center justify-center">
              {generatingImage ? (
                <div className="text-center py-12">
                  <Loader2 className="mx-auto h-12 w-12 animate-spin text-primary" />
                  <p className="mt-4">{t("generatingImage")}...</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    {t("generatingImageDescription")}
                  </p>
                </div>
              ) : result ? (
                <div className="text-center w-full">
                  <div className="rounded-lg overflow-hidden border shadow-md">
                    <img
                      src={result.transformedUrl}
                      alt="Composite result"
                      className="max-w-full h-auto"
                    />
                  </div>
                </div>
              ) : (
                <div className="text-center py-12">
                  <div className={cn(
                    "mx-auto rounded-full p-3 mb-4",
                    theme === "dark" ? "bg-slate-800" : "bg-slate-200"
                  )}>
                    <Image className="h-10 w-10 opacity-50" />
                  </div>
                  <p>{t("noResultYet")}</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    {t("noResultYetDescription")}
                  </p>
                </div>
              )}
            </CardContent>
            {result && (
              <CardFooter className="flex justify-center gap-2">
                <Button onClick={handleDownload} variant="secondary">
                  <Download className="mr-2 h-4 w-4" />
                  {t("download")}
                </Button>
              </CardFooter>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}