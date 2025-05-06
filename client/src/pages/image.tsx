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
  title: string;
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
  
  // Set first category as default if none selected
  useEffect(() => {
    if (categories.length > 0 && !selectedCategory) {
      setSelectedCategory(categories[0].categoryId);
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
  const { data: imageList, isLoading: isLoadingImages, refetch } = useQuery({
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
    return category ? category.title : categoryId;
  };

  return (
    <div className="p-5 animate-fadeIn">
      <div className="text-center mb-6">
        <h2 className="font-heading font-bold text-2xl mb-2">마터니티 아트 매직</h2>
        <p className="text-neutral-dark">임신 및 아기 사진을 아름다운 추억으로 변환해보세요</p>
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
          {Array.isArray(categories) && categories.map((category) => (
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
                  {category.title}
                </span>
                {selectedCategory === category.categoryId && (
                  <CheckCircle2 className="h-5 w-5 text-[#ff2d55]" />
                )}
              </div>
            </div>
          ))}
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

        {/* 스타일 선택 다이얼로그 */}
        <Dialog open={styleDialogOpen} onOpenChange={setStyleDialogOpen}>
          <DialogContent className="sm:max-w-[650px] max-h-[80vh] overflow-y-auto bg-[#1c1c24] border border-gray-700 fixed inset-0 z-50">
            {/* 전체 배경을 어둡게 처리하는 오버레이 */}
            <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-40" />
            
            <DialogHeader className="relative z-50">
              <DialogTitle className="text-xl font-heading font-bold text-white text-center">스타일 선택</DialogTitle>
              <DialogDescription className="text-center text-gray-400">
                원하는 스타일을 선택하세요
              </DialogDescription>
            </DialogHeader>
            
            <div className="grid grid-cols-2 gap-4 mt-4 relative z-50">
              {filteredStyles.map((style) => (
                <div 
                  key={style.value}
                  className={`cursor-pointer rounded-lg overflow-hidden border transition-all
                    ${selectedStyle === style.value 
                      ? 'border-[#ff2d55] ring-2 ring-[#ff2d55]' 
                      : 'border-gray-700 hover:border-gray-500'
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
                    <div className={`absolute inset-0 ${selectedStyle === style.value ? 'bg-[#ff2d55]/20' : ''}`}>
                      {selectedStyle === style.value && (
                        <div className="absolute top-2 right-2 bg-[#ff2d55] text-white rounded-full w-6 h-6 flex items-center justify-center shadow-md">
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="bg-[#272730] text-center py-3 px-2">
                    <span className={`text-sm font-medium ${selectedStyle === style.value ? 'text-[#ff2d55]' : 'text-white'}`}>
                      {style.label}
                    </span>
                  </div>
                </div>
              ))}
            </div>
            
            <DialogFooter className="sm:justify-center relative z-50">
              <Button 
                className="bg-[#ff2d55] hover:bg-[#ff2d55]/90 text-white"
                onClick={() => setStyleDialogOpen(false)}
              >
                확인
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
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
        
        {/* 종횡비 선택 */}
        <div className="mb-5">
          <label className="block text-gray-300 text-sm mb-2">종횡비</label>
          <div className="grid grid-cols-3 gap-2">
            <div 
              className={`cursor-pointer rounded-lg border overflow-hidden transition-colors ${
                selectedAspectRatio === "1:1" ? "bg-[#ff2d55] border-[#ff2d55]" : "bg-[#272730] border-gray-700 hover:border-gray-500"
              }`}
              onClick={() => setSelectedAspectRatio("1:1")}
            >
              <div className="aspect-square flex items-center justify-center">
                <span className={`text-xs font-medium ${selectedAspectRatio === "1:1" ? "text-white" : "text-gray-300"}`}>1:1</span>
              </div>
            </div>
            <div 
              className={`cursor-pointer rounded-lg border overflow-hidden transition-colors ${
                selectedAspectRatio === "2:3" ? "bg-[#ff2d55] border-[#ff2d55]" : "bg-[#272730] border-gray-700 hover:border-gray-500"
              }`}
              onClick={() => setSelectedAspectRatio("2:3")}
            >
              <div className="aspect-[2/3] flex items-center justify-center">
                <span className={`text-xs font-medium ${selectedAspectRatio === "2:3" ? "text-white" : "text-gray-300"}`}>2:3</span>
              </div>
            </div>
            <div 
              className={`cursor-pointer rounded-lg border overflow-hidden transition-colors ${
                selectedAspectRatio === "3:2" ? "bg-[#ff2d55] border-[#ff2d55]" : "bg-[#272730] border-gray-700 hover:border-gray-500"
              }`}
              onClick={() => setSelectedAspectRatio("3:2")}
            >
              <div className="aspect-[3/2] flex items-center justify-center">
                <span className={`text-xs font-medium ${selectedAspectRatio === "3:2" ? "text-white" : "text-gray-300"}`}>3:2</span>
              </div>
            </div>
          </div>

        </div>

        {/* 만들기 버튼 */}
        <Button
          type="button"
          className={`w-full flex items-center justify-center py-3 px-4 rounded-lg transition-all ${
            previewUrl
              ? 'bg-[#ff2d55] hover:bg-[#ff2d55]/90 text-white cursor-pointer' 
              : 'bg-gray-700 text-gray-400 cursor-not-allowed'
          }`}
          onClick={handleTransformImage}
          disabled={isTransforming || !previewUrl}
        >
{isTransforming ? (
            <div className="flex items-center">
              <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              <span>생성 중...</span>
            </div>
          ) : (
            <div className="flex items-center">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-2">
                <path d="M12 2v20M2 12h20"/>
              </svg>
              <span>만들기</span>
            </div>
          )}
        </Button>
      </div>

      {/* Generated Art Section */}
      {transformedImage && (
        <div className="mt-8">
          <div className="flex items-center mb-3">
            <h3 className="font-heading font-semibold text-lg">당신의 마법 같은 추억</h3>
            <div className="ml-2 bg-primary-light rounded-full px-2 py-0.5">
              <span className="text-xs font-medium text-primary-dark">새로운</span>
            </div>
          </div>

          <div className="bg-white rounded-xl p-5 shadow-soft border border-neutral-light">
            <div className="mb-5">
              <div className="rounded-lg overflow-hidden shadow-sm">
                <img 
                  src={transformedImage.transformedUrl} 
                  alt="Transformed Art" 
                  className="w-full object-cover"
                />
              </div>
              <div className="text-center mt-3">
                <h4 className="font-medium text-neutral-darkest">{transformedImage.title}</h4>
                <p className="text-sm text-neutral-dark mt-1">
                  <span className="inline-block bg-neutral-lightest rounded-full px-2 py-0.5 text-xs mr-2">
                    {transformedImage.style}
                  </span>
                  생성 날짜: {transformedImage.createdAt}
                </p>
              </div>
            </div>

            <div className="flex justify-center">
              <Button
                className="bg-primary hover:bg-primary-dark text-white font-medium py-2.5 px-4 rounded-lg transition-colors w-full max-w-xs"
                onClick={() => handleDownload(transformedImage.id)}
              >
                <Download className="mr-2 h-4 w-4" />
                <span>사진으로 저장하기</span>
              </Button>
            </div>
          </div>
        </div>
      )}
      
      {/* A/B Test Comparison Section */}
      {showAbTest && activeAbTest && activeAbTest.variants && activeAbTest.variants.length >= 2 && (
        <ABTestComparer
          testId={activeAbTest.testId}
          variants={activeAbTest.variants}
          originalImage={transformedImage?.originalUrl || ''}
          transformedImages={abTestImages}
          onVoteComplete={() => setShowAbTest(false)}
        />
      )}

      {/* Previous Art */}
      <div className="mt-8">
        <div className="flex justify-between items-center mb-4">
          <h3 className="font-heading font-semibold text-lg">내 추억 컬렉션</h3>
          {imageList && imageList.length > 0 && (
            <span className="text-xs bg-neutral-lightest rounded-full px-3 py-1 text-neutral-dark">
              {imageList.length}개의 추억
            </span>
          )}
        </div>

        {isLoadingImages ? (
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-neutral-lightest h-52 rounded-xl animate-pulse"></div>
            <div className="bg-neutral-lightest h-52 rounded-xl animate-pulse"></div>
          </div>
        ) : imageList && imageList.length > 0 ? (
          <div className="grid grid-cols-2 gap-4">
            {imageList.map((image: TransformedImage) => (
              <div 
                key={image.id}
                className="bg-white rounded-xl overflow-hidden shadow-soft border border-neutral-light hover:shadow-md transition-shadow"
              >
                <div className="relative">
                  <img 
                    src={image.transformedUrl} 
                    alt={image.title} 
                    className="w-full h-36 object-cover"
                  />
                  <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/50 to-transparent p-2">
                    <p className="text-white text-xs font-medium">{image.style} 스타일</p>
                  </div>
                </div>
                <div className="p-3">
                  <p className="font-medium text-sm truncate">{image.title}</p>
                  <p className="text-xs text-neutral-dark mb-2">{image.createdAt}</p>
                  <div className="flex space-x-2">
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
  );
}
