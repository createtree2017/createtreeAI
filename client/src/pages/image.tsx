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
import TopMenuBar from "@/components/TopMenuBar";

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

  // Fetch image list with more aggressive refresh option
  const { data: imageList = [], isLoading: isLoadingImages, refetch } = useQuery({
    queryKey: ["/api/image"], 
    // 직접 fetch 함수로 대체하여 캐시 제어 헤더 추가
    queryFn: async () => {
      const response = await fetch("/api/image", {
        headers: {
          "Cache-Control": "no-cache, no-store, must-revalidate",
          "Pragma": "no-cache",
          "Expires": "0"
        }
      });
      
      if (!response.ok) {
        throw new Error("이미지 목록을 불러오는 데 실패했습니다");
      }
      
      return response.json();
    },
    refetchOnMount: "always", // 컴포넌트 마운트 시 항상 새로 불러오기
    refetchInterval: 1000, // 1초마다 자동 갱신
    staleTime: 0, // 항상 최신 데이터를 가져오도록 staleTime 0으로 설정
    refetchOnWindowFocus: true, // 창이 포커스될 때마다 최신 데이터 가져오기
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
  


  // Transform image mutation (일반 사용자 페이지에서는 isAdmin=false로 호출)
  const { mutate: transformImageMutation, isPending: isTransforming } = useMutation({
    mutationFn: (data: FormData) => transformImage(data, false),
    onSuccess: async (data) => {
      setTransformedImage(data);
      
      console.log("이미지 변환 성공, 새 이미지:", data);
      
      // 이미지 목록 강제 리프레시 - 캐시 초기화 후 다시 가져오기
      await queryClient.invalidateQueries({ queryKey: ["/api/image"] });
      
      // 강제로 데이터를 다시 가져오기 위해 timeout 추가
      setTimeout(() => {
        // 직접 fetch 호출로 서버에서 새로운 데이터 요청
        fetch("/api/image", {
          cache: "no-store",
          headers: {
            "Cache-Control": "no-cache, no-store, must-revalidate",
            "Pragma": "no-cache",
            "Expires": "0"
          }
        }).then(res => res.json())
          .then(newData => {
            console.log("새로운 이미지 데이터 수신:", newData.length, "개 항목");
            // 강제로 refetch 실행
            refetch();
          })
          .catch(err => console.error("이미지 데이터 갱신 중 오류:", err));
      }, 300);
      
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
    setTransformedImage(image);
  };


  
  // 카테고리 정보 가져오기
  const getCategoryTitle = (categoryId: string) => {
    const category = Array.isArray(categories) 
      ? categories.find(cat => cat.categoryId === categoryId)
      : null;
    return category ? category.name : categoryId;
  };

  return (
    <div className="animate-fadeIn">
      {/* Top Menu Bar */}
      <TopMenuBar title="Mom's Service" />
      
      <div className="p-5">
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
              {filteredStyles.map((style) => (
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
                    <span className="font-medium text-gray-300">가족사진</span>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>

        {/* 스타일 선택 섹션 */}
        <div className="bg-[#1c1c24] rounded-xl p-5 mb-6">
          <div className="flex justify-between items-center mb-5">
            <h3 className="font-heading font-semibold text-white text-lg">스타일</h3>
          </div>

          {/* 스타일 선택 버튼 */}
          <div 
            className="cursor-pointer rounded-lg border border-gray-700 overflow-hidden flex items-center justify-between px-4 py-3 hover:border-gray-500 transition-all"
            onClick={() => setStyleDialogOpen(true)}
          >
            <div className="flex items-center">
              {selectedStyle && filteredStyles.find(style => style.value === selectedStyle) ? (
                <>
                  <div className="w-10 h-10 rounded-lg overflow-hidden mr-3">
                    <img 
                      src={filteredStyles.find(style => style.value === selectedStyle)?.thumbnailUrl} 
                      alt={filteredStyles.find(style => style.value === selectedStyle)?.label}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <span className="text-white font-medium">
                    {filteredStyles.find(style => style.value === selectedStyle)?.label}
                  </span>
                </>
              ) : (
                <span className="text-gray-400">스타일을 선택해주세요</span>
              )}
            </div>
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </div>
        </div>

        {/* Image Upload Section */}
        <div className="bg-[#1c1c24] rounded-xl p-5 mb-6">
          <div className="text-left mb-3">
            <h3 className="font-heading font-semibold text-white text-lg">이미지 업로드</h3>
          </div>
          
          {/* 이미지 업로드 영역 */}
          <div className="mb-4 relative">
            <label htmlFor="file-upload" className="block cursor-pointer">
              {!previewUrl ? (
                // 이미지 업로드 전 상태
                <div className="border border-gray-700 h-48 rounded-lg flex flex-col items-center justify-center text-gray-400">
                  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mb-2">
                    <rect width="18" height="18" x="3" y="3" rx="2" ry="2" />
                    <circle cx="9" cy="9" r="2" />
                    <path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21" />
                  </svg>
                  <span className="text-sm">이미지를 업로드하려면 클릭하세요</span>
                  <span className="text-xs text-gray-500 mt-2">최대 15MB, 4096 × 4096픽셀의 JPEG, PNG 또는 WEBP 형식을 허용합니다.</span>
                </div>
              ) : (
                // 이미지 업로드 후 미리보기
                <div className="flex justify-center items-center h-48 border border-gray-700 rounded-lg overflow-hidden bg-black">
                  <img 
                    src={previewUrl} 
                    alt="선택한 이미지 미리보기" 
                    className="max-h-full max-w-full object-contain"
                  />
                </div>
              )}
            </label>
            
            {/* 숨겨진 파일 업로드 입력 필드 */}
            <FileUpload 
              id="file-upload"
              onFileSelect={handleFileSelected} 
              accept="image/*"
              maxSize={15 * 1024 * 1024} // 15MB
              className="hidden"
            />
          </div>
          
          {/* 변환 버튼 섹션 */}
          <div id="transform-section" className="flex justify-center">
            <Button
              onClick={handleTransformImage}
              disabled={isTransforming || !selectedFile || !selectedStyle}
              className="w-full bg-[#ff2d55] hover:bg-[#ff2d55]/90 text-white rounded-lg font-medium py-3 px-4 transition-all disabled:bg-[#ff2d55]/50 disabled:cursor-not-allowed"
            >
              {isTransforming ? (
                <>
                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  변환 중...
                </>
              ) : (
                '이미지 변환하기'
              )}
            </Button>
          </div>
        </div>

        {/* A/B Test Comparison */}
        {showAbTest && activeAbTest && Object.keys(abTestImages).length > 1 && transformedImage && (
          <div className="bg-[#1c1c24] rounded-xl p-5 mb-6">
            <div className="flex justify-between items-center mb-5">
              <h3 className="font-heading font-semibold text-white text-lg">A/B 테스트</h3>
            </div>
            <ABTestComparer 
              originalImage={transformedImage.transformedUrl} 
              variantImages={abTestImages}
              variants={activeAbTest.variants}
              onSelectVariant={(variantId: string) => {
                console.log("Selected variant:", variantId);
              }}
            />
          </div>
        )}

        {/* 변환된 이미지 */}
        {transformedImage && (
          <div className="bg-[#1c1c24] rounded-xl p-5 mb-6">
            <div className="flex justify-between items-center mb-5">
              <h3 className="font-heading font-semibold text-white text-lg">변환된 이미지</h3>
            </div>
            <div className="flex flex-col space-y-4">
              <div className="flex md:flex-row flex-col gap-4">
                {/* 원본 이미지 */}
                <div className="w-full md:w-1/2 bg-[#272730] rounded-xl overflow-hidden border border-gray-700">
                  <div className="p-3 border-b border-gray-700">
                    <h4 className="text-gray-300 font-medium">원본 이미지</h4>
                  </div>
                  <div className="flex justify-center items-center p-4 bg-black">
                    <img 
                      src={transformedImage.originalUrl} 
                      alt="원본 이미지" 
                      className="max-h-[300px] max-w-full object-contain rounded" 
                    />
                  </div>
                </div>
                
                {/* 변환된 이미지 */}
                <div className="w-full md:w-1/2 bg-[#272730] rounded-xl overflow-hidden border border-gray-700">
                  <div className="p-3 border-b border-gray-700">
                    <h4 className="text-gray-300 font-medium">
                      {filteredStyles.find(style => style.value === transformedImage.style)?.label || "변환된 이미지"}
                    </h4>
                  </div>
                  <div className="flex justify-center items-center p-4 bg-black">
                    <img 
                      src={transformedImage.transformedUrl} 
                      alt="변환된 이미지" 
                      className="max-h-[300px] max-w-full object-contain rounded" 
                    />
                  </div>
                  {/* 버튼 그룹 */}
                  <div className="flex items-center p-3 border-t border-gray-700 bg-[#1c1c24]">
                    <Button
                      size="sm"
                      className="flex-1 text-xs bg-neutral-lightest hover:bg-neutral-light text-neutral-darkest"
                      onClick={() => handleViewImage(transformedImage)}
                    >
                      <Eye className="mr-1 h-3 w-3" /> 보기
                    </Button>
                    <Button
                      size="sm"
                      className="flex-1 text-xs bg-primary-light hover:bg-primary/20 text-primary-dark"
                      onClick={() => handleDownload(transformedImage.id)}
                    >
                      <Download className="mr-1 h-3 w-3" /> 저장
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 내 변환 이미지 목록 */}
        <div className="bg-[#1c1c24] rounded-xl p-5 mb-6">
          <div className="flex justify-between items-center mb-5">
            <h3 className="font-heading font-semibold text-white text-lg">내 추억 컬렉션</h3>
          </div>
          
          {Array.isArray(imageList) && imageList.length > 0 ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
              {imageList.map((image: TransformedImage) => (
                <div key={image.id} className="bg-[#272730] rounded-lg overflow-hidden border border-gray-700">
                  <div className="aspect-square bg-black flex items-center justify-center overflow-hidden">
                    <img 
                      src={image.transformedUrl} 
                      alt={image.title} 
                      className="object-cover w-full h-full hover:scale-105 transition-transform"
                      onClick={() => handleViewImage(image)}
                    />
                  </div>
                  <div className="p-2">
                    <div className="text-xs text-gray-400 mt-1 truncate">
                      {new Date(image.createdAt).toLocaleDateString()}
                    </div>
                    <div className="flex mt-2 gap-1">
                      <Button
                        size="sm"
                        className="flex-1 text-xs bg-neutral-lightest hover:bg-neutral-light text-neutral-darkest"
                        onClick={() => handleViewImage(image)}
                      >
                        <Eye className="mr-1 h-3 w-3" /> 보기
                      </Button>
                      <Button
                        size="sm"
                        className="flex-1 text-xs bg-primary-light hover:bg-primary/20 text-primary-dark"
                        onClick={() => handleDownload(image.id)}
                      >
                        <Download className="mr-1 h-3 w-3" /> 저장
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 bg-neutral-lightest rounded-xl border border-dashed border-neutral-light">
              <PaintbrushVertical className="h-8 w-8 mx-auto mb-2 text-neutral" />
              <p className="text-neutral-dark font-medium">아직 추억이 없습니다</p>
              <p className="text-sm mt-1 mb-4 text-neutral-dark">첫 번째 사진을 변환하여 추억 컬렉션을 시작하세요</p>
              <Button
                variant="outline"
                size="sm"
                className="bg-white hover:bg-neutral-lightest"
                onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
              >
                사진 업로드하기
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
