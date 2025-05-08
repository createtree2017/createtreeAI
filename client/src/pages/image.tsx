import { useState, useEffect, useMemo } from "react";
import { useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { FileUpload } from "@/components/ui/file-upload";
import { transformImage, downloadMedia, shareMedia, getActiveAbTest } from "@/lib/api";
import { queryClient } from "@/lib/queryClient";
import { PaintbrushVertical, Download, Share2, Eye, ChevronRight, X, CheckCircle2 } from "lucide-react";
import ABTestComparer from "@/components/ABTestComparer";
import { Dialog, DialogContent, DialogTitle, DialogHeader, DialogDescription, DialogFooter } from "@/components/ui/dialog";

interface ImageStyle {
  value: string;
  label: string;
  thumbnailUrl: string;
  categoryId?: string;
  description?: string;
}

interface TransformedImage {
  id: number;
  title: string;
  style: string;
  originalUrl: string;
  transformedUrl: string;
  createdAt: string;
  aspectRatio?: string;
}

interface Category {
  id: number;
  categoryId: string;
  name: string;
  title?: string;
  description?: string;
  order?: number;
  isActive?: boolean;
}

interface Concept {
  id: number;
  conceptId: string;
  title: string;
  description?: string;
  categoryId: string;
  thumbnailUrl: string;
  order?: number;
  isActive?: boolean;
  promptTemplate?: string;
  isFeatured?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export default function Image() {
  const [location, setLocation] = useLocation();
  const { toast } = useToast();
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [selectedStyle, setSelectedStyle] = useState<string | null>(null);
  const [transformedImage, setTransformedImage] = useState<TransformedImage | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [selectedAspectRatio, setSelectedAspectRatio] = useState<string>("1:1");
  const [styleDialogOpen, setStyleDialogOpen] = useState<boolean>(false);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [viewImageDialogOpen, setViewImageDialogOpen] = useState<boolean>(false);
  const [selectedViewImage, setSelectedViewImage] = useState<TransformedImage | null>(null);
  
  // A/B Testing states
  const [activeAbTest, setActiveAbTest] = useState<any>(null);
  const [abTestImages, setAbTestImages] = useState<Record<string, string>>({});
  const [showAbTest, setShowAbTest] = useState<boolean>(false);

  // Extract image ID from URL if any
  const query = new URLSearchParams(location.split("?")[1] || "");
  const imageId = query.get("id");
  
  // Fetch categories
  const { data: categories = [] } = useQuery<Category[]>({
    queryKey: ["/api/concept-categories"]
  });
  
  // Fetch concepts (styles)
  const { data: concepts = [] } = useQuery<Concept[]>({
    queryKey: ["/api/concepts"]
  });
  
  // Set default category if none selected
  useEffect(() => {
    if (Array.isArray(categories) && categories.length > 0 && !selectedCategory) {
      setSelectedCategory(categories[0].categoryId);
    } else if (!selectedCategory) {
      // 기본값으로 "만삭사진" 카테고리 선택
      setSelectedCategory("mansak_img");
    }
  }, [categories, selectedCategory]);
  
  // Create styles from concepts
  const artStyles = useMemo(() => {
    if (!Array.isArray(concepts)) return [];
    
    return concepts.map(concept => ({
      value: concept.conceptId,
      label: concept.title || "",
      thumbnailUrl: concept.thumbnailUrl || `https://placehold.co/300x200/F0F0F0/333?text=${encodeURIComponent(concept.title || "")}`,
      categoryId: concept.categoryId,
      description: concept.description
    }));
  }, [concepts]);
  
  // Filter styles by selected category
  const filteredStyles = useMemo(() => {
    if (!selectedCategory) return artStyles;
    return artStyles.filter(style => style.categoryId === selectedCategory);
  }, [artStyles, selectedCategory]);

  // Transform image mutation (일반 사용자 페이지에서는 isAdmin=false로 호출)
  const { mutate: transformImageMutation, isPending: isTransforming } = useMutation({
    mutationFn: (data: FormData) => transformImage(data, false),
    onSuccess: async (data) => {
      setTransformedImage(data);
      
      console.log("이미지 변환 성공, 새 이미지:", data);
      
      // 이미지 목록 강제 리프레시 - 캐시 초기화 후 다시 가져오기
      await queryClient.invalidateQueries({ queryKey: ["/api/image"] });
      
      // 1초 후 한 번만 refetch (중복 요청 방지)
      setTimeout(() => {
        refetch();
      }, 1000);
      
      // Check if there's an active A/B test for this style and show it if available
      if (selectedStyle) {
        fetchActiveAbTest(selectedStyle);
        setShowAbTest(true);
      }
      
      toast({
        title: "Success!",
        description: "Your image has been transformed",
      });
      
      // If we have an active test, let's also transform the image with each variant
      if (activeAbTest && activeAbTest.variants && activeAbTest.variants.length >= 2) {
        activeAbTest.variants.forEach(async (variant: any) => {
          try {
            const formData = new FormData();
            formData.append("image", selectedFile as File);
            formData.append("style", selectedStyle as string);
            formData.append("variant", variant.variantId);
            formData.append("aspectRatio", selectedAspectRatio);
            
            // A/B 테스트 변형 이미지는 테스트용이므로 데이터베이스에 저장
            const variantResult = await transformImage(formData, true);
            setAbTestImages(prev => ({
              ...prev,
              [variant.variantId]: variantResult.transformedUrl
            }));
          } catch (error) {
            console.error(`Error transforming with variant ${variant.variantId}:`, error);
          }
        });
      }
    },
    onError: (error) => {
      toast({
        title: "Error transforming image",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // 이미지 목록 가져오기 (성능 최적화)
  const { data: imageList, isLoading: isLoadingImages, refetch } = useQuery({
    queryKey: ["/api/image"], 
    queryFn: async () => {
      // 변환이 진행 중이거나 처음 로드할 때만 캐시 무효화 사용
      const noCache = isTransforming || !imageList;
      
      const response = await fetch(`/api/image${noCache ? '?nocache=true' : ''}`, {
        headers: noCache ? {
          "Cache-Control": "no-cache, no-store, must-revalidate",
          "Pragma": "no-cache",
          "Expires": "0"
        } : {}
      });
      
      if (!response.ok) {
        throw new Error("이미지 목록을 불러오는 데 실패했습니다");
      }
      
      const data = await response.json();
      console.log("이미지 목록 조회:", data.length, "개 항목");
      return data;
    },
    refetchOnMount: true, // 컴포넌트 마운트 시 새로 불러오기
    refetchInterval: isTransforming ? 2000 : 30000, // 변환 중에는 2초마다, 평상시엔 30초마다 갱신
    staleTime: 10000, // 10초 동안은 캐시된 데이터 사용
    refetchOnWindowFocus: true, // 창이 포커스될 때 최신 데이터 가져오기
    refetchOnReconnect: true, // 네트워크 재연결 시 새로고침
  });

  // Fetch individual image if ID is provided
  useEffect(() => {
    if (imageId && imageList) {
      const foundImage = imageList.find((item: TransformedImage) => item.id === Number(imageId));
      if (foundImage) {
        setTransformedImage(foundImage);
      }
    }
  }, [imageId, imageList]);

  // Fetch active A/B test for the current concept
  const fetchActiveAbTest = async (conceptId: string) => {
    try {
      const testData = await getActiveAbTest(conceptId);
      if (testData) {
        setActiveAbTest(testData);
        // Reset A/B test images since we have a new test
        setAbTestImages({});
      }
    } catch (error) {
      console.error("Error fetching A/B test:", error);
    }
  };

  const handleFileSelected = (file: File) => {
    setSelectedFile(file);
    
    // Create a preview URL for the selected image
    const fileReader = new FileReader();
    fileReader.onload = (e) => {
      setPreviewUrl(e.target?.result as string);
    };
    fileReader.readAsDataURL(file);
  };

  const handleStyleSelected = (style: string) => {
    // 이미 선택된 스타일을 다시 클릭한 경우 선택 취소 (토글)
    if (selectedStyle === style) {
      setSelectedStyle(null);
    } else {
      // 선택 효과에 애니메이션을 주기 위해 일시적으로 스타일 제거 후 다시 설정
      if (selectedStyle) {
        setSelectedStyle(null);
        setTimeout(() => {
          setSelectedStyle(style);
        }, 150);
      } else {
        setSelectedStyle(style);
      }
      
      // 스크롤을 살짝 내려서 선택한 스타일과 변환 버튼이 잘 보이도록 함
      setTimeout(() => {
        const transformSection = document.getElementById('transform-section');
        if (transformSection) {
          transformSection.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }, 300);
    }
  };

  const handleTransformImage = () => {
    if (!selectedFile || !selectedStyle) {
      toast({
        title: "Missing information",
        description: selectedFile ? "Please select a style" : "Please upload an image",
        variant: "destructive",
      });
      return;
    }

    const formData = new FormData();
    formData.append("image", selectedFile);
    formData.append("style", selectedStyle);
    formData.append("aspectRatio", selectedAspectRatio);

    // 일반 사용자 페이지에서는 관리자 플래그 없이 호출 (이미지 임시 표시용)
    transformImageMutation(formData);
  };

  const handleDownload = async (id: number) => {
    try {
      await downloadMedia(id, "image");
      toast({
        title: "Download started",
        description: "Your image is being downloaded"
      });
    } catch (error) {
      toast({
        title: "Download failed",
        description: "Please try again",
        variant: "destructive"
      });
    }
  };

  const handleShare = async (id: number) => {
    try {
      const shareData = await shareMedia(id, "image");
      
      // 클립보드 복사 상태 확인 및 적절한 사용자 피드백 제공
      if (shareData.error) {
        // 에러가 있는 경우
        toast({
          title: "공유 링크 생성 실패",
          description: shareData.error,
          variant: "destructive",
        });
        return;
      }
      
      if (shareData.shareUrl) {
        if (shareData.clipboardCopySuccess) {
          // 클립보드 복사 성공
          toast({
            title: "공유 링크가 복사되었습니다",
            description: "링크가 클립보드에 복사되었습니다. 원하는 곳에 붙여넣기 하세요.",
          });
        } else if (shareData.clipboardErrorMessage) {
          // 클립보드 복사 실패했지만 URL은 있음
          toast({
            title: "공유 링크 생성됨",
            description: "클립보드 복사에 실패했습니다. 직접 URL을 복사해주세요: " + shareData.shareUrl.substring(0, 30) + "...",
            duration: 5000,
          });
        } else {
          // 일반 성공
          toast({
            title: "공유 링크 생성됨",
            description: "이미지를 공유할 수 있는 링크가 생성되었습니다.",
          });
        }
      } else {
        // URL이 없는 경우
        toast({
          title: "공유 링크 생성 실패",
          description: "공유 URL을 생성하지 못했습니다. 다시 시도해주세요.",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("공유 기능 오류:", error);
      toast({
        title: "공유 기능 오류",
        description: "공유 링크를 생성하는 중 문제가 발생했습니다. 다시 시도해주세요.",
        variant: "destructive",
      });
    }
  };

  const handleViewImage = (image: TransformedImage) => {
    setSelectedViewImage(image);
    setViewImageDialogOpen(true);
  };


  
  // 카테고리 정보 가져오기
  const getCategoryTitle = (categoryId: string) => {
    const category = Array.isArray(categories) 
      ? categories.find(cat => cat.categoryId === categoryId)
      : null;
    return category ? category.title : categoryId;
  };

  return (
    <div className="p-5 animate-fadeIn">
      <div className="text-center mb-6">
        <h2 className="font-heading font-bold text-2xl mb-2">AI 이미지 생성</h2>
        <p className="text-neutral-dark">임신 및 가족의 사진을 아름다운 추억으로 변환해 보세요</p>
      </div>
      
      {/* 스타일 선택 다이얼로그 */}
      <Dialog open={styleDialogOpen} onOpenChange={setStyleDialogOpen}>
        <DialogContent className="sm:max-w-[600px] max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-xl font-heading font-bold text-center">스타일 선택</DialogTitle>
            <DialogDescription className="text-center">
              원하는 스타일을 클릭하여 선택하세요
            </DialogDescription>
          </DialogHeader>
          
          <div className="grid grid-cols-2 gap-4 mt-4">
            {artStyles.map((style) => (
              <div 
                key={style.value}
                className={`cursor-pointer rounded-xl overflow-hidden transition-all duration-200 border-2
                  ${selectedStyle === style.value 
                    ? 'border-primary shadow-lg' 
                    : 'border-transparent hover:border-primary/30'
                  }`}
                onClick={() => {
                  handleStyleSelected(style.value);
                  setStyleDialogOpen(false);
                }}
              >
                <div className="relative">
                  <img 
                    src={style.thumbnailUrl} 
                    alt={style.label} 
                    className="w-full h-40 object-cover"
                    onError={(e) => {
                      e.currentTarget.src = `https://placehold.co/300x200/F0F0F0/333?text=${encodeURIComponent(style.label)}`;
                    }}
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent flex items-end">
                    <div className="p-3 w-full">
                      <h3 className="text-white font-medium">{style.label}</h3>
                      {style.description && (
                        <p className="text-white/80 text-xs mt-1">{style.description}</p>
                      )}
                    </div>
                  </div>
                  {selectedStyle === style.value && (
                    <div className="absolute top-2 right-2 bg-primary text-white rounded-full w-6 h-6 flex items-center justify-center shadow-md">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </DialogContent>
      </Dialog>
      
      {/* 카테고리 선택 섹션 */}
      <div className="bg-[#1c1c24] rounded-xl p-5 mb-6">
        <div className="flex justify-between items-center mb-5">
          <h3 className="font-heading font-semibold text-white text-lg">카테고리</h3>
        </div>
        
        <div className="grid grid-cols-3 gap-2">
          {Array.isArray(categories) && categories.length > 0 ? (
            // 카테고리가 로드됐을 때
            categories.map((category) => (
              <div 
                key={category.categoryId}
                className={`cursor-pointer rounded-lg border overflow-hidden transition-colors
                  ${selectedCategory === category.categoryId 
                    ? 'ring-2 ring-[#ff2d55] border-[#ff2d55]' 
                    : 'bg-[#272730] border-gray-700 hover:border-gray-500'
                  }`}
                onClick={() => setSelectedCategory(category.categoryId)}
              >
                <div className="flex items-center justify-between px-4 py-3">
                  <span className={`font-medium ${selectedCategory === category.categoryId ? 'text-[#ff2d55]' : 'text-gray-300'}`}>
                    {category.name}
                  </span>
                  {selectedCategory === category.categoryId && (
                    <CheckCircle2 className="h-5 w-5 text-[#ff2d55]" />
                  )}
                </div>
              </div>
            ))
          ) : (
            // 카테고리가 없거나 로딩 중일 때 기본 카테고리 3개 표시
            <>
              <div className="cursor-pointer rounded-lg border overflow-hidden transition-colors bg-[#272730] border-gray-700 hover:border-gray-500">
                <div className="flex items-center justify-between px-4 py-3">
                  <span className="font-medium text-gray-300">임신사진</span>
                </div>
              </div>
              <div className="cursor-pointer rounded-lg border overflow-hidden transition-colors ring-2 ring-[#ff2d55] border-[#ff2d55]">
                <div className="flex items-center justify-between px-4 py-3">
                  <span className="font-medium text-[#ff2d55]">만삭사진</span>
                  <CheckCircle2 className="h-5 w-5 text-[#ff2d55]" />
                </div>
              </div>
              <div className="cursor-pointer rounded-lg border overflow-hidden transition-colors bg-[#272730] border-gray-700 hover:border-gray-500">
                <div className="flex items-center justify-between px-4 py-3">
                  <span className="font-medium text-gray-300">아기사진</span>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
      
      {/* 이미지 선택 섹션 */}
      <div className="p-5 bg-white rounded-xl shadow-sm mb-6">
        <h3 className="font-heading font-bold text-xl mb-4">Step 1: 이미지 선택</h3>
        <FileUpload
          onChange={handleFileSelected}
          maxSize={10485760}
          accept=".jpg,.jpeg,.png"
          id="image-upload"
        />
        
        {previewUrl && (
          <div className="mt-4 relative">
            <img 
              src={previewUrl} 
              alt="Preview" 
              className="w-full h-auto rounded-lg shadow-sm border border-gray-200" 
            />
            <button 
              className="absolute top-2 right-2 bg-red-500 rounded-full p-1 text-white"
              onClick={() => {
                setPreviewUrl(null);
                setSelectedFile(null);
              }}
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        )}
      </div>
      
      {/* 스타일 선택 섹션 */}
      <div className="p-5 bg-white rounded-xl shadow-sm mb-6">
        <h3 className="font-heading font-bold text-xl mb-4">Step 2: 스타일 선택</h3>
        
        {selectedStyle ? (
          <div className="mb-4">
            <div className="flex items-center space-x-2 mb-2">
              <div className="font-semibold text-neutral">선택한 스타일:</div>
              <div className="bg-primary/10 text-primary px-3 py-1 rounded-full text-sm font-medium">
                {artStyles.find(s => s.value === selectedStyle)?.label || selectedStyle}
              </div>
              <button 
                className="text-neutral-light hover:text-neutral text-sm underline"
                onClick={() => setStyleDialogOpen(true)}
              >
                변경
              </button>
            </div>
            
            {/* 선택된 스타일 미리보기 */}
            {artStyles.find(s => s.value === selectedStyle)?.thumbnailUrl && (
              <div className="relative h-32 w-32 rounded-lg overflow-hidden shadow-sm border border-gray-100">
                <img
                  src={artStyles.find(s => s.value === selectedStyle)?.thumbnailUrl}
                  alt={artStyles.find(s => s.value === selectedStyle)?.label || "Selected style"}
                  className="h-full w-full object-cover"
                  onError={(e) => {
                    e.currentTarget.src = `https://placehold.co/300x200/F0F0F0/333?text=스타일`;
                  }}
                />
                <div className={`absolute inset-0 ${selectedStyle ? 'bg-[#ff2d55]/20' : ''}`}>
                  {selectedStyle && (
                    <div className="absolute bottom-2 right-2 bg-[#ff2d55] text-white rounded-full w-6 h-6 flex items-center justify-center shadow-md">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        ) : (
          // 스타일이 선택되지 않은 경우
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 mb-4 max-h-[300px] overflow-y-auto">
            {filteredStyles.length > 0 ? (
              // 스타일 목록이 있을 때
              filteredStyles.slice(0, 6).map((style) => (
                <div 
                  key={style.value}
                  className="cursor-pointer rounded-xl overflow-hidden transition-transform hover:scale-[1.02] border border-gray-100 shadow-sm"
                  onClick={() => handleStyleSelected(style.value)}
                >
                  <div className="relative">
                    <img 
                      src={style.thumbnailUrl} 
                      alt={style.label} 
                      className="w-full h-24 object-cover"
                      onError={(e) => {
                        e.currentTarget.src = `https://placehold.co/300x200/F0F0F0/333?text=${encodeURIComponent(style.label)}`;
                      }}
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent flex items-end">
                      <div className="p-2 w-full">
                        <h3 className="text-white text-sm font-medium truncate">{style.label}</h3>
                      </div>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              // 스타일 로딩 중 또는 비어 있을 때
              <div className="col-span-full flex flex-col items-center justify-center bg-gray-50 p-6 rounded-lg">
                <div className="text-neutral-dark mb-2">선택된 카테고리에 사용 가능한 스타일이 없습니다</div>
                <p className="text-neutral-light text-sm">다른 카테고리를 선택하거나 스타일이 로드될 때까지 기다려 주세요</p>
              </div>
            )}
          </div>
        )}
        
        {filteredStyles.length > 6 && (
          <Button 
            variant="ghost" 
            className="w-full text-neutral-dark hover:text-primary hover:bg-primary/5 flex items-center justify-center mt-4"
            onClick={() => setStyleDialogOpen(true)}
          >
            <span>더 많은 스타일 보기</span>
            <ChevronRight className="h-4 w-4 ml-1" />
          </Button>
        )}
      </div>
      
      {/* 이미지 변환 버튼 */}
      <div id="transform-section" className="p-5 bg-white rounded-xl shadow-sm mb-6">
        <h3 className="font-heading font-bold text-xl mb-4">Step 3: 이미지 변환</h3>
        
        <div className="mb-4">
          <label htmlFor="aspect-ratio" className="block text-sm font-medium text-neutral-dark mb-2">
            이미지 비율 선택 (선택사항)
          </label>
          <div className="grid grid-cols-4 gap-2">
            {["1:1", "4:3", "3:4", "16:9"].map((ratio) => (
              <button
                key={ratio}
                type="button"
                className={`py-2 px-3 rounded-md text-sm font-medium transition-colors
                  ${selectedAspectRatio === ratio
                    ? 'bg-primary text-white'
                    : 'bg-gray-100 text-neutral-dark hover:bg-gray-200'
                  }`}
                onClick={() => setSelectedAspectRatio(ratio)}
              >
                {ratio}
              </button>
            ))}
          </div>
        </div>
        
        <Button
          size="lg"
          className="w-full bg-[#ff2d55] hover:bg-[#ff2d55]/90 text-white font-semibold py-4 h-auto"
          disabled={!selectedFile || !selectedStyle || isTransforming}
          onClick={handleTransformImage}
        >
          {isTransforming ? (
            <>
              <svg className="animate-spin -ml-1 mr-2 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              이미지 변환 중...
            </>
          ) : (
            <>
              <PaintbrushVertical className="h-5 w-5 mr-2" />
              이미지 변환하기
            </>
          )}
        </Button>
      </div>
      
      {/* 변환된 이미지 섹션 */}
      {transformedImage && (
        <div className="p-5 bg-white rounded-xl shadow-sm mb-6">
          <h3 className="font-heading font-bold text-xl mb-4">변환 결과</h3>
          
          <div className="rounded-xl overflow-hidden shadow-md border border-gray-100 mb-4">
            <img
              src={transformedImage.transformedUrl}
              alt={transformedImage.title}
              className="w-full h-auto"
              onError={(e) => {
                e.currentTarget.src = `https://placehold.co/800x600/F0F0F0/333?text=이미지를+불러올+수+없습니다`;
              }}
            />
          </div>
          
          <div className="flex space-x-2">
            <Button
              variant="outline"
              className="flex-1 flex items-center justify-center"
              onClick={() => handleDownload(transformedImage.id)}
            >
              <Download className="h-4 w-4 mr-2" />
              다운로드
            </Button>
            <Button
              variant="outline"
              className="flex-1 flex items-center justify-center"
              onClick={() => handleShare(transformedImage.id)}
            >
              <Share2 className="h-4 w-4 mr-2" />
              공유하기
            </Button>
            <Button
              variant="outline"
              className="flex-1 flex items-center justify-center"
              onClick={() => handleViewImage(transformedImage)}
            >
              <Eye className="h-4 w-4 mr-2" />
              크게보기
            </Button>
          </div>
        </div>
      )}
      
      {/* A/B 테스트 결과 섹션 */}
      {showAbTest && activeAbTest && activeAbTest.variants && activeAbTest.variants.length >= 2 && (
        <div className="p-5 bg-white rounded-xl shadow-sm mb-6">
          <h3 className="font-heading font-bold text-xl mb-4">스타일 비교</h3>
          
          <div className="mb-2 text-sm text-neutral-dark">
            아래 두 이미지의 결과를 비교해보세요. 어떤 스타일이 더 맘에 드시나요?
          </div>
          
          {/* A/B 테스트 컴포넌트 */}
          <ABTestComparer 
            variantA={{
              label: activeAbTest.variants[0].name || "스타일 A",
              imageUrl: abTestImages[activeAbTest.variants[0].variantId] || ""
            }}
            variantB={{
              label: activeAbTest.variants[1].name || "스타일 B",
              imageUrl: abTestImages[activeAbTest.variants[1].variantId] || ""
            }}
            onVote={(variantId) => {
              toast({
                title: "의견 전달 완료",
                description: "소중한 의견을 주셔서 감사합니다. 더 나은 서비스를 위해 활용하겠습니다.",
              });
              setShowAbTest(false);
            }}
          />
        </div>
      )}
      
      {/* 최근 변환 이미지 목록 */}
      {Array.isArray(imageList) && imageList.length > 0 && (
        <div className="p-5 bg-white rounded-xl shadow-sm mb-6">
          <h3 className="font-heading font-bold text-xl mb-4">최근 변환 이미지</h3>
          
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {imageList.map((image: TransformedImage) => (
              <div 
                key={image.id} 
                className="rounded-lg overflow-hidden border border-gray-100 shadow-sm cursor-pointer"
                onClick={() => handleViewImage(image)}
              >
                <div className="relative aspect-square">
                  <img 
                    src={image.transformedUrl} 
                    alt={image.title} 
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      e.currentTarget.src = `https://placehold.co/300x300/F0F0F0/333?text=이미지를+불러올+수+없습니다`;
                    }}
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 hover:opacity-100 transition-opacity flex items-end">
                    <div className="p-2 w-full">
                      <h3 className="text-white text-sm font-medium truncate">{image.title || "이미지"}</h3>
                      <div className="text-white/80 text-xs mt-1">
                        {new Date(image.createdAt).toLocaleDateString()}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
      
      {/* 이미지 뷰어 다이얼로그 */}
      <Dialog
        open={viewImageDialogOpen}
        onOpenChange={setViewImageDialogOpen}
      >
        <DialogContent className="sm:max-w-[800px] p-1 bg-black">
          <div className="relative">
            {selectedViewImage && (
              <>
                <img
                  src={selectedViewImage.transformedUrl}
                  alt={selectedViewImage.title}
                  className="w-full h-auto max-h-[80vh]"
                  onError={(e) => {
                    e.currentTarget.src = `https://placehold.co/800x600/F0F0F0/333?text=이미지를+불러올+수+없습니다`;
                  }}
                />
                <button
                  className="absolute top-2 right-2 bg-white/20 backdrop-blur-sm rounded-full p-1.5 text-white hover:bg-white/30 transition-colors"
                  onClick={() => setViewImageDialogOpen(false)}
                >
                  <X className="h-5 w-5" />
                </button>
              </>
            )}
          </div>
          <DialogFooter className="bg-black text-white px-4 py-2 flex justify-between items-center">
            <div className="text-sm">
              {selectedViewImage?.title || "Image"}
            </div>
            <div className="flex space-x-2">
              {selectedViewImage && (
                <>
                  <Button
                    variant="outline"
                    size="sm"
                    className="bg-transparent text-white border-white/30 hover:bg-white/10"
                    onClick={() => handleDownload(selectedViewImage.id)}
                  >
                    <Download className="h-4 w-4 mr-1" />
                    다운로드
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="bg-transparent text-white border-white/30 hover:bg-white/10"
                    onClick={() => handleShare(selectedViewImage.id)}
                  >
                    <Share2 className="h-4 w-4 mr-1" />
                    공유
                  </Button>
                </>
              )}
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}