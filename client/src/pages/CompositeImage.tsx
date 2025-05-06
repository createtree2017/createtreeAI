import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { FileUpload } from "@/components/ui/file-upload";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Layers, ArrowLeft, Plus, Check, Eye, Download, Share2 } from "lucide-react";
import { storage } from "@/lib/storage";
import { useLocation } from "wouter";

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

export default function CompositeImagePage() {
  const [location, setLocation] = useLocation();
  const { toast } = useToast();
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [selectedTemplateId, setSelectedTemplateId] = useState<number | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [compositedImage, setCompositedImage] = useState<any | null>(null);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<string>("frame");

  // Fetch image templates
  const { data: templates, isLoading: templatesLoading } = useQuery<ImageTemplate[]>({
    queryKey: ["/api/image-templates"]
  });

  const selectedTemplate = templates?.find((t: ImageTemplate) => 
    t.id === selectedTemplateId
  );

  const filteredTemplates = templates?.filter((t: ImageTemplate) => 
    t.isActive && t.templateType === activeTab
  );

  const handleFileSelected = (file: File) => {
    setSelectedFile(file);
    
    // Create a preview URL for the selected image
    const fileReader = new FileReader();
    fileReader.onload = (e) => {
      setPreviewUrl(e.target?.result as string);
    };
    fileReader.readAsDataURL(file);
  };

  const handleTemplateSelected = (templateId: number) => {
    setSelectedTemplateId(templateId);
  };

  const handleCompositeImage = async () => {
    if (!selectedFile || !selectedTemplateId) {
      toast({
        title: "정보 누락",
        description: selectedFile ? "템플릿을 선택해주세요" : "이미지를 업로드해주세요",
        variant: "destructive",
      });
      return;
    }

    setIsProcessing(true);
    
    try {
      const formData = new FormData();
      formData.append("image", selectedFile);
      formData.append("templateId", selectedTemplateId.toString());

      const response = await fetch("/api/image/composite", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        throw new Error("이미지 합성에 실패했습니다.");
      }

      const data = await response.json();
      setCompositedImage(data);
      
      // Save successful result to storage for sharing
      storage.set("lastCompositedImage", data, true);

      toast({
        title: "이미지 합성 완료",
        description: "이미지가 성공적으로 합성되었습니다.",
      });
    } catch (error) {
      console.error("이미지 합성 오류:", error);
      toast({
        title: "이미지 합성 실패",
        description: error instanceof Error ? error.message : "알 수 없는 오류가 발생했습니다.",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDownload = async () => {
    if (!compositedImage) return;
    
    try {
      const response = await fetch('/api/media/download/' + compositedImage.id + '/image');
      if (!response.ok) throw new Error('다운로드 실패');
      
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = compositedImage.title || '합성된_이미지.jpg';
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      
      toast({
        title: "다운로드 시작",
        description: "이미지 다운로드가 시작되었습니다."
      });
    } catch (error) {
      toast({
        title: "다운로드 실패",
        description: "다시 시도해주세요.",
        variant: "destructive"
      });
    }
  };

  const handleShare = async () => {
    if (!compositedImage) return;
    
    try {
      const response = await fetch(`/api/media/share/${compositedImage.id}/image`);
      const data = await response.json();
      
      if (data.shareUrl) {
        // Try to use clipboard API
        if (navigator.clipboard) {
          await navigator.clipboard.writeText(data.shareUrl);
          toast({
            title: "공유 링크 복사됨",
            description: "링크가 클립보드에 복사되었습니다."
          });
        } else {
          // Fallback for browsers without clipboard API access
          toast({
            title: "공유 링크 생성됨",
            description: `링크: ${data.shareUrl}`
          });
        }
      } else {
        toast({
          title: "공유 링크 생성 실패",
          description: "다시 시도해주세요.",
          variant: "destructive"
        });
      }
    } catch (error) {
      toast({
        title: "공유 실패",
        description: "다시 시도해주세요.",
        variant: "destructive"
      });
    }
  };

  const resetProcess = () => {
    setSelectedFile(null);
    setPreviewUrl(null);
    setCompositedImage(null);
    setSelectedTemplateId(null);
  };

  return (
    <div className="p-5 animate-fadeIn">
      <div className="flex items-center mb-6">
        <Button
          variant="ghost"
          size="icon"
          className="mr-2"
          onClick={() => setLocation('/image')}
        >
          <ArrowLeft size={20} />
        </Button>
        <div>
          <h2 className="font-heading font-bold text-2xl">이미지 합성</h2>
          <p className="text-neutral-dark">이미지를 다양한 템플릿과 합성하여 새로운 이미지를 만들어보세요</p>
        </div>
      </div>

      {compositedImage ? (
        // 합성된 이미지 결과 화면
        <div className="bg-[#1c1c24] rounded-xl p-5 animate-fadeIn">
          <div className="text-center mb-6">
            <h3 className="font-heading font-semibold text-white text-lg">합성 결과</h3>
            <p className="text-gray-400 text-sm">이미지가 성공적으로 합성되었습니다</p>
          </div>
          
          <div className="flex justify-center mb-6">
            <div className="relative max-w-md">
              <img 
                src={compositedImage.transformedUrl} 
                alt="합성된 이미지" 
                className="rounded-lg shadow-lg border border-gray-700 max-w-full h-auto"
              />
            </div>
          </div>
          
          <div className="flex justify-center gap-3 mb-2">
            <Button
              variant="outline"
              className="flex items-center gap-2"
              onClick={handleDownload}
            >
              <Download size={16} />
              다운로드
            </Button>
            <Button
              variant="outline"
              className="flex items-center gap-2"
              onClick={handleShare}
            >
              <Share2 size={16} />
              공유
            </Button>
          </div>
          
          <div className="flex justify-center mt-4">
            <Button 
              className="bg-[#ff2d55] hover:bg-[#ff2d55]/90 text-white"
              onClick={resetProcess}
            >
              다른 이미지 합성하기
            </Button>
          </div>
        </div>
      ) : (
        // 이미지 합성 준비 화면
        <>
          {/* 템플릿 선택 섹션 */}
          <div className="bg-[#1c1c24] rounded-xl p-5 mb-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-heading font-semibold text-white text-lg">템플릿 선택</h3>
            </div>
            
            <Tabs defaultValue="frame" className="w-full" onValueChange={setActiveTab}>
              <TabsList className="w-full mb-4">
                <TabsTrigger value="frame" className="flex-1">프레임</TabsTrigger>
                <TabsTrigger value="background" className="flex-1">배경</TabsTrigger>
                <TabsTrigger value="blend" className="flex-1">합성</TabsTrigger>
              </TabsList>
              
              <TabsContent value="frame" className="animate-fadeIn">
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 max-h-[350px] overflow-y-auto p-1">
                  {templatesLoading ? (
                    Array(6).fill(0).map((_, i) => (
                      <div key={i} className="h-32 bg-gray-800 animate-pulse rounded-lg"></div>
                    ))
                  ) : (
                    filteredTemplates?.length ? (
                      templates?.filter((t: ImageTemplate) => t.isActive && t.templateType === "frame").map((template: ImageTemplate) => (
                        <div 
                          key={template.id}
                          className={`cursor-pointer rounded-lg overflow-hidden border transition-all relative
                            ${selectedTemplateId === template.id 
                              ? 'border-[#ff2d55] ring-2 ring-[#ff2d55]' 
                              : 'border-gray-700 hover:border-gray-500'
                            }`}
                          onClick={() => handleTemplateSelected(template.id)}
                        >
                          <img 
                            src={template.thumbnailUrl || template.templateImageUrl} 
                            alt={template.title} 
                            className="w-full h-32 object-cover"
                          />
                          {selectedTemplateId === template.id && (
                            <div className="absolute top-2 right-2 bg-[#ff2d55] text-white rounded-full w-6 h-6 flex items-center justify-center shadow-md">
                              <Check size={14} />
                            </div>
                          )}
                        </div>
                      ))
                    ) : (
                      <div className="col-span-3 flex flex-col items-center justify-center py-8 text-gray-400">
                        <Layers size={32} className="mb-3 opacity-50" />
                        <p>이 유형의 템플릿이 없습니다</p>
                      </div>
                    )
                  )}
                </div>
              </TabsContent>
              
              <TabsContent value="background" className="animate-fadeIn">
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 max-h-[350px] overflow-y-auto p-1">
                  {templatesLoading ? (
                    Array(6).fill(0).map((_, i) => (
                      <div key={i} className="h-32 bg-gray-800 animate-pulse rounded-lg"></div>
                    ))
                  ) : (
                    filteredTemplates?.length ? (
                      templates?.filter((t: ImageTemplate) => t.isActive && t.templateType === "background").map((template: ImageTemplate) => (
                        <div 
                          key={template.id}
                          className={`cursor-pointer rounded-lg overflow-hidden border transition-all relative
                            ${selectedTemplateId === template.id 
                              ? 'border-[#ff2d55] ring-2 ring-[#ff2d55]' 
                              : 'border-gray-700 hover:border-gray-500'
                            }`}
                          onClick={() => handleTemplateSelected(template.id)}
                        >
                          <img 
                            src={template.thumbnailUrl || template.templateImageUrl} 
                            alt={template.title} 
                            className="w-full h-32 object-cover"
                          />
                          {selectedTemplateId === template.id && (
                            <div className="absolute top-2 right-2 bg-[#ff2d55] text-white rounded-full w-6 h-6 flex items-center justify-center shadow-md">
                              <Check size={14} />
                            </div>
                          )}
                        </div>
                      ))
                    ) : (
                      <div className="col-span-3 flex flex-col items-center justify-center py-8 text-gray-400">
                        <Layers size={32} className="mb-3 opacity-50" />
                        <p>이 유형의 템플릿이 없습니다</p>
                      </div>
                    )
                  )}
                </div>
              </TabsContent>
              
              <TabsContent value="blend" className="animate-fadeIn">
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 max-h-[350px] overflow-y-auto p-1">
                  {templatesLoading ? (
                    Array(6).fill(0).map((_, i) => (
                      <div key={i} className="h-32 bg-gray-800 animate-pulse rounded-lg"></div>
                    ))
                  ) : (
                    filteredTemplates?.length ? (
                      templates?.filter((t: ImageTemplate) => t.isActive && t.templateType === "blend").map((template: ImageTemplate) => (
                        <div 
                          key={template.id}
                          className={`cursor-pointer rounded-lg overflow-hidden border transition-all relative
                            ${selectedTemplateId === template.id 
                              ? 'border-[#ff2d55] ring-2 ring-[#ff2d55]' 
                              : 'border-gray-700 hover:border-gray-500'
                            }`}
                          onClick={() => handleTemplateSelected(template.id)}
                        >
                          <img 
                            src={template.thumbnailUrl || template.templateImageUrl} 
                            alt={template.title} 
                            className="w-full h-32 object-cover"
                          />
                          {selectedTemplateId === template.id && (
                            <div className="absolute top-2 right-2 bg-[#ff2d55] text-white rounded-full w-6 h-6 flex items-center justify-center shadow-md">
                              <Check size={14} />
                            </div>
                          )}
                        </div>
                      ))
                    ) : (
                      <div className="col-span-3 flex flex-col items-center justify-center py-8 text-gray-400">
                        <Layers size={32} className="mb-3 opacity-50" />
                        <p>이 유형의 템플릿이 없습니다</p>
                      </div>
                    )
                  )}
                </div>
              </TabsContent>
            </Tabs>
            
            {selectedTemplate && (
              <div className="mt-4 p-3 bg-[#272730] rounded-lg">
                <h4 className="font-medium text-white">{selectedTemplate.title}</h4>
                {selectedTemplate.description && (
                  <p className="text-gray-400 text-sm mt-1">{selectedTemplate.description}</p>
                )}
              </div>
            )}
          </div>
          
          {/* 이미지 업로드 섹션 */}
          <div className="bg-[#1c1c24] rounded-xl p-5 mb-6">
            <div className="text-left mb-3">
              <h3 className="font-heading font-semibold text-white text-lg">이미지 업로드</h3>
              <p className="text-sm text-gray-400">선택한 템플릿과 합성할 이미지를 업로드하세요</p>
            </div>
            
            <div className="mb-4 relative">
              <FileUpload 
                onFileSelected={handleFileSelected}
                accept="image/*"
                maxSize={15 * 1024 * 1024} // 15MB
                id="composite-file-upload"
              >
                {!previewUrl ? (
                  <div className="border border-gray-700 h-48 rounded-lg flex flex-col items-center justify-center text-gray-400">
                    <Plus size={24} className="mb-2" />
                    <span className="text-sm">이미지를 업로드하려면 클릭하세요</span>
                    <span className="text-xs text-gray-500 mt-2">최대 15MB, JPEG, PNG 또는 WEBP 형식을 허용합니다.</span>
                  </div>
                ) : (
                  <div className="flex justify-center items-center h-48 border border-gray-700 rounded-lg overflow-hidden bg-black">
                    <img 
                      src={previewUrl} 
                      alt="선택한 이미지 미리보기" 
                      className="max-h-full max-w-full object-contain"
                    />
                  </div>
                )}
              </FileUpload>
            </div>
          </div>
          
          {/* 이미지 합성 버튼 */}
          <div className="flex justify-center">
            <Button 
              className="bg-[#ff2d55] hover:bg-[#ff2d55]/90 text-white"
              onClick={handleCompositeImage}
              disabled={!selectedFile || !selectedTemplateId || isProcessing}
            >
              {isProcessing ? "처리 중..." : "이미지 합성하기"}
            </Button>
          </div>
        </>
      )}
    </div>
  );
}