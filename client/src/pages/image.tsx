import { useState, useEffect, useMemo } from "react";
import { useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { FileUpload } from "@/components/ui/file-upload";
import { transformImage, downloadMedia, shareMedia, getActiveAbTest } from "@/lib/api";
import { queryClient } from "@/lib/queryClient";
import { PaintbrushVertical, Download, Share2, Eye, ChevronRight, X, CheckCircle2, RefreshCw } from "lucide-react";
import ABTestComparer from "@/components/ABTestComparer";
import { Dialog, DialogContent, DialogTitle, DialogHeader, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { useTheme } from "@/hooks/use-theme";

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
  
  // 이미지 갤러리 팝업용 상태 추가
  const [viewImageDialog, setViewImageDialog] = useState(false);
  const [selectedGalleryImage, setSelectedGalleryImage] = useState<TransformedImage | null>(null);
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

  // 최근 이미지 10개 목록 조회 기능
  const { data: recentImages, isLoading: isLoadingImages } = useQuery({
    queryKey: ["/api/image/recent"], 
    queryFn: async () => {
      console.log("최근 이미지 10개 조회 시작...");
      
      try {
        const response = await fetch("/api/image/recent?limit=10&t=" + new Date().getTime(), {
          headers: {
            "Cache-Control": "no-cache, no-store, must-revalidate",
            "Pragma": "no-cache",
            "Expires": "0"
          },
          cache: "no-store" // 캐시 비활성화 추가
        });
        
        if (!response.ok) {
          throw new Error(`이미지 목록을 불러오는 데 실패했습니다 (${response.status})`);
        }
        
        const data = await response.json();
        console.log(`최근 이미지 ${data.length}개 로드 완료`);
        return data;
      } catch (error) {
        console.error("최근 이미지 조회 중 오류:", error);
        throw error;
      }
    },
    staleTime: 0, // 캐시 시간 0으로 설정하여 항상 최신 데이터 요청
    refetchOnMount: true,
    refetchOnWindowFocus: true, // 브라우저 포커스 시 갱신 활성화
    refetchOnReconnect: true, // 재연결 시 갱신 활성화
    refetchInterval: 60000, // 1분마다 자동 갱신
  });

  // 이미지 ID가 URL에 있는 경우 해당 이미지 조회 
  useEffect(() => {
    if (imageId) {
      // 특정 이미지 ID로 단일 이미지 조회 (컬렉션 전체를 가져오지 않고)
      fetch(`/api/image/${imageId}`)
        .then(res => {
          if (res.ok) return res.json();
          throw new Error("이미지를 찾을 수 없습니다");
        })
        .then(data => {
          if (data) setTransformedImage(data);
        })
        .catch(err => {
          console.error("이미지 조회 실패:", err);
          toast({
            title: "이미지 조회 실패",
            description: "요청하신 이미지를 불러올 수 없습니다",
            variant: "destructive"
          });
        });
    }
  }, [imageId, toast]);
  
  // 필요한 초기화를 위한 함수
  const refetch = () => {
    console.log("최근 이미지 목록 새로고침 시도...");
    queryClient.invalidateQueries({ queryKey: ["/api/image/recent"] });
  };

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
      
      // 이미지 삭제 후 캐시 초기화
      await queryClient.invalidateQueries({ queryKey: ["/api/image"] });
      
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
    setSelectedGalleryImage(image);
    setViewImageDialog(true);
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
      {/* 전체 페이지 로딩 오버레이 (이미지 생성 중에만 표시) */}
      {isTransforming && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center">
          <div className="bg-white rounded-xl p-6 shadow-lg max-w-md">
            <div className="flex flex-col items-center">
              <RefreshCw className="h-10 w-10 text-primary animate-spin mb-4" />
              <h3 className="text-lg font-bold mb-2">이미지 생성 중...</h3>
              <p className="text-neutral-dark text-center">
                AI가 이미지를 생성하고 있습니다. 잠시만 기다려주세요.
                이 과정은 약 15-30초 정도 소요됩니다.
              </p>
            </div>
          </div>
        </div>
      )}
      
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
      <div className="bg-card rounded-xl p-5 mb-6 shadow-md">
        <div className="flex justify-between items-center mb-5">
          <h3 className="font-heading font-semibold text-card-foreground text-lg">카테고리</h3>
        </div>
        
        <div className="grid grid-cols-3 gap-2">
          {Array.isArray(categories) && categories.length > 0 ? (
            // 카테고리가 로드됐을 때
            categories.map((category) => (
              <div 
                key={category.categoryId}
                className={`cursor-pointer rounded-lg border overflow-hidden transition-colors
                  ${selectedCategory === category.categoryId 
                    ? 'ring-2 ring-primary border-primary' 
                    : 'bg-muted/80 border-border hover:border-border/80'
                  }`}
                onClick={() => setSelectedCategory(category.categoryId)}
              >
                <div className="flex items-center justify-between px-4 py-3">
                  <span className={`font-medium ${selectedCategory === category.categoryId ? 'text-primary' : 'text-muted-foreground'}`}>
                    {category.name}
                  </span>
                  {selectedCategory === category.categoryId && (
                    <CheckCircle2 className="h-5 w-5 text-primary" />
                  )}
                </div>
              </div>
            ))
          ) : (
            // 카테고리가 없거나 로딩 중일 때 기본 카테고리 3개 표시
            <>
              <div className="cursor-pointer rounded-lg border overflow-hidden transition-colors bg-muted/80 border-border hover:border-border/80">
                <div className="flex items-center justify-between px-4 py-3">
                  <span className="font-medium text-muted-foreground">임신사진</span>
                </div>
              </div>
              <div className="cursor-pointer rounded-lg border overflow-hidden transition-colors ring-2 ring-primary border-primary">
                <div className="flex items-center justify-between px-4 py-3">
                  <span className="font-medium text-primary">만삭사진</span>
                  <CheckCircle2 className="h-5 w-5 text-primary" />
                </div>
              </div>
              <div className="cursor-pointer rounded-lg border overflow-hidden transition-colors bg-muted/80 border-border hover:border-border/80">
                <div className="flex items-center justify-between px-4 py-3">
                  <span className="font-medium text-muted-foreground">가족사진</span>
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {/* 스타일 선택 섹션 */}
      <div className="bg-card rounded-xl p-5 mb-6 shadow-md">
        <div className="flex justify-between items-center mb-5">
          <h3 className="font-heading font-semibold text-card-foreground text-lg">스타일</h3>
        </div>

        {/* 스타일 선택 버튼 */}
        <div 
          className="cursor-pointer rounded-lg border border-border overflow-hidden flex items-center justify-between px-4 py-3 hover:border-border/80 transition-all bg-muted/80"
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
                <span className="text-foreground font-medium">
                  {filteredStyles.find(style => style.value === selectedStyle)?.label}
                </span>
              </>
            ) : (
              <span className="text-muted-foreground">스타일을 선택해주세요</span>
            )}
          </div>
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </div>

        {/* 스타일 선택 다이얼로그 */}
        <Dialog open={styleDialogOpen} onOpenChange={setStyleDialogOpen}>
          <DialogContent className="sm:max-w-[650px] max-h-[85vh] overflow-y-auto bg-card border-border shadow-xl">
            <DialogHeader>
              <DialogTitle className="text-xl font-heading font-bold text-card-foreground text-center">스타일 선택</DialogTitle>
              <DialogDescription className="text-center text-muted-foreground">
                원하는 스타일을 선택하세요
              </DialogDescription>
            </DialogHeader>
            
            <div className="grid grid-cols-2 gap-4 mt-4">
              {filteredStyles.map((style) => (
                <div 
                  key={style.value}
                  className={`cursor-pointer rounded-lg overflow-hidden border transition-all
                    ${selectedStyle === style.value 
                      ? 'border-primary ring-2 ring-primary' 
                      : 'border-border hover:border-border/80'
                    }`}
                  onClick={() => {
                    handleStyleSelected(style.value);
                    setStyleDialogOpen(false);
                  }}
                >
                  <div className="relative">
                    <div className="aspect-square w-full overflow-hidden"> {/* 이미지 컨테이너를 정사각형으로 설정 */}
                      <img 
                        src={style.thumbnailUrl} 
                        alt={style.label} 
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div className={`absolute inset-0 ${selectedStyle === style.value ? 'bg-primary/20' : ''}`}>
                      {selectedStyle === style.value && (
                        <div className="absolute top-2 right-2 bg-primary text-primary-foreground rounded-full w-6 h-6 flex items-center justify-center shadow-md">
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="bg-muted text-center py-3 px-2">
                    <span className={`text-sm font-medium ${selectedStyle === style.value ? 'text-primary' : 'text-foreground'}`}>
                      {style.label}
                    </span>
                  </div>
                </div>
              ))}
            </div>
            
            <DialogFooter className="sm:justify-center mt-6">
              <Button 
                className="bg-primary hover:bg-primary/90 text-primary-foreground"
                onClick={() => setStyleDialogOpen(false)}
              >
                확인
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Image Upload Section */}
      <div className="bg-card rounded-xl p-5 mb-6 shadow-md">
        <div className="text-left mb-3">
          <h3 className="font-heading font-semibold text-card-foreground text-lg">이미지 업로드</h3>
        </div>
        
        {/* 이미지 업로드 영역 */}
        <div className="mb-4 relative">
          <label htmlFor="file-upload" className="block cursor-pointer">
            {!previewUrl ? (
              // 이미지 업로드 전 상태
              <div className="border border-border h-48 rounded-lg flex flex-col items-center justify-center text-muted-foreground bg-muted/50">
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mb-2">
                  <rect width="18" height="18" x="3" y="3" rx="2" ry="2" />
                  <circle cx="9" cy="9" r="2" />
                  <path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21" />
                </svg>
                <span className="text-sm">이미지를 업로드하려면 클릭하세요</span>
                <span className="text-xs text-muted-foreground/70 mt-2">최대 15MB, 4096 × 4096픽셀의 JPEG, PNG 또는 WEBP 형식을 허용합니다.</span>
              </div>
            ) : (
              // 이미지 업로드 후 미리보기
              <div className="flex justify-center items-center h-48 border border-border rounded-lg overflow-hidden bg-background/50">
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
        
        {/* 종횡비 선택 - 만삭사진 카테고리가 아닐 때만 표시 */}
        {selectedCategory !== "mansak_img" && (
          <div className="mb-5">
            <label className="block text-card-foreground text-sm mb-2">종횡비</label>
            <div className="grid grid-cols-3 gap-2">
              <div 
                className={`cursor-pointer rounded-lg border overflow-hidden transition-colors ${
                  selectedAspectRatio === "1:1" 
                    ? "bg-primary border-primary" 
                    : "bg-muted border-border hover:border-border/80"
                }`}
                onClick={() => setSelectedAspectRatio("1:1")}
              >
                <div className="aspect-square flex items-center justify-center">
                  <span className={`text-xs font-medium ${
                    selectedAspectRatio === "1:1" 
                      ? "text-primary-foreground" 
                      : "text-muted-foreground"
                  }`}>1:1</span>
                </div>
              </div>
              <div 
                className={`cursor-pointer rounded-lg border overflow-hidden transition-colors ${
                  selectedAspectRatio === "2:3" 
                    ? "bg-primary border-primary" 
                    : "bg-muted border-border hover:border-border/80"
                }`}
                onClick={() => setSelectedAspectRatio("2:3")}
              >
                <div className="aspect-[2/3] flex items-center justify-center">
                  <span className={`text-xs font-medium ${
                    selectedAspectRatio === "2:3" 
                      ? "text-primary-foreground" 
                      : "text-muted-foreground"
                  }`}>2:3</span>
                </div>
              </div>
              <div 
                className={`cursor-pointer rounded-lg border overflow-hidden transition-colors ${
                  selectedAspectRatio === "9:16" 
                    ? "bg-primary border-primary" 
                    : "bg-muted border-border hover:border-border/80"
                }`}
                onClick={() => setSelectedAspectRatio("9:16")}
              >
                <div className="aspect-[9/16] flex items-center justify-center">
                  <span className={`text-xs font-medium ${
                    selectedAspectRatio === "9:16" 
                      ? "text-primary-foreground" 
                      : "text-muted-foreground"
                  }`}>9:16</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 만들기 버튼 */}
        <Button
          type="button"
          className={`w-full flex items-center justify-center py-3 px-4 rounded-lg transition-all ${
            previewUrl
              ? 'bg-primary hover:bg-primary/90 text-primary-foreground cursor-pointer' 
              : 'bg-muted text-muted-foreground cursor-not-allowed'
          }`}
          onClick={handleTransformImage}
          disabled={isTransforming || !previewUrl}
        >
{isTransforming ? (
            <div className="flex items-center">
              <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-primary-foreground" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
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
            <h3 className="font-heading font-semibold text-foreground text-lg">당신의 마법 같은 추억</h3>
            <div className="ml-2 bg-accent/20 rounded-full px-2 py-0.5">
              <span className="text-xs font-medium text-accent-foreground">새로운</span>
            </div>
          </div>

          <div className="bg-card rounded-xl p-5 shadow-md border border-border">
            <div className="mb-5">
              <div className="rounded-lg overflow-hidden shadow-sm">
                <img 
                  src={transformedImage.transformedUrl} 
                  alt="Transformed Art" 
                  className="w-full object-cover"
                />
              </div>
              <div className="text-center mt-3">
                <h4 className="font-medium text-card-foreground">{transformedImage.title}</h4>
                <p className="text-sm text-muted-foreground mt-1">
                  <span className="inline-block bg-muted rounded-full px-2 py-0.5 text-xs mr-2">
                    {transformedImage.style}
                  </span>
                  생성 날짜: {transformedImage.createdAt}
                </p>
              </div>
            </div>

            <div className="flex justify-center">
              <Button
                className="bg-primary hover:bg-primary/90 text-primary-foreground font-medium py-2.5 px-4 rounded-lg transition-colors w-full max-w-xs"
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

      {/* 최근 추억 10개만 표시 */}
      <div className="mt-8">
        <div className="flex justify-between items-center mb-4">
          <h3 className="font-heading font-semibold text-foreground text-lg">최근 추억 (10개)</h3>
        </div>

        {/* 이미지 목록 조회 및 표시 */}
        <div className="relative">
          {isTransforming ? (
            // 변환 중일 때 로딩 상태 표시
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-muted h-52 rounded-xl animate-pulse"></div>
              <div className="bg-muted h-52 rounded-xl animate-pulse"></div>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-4">
              {/* 현재 변환된 이미지가 있으면 가장 먼저 표시 */}
              {transformedImage && (
                <div 
                  key="latest"
                  className="bg-card rounded-xl overflow-hidden shadow-md border border-border hover:shadow-lg transition-shadow"
                >
                  <div className="relative">
                    <div className="aspect-square w-full overflow-hidden">
                      <img 
                        src={transformedImage.transformedUrl} 
                        alt={transformedImage.title} 
                        className="w-full h-full object-cover"
                        loading="lazy"
                        onError={(e) => {
                          console.error(`이미지 로드 실패: ${transformedImage.transformedUrl}`);
                          e.currentTarget.src = "https://placehold.co/400x400/F0F0F0/AAA?text=이미지+로드+실패";
                        }}
                      />
                    </div>
                    <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/50 to-transparent p-2">
                      <p className="text-white text-xs font-medium">{transformedImage.style} 스타일</p>
                    </div>
                    <div className="absolute top-2 right-2 bg-primary text-primary-foreground text-xs rounded-full px-2 py-0.5">
                      최신
                    </div>
                  </div>
                  <div className="p-3">
                    <p className="font-medium text-sm truncate text-card-foreground">{transformedImage.title}</p>
                    <p className="text-xs text-muted-foreground mb-2">
                      {typeof transformedImage.createdAt === 'string' 
                        ? new Date(transformedImage.createdAt).toLocaleDateString('ko-KR')
                        : '방금 전'}
                    </p>
                    <div className="flex space-x-2">
                      <Button
                        size="sm"
                        className="flex-1 text-xs bg-primary hover:bg-primary/90 text-primary-foreground font-medium shadow-sm"
                        onClick={() => handleDownload(transformedImage.id)}
                      >
                        <Download className="mr-1 h-3 w-3" /> 저장
                      </Button>
                    </div>
                  </div>
                </div>
              )}

              {/* 서버에서 가져온 최근 이미지 목록 */}
              {recentImages && recentImages.length > 0 && 
                recentImages
                  // 현재 표시된 이미지와 겹치지 않도록 필터링
                  .filter((img: TransformedImage) => !transformedImage || img.id !== transformedImage.id)
                  // 최대 9개만 표시 (현재 변환 이미지 1개 + 목록에서 9개 = 10개)
                  .slice(0, transformedImage ? 9 : 10)
                  .map((image: TransformedImage) => (
                    <div 
                      key={image.id}
                      className="bg-card rounded-xl overflow-hidden shadow-md border border-border hover:shadow-lg transition-shadow"
                    >
                      <div className="relative">
                        <div className="aspect-square w-full overflow-hidden">
                          <img 
                            src={image.transformedUrl} 
                            alt={image.title} 
                            className="w-full h-full object-cover"
                            loading="lazy"
                            onError={(e) => {
                              console.error(`이미지 로드 실패:`, image);
                              e.currentTarget.src = "https://placehold.co/400x400/F0F0F0/AAA?text=이미지+로드+실패";
                            }}
                          />
                        </div>
                        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/50 to-transparent p-2">
                          <p className="text-white text-xs font-medium">{image.style} 스타일</p>
                        </div>
                      </div>
                      <div className="p-3">
                        <p className="font-medium text-sm truncate text-card-foreground">{image.title}</p>
                        <p className="text-xs text-muted-foreground mb-2">
                          {typeof image.createdAt === 'string' 
                            ? new Date(image.createdAt).toLocaleDateString('ko-KR')
                            : '날짜 없음'}
                        </p>
                        <div className="flex space-x-2">
                          <Button
                            size="sm"
                            className="flex-1 text-xs bg-muted hover:bg-muted/80 text-muted-foreground font-medium shadow-sm"
                            onClick={() => handleViewImage(image)}
                          >
                            <Eye className="mr-1 h-3 w-3" /> 보기
                          </Button>
                          <Button
                            size="sm"
                            className="flex-1 text-xs bg-primary hover:bg-primary/90 text-primary-foreground font-medium shadow-sm"
                            onClick={() => handleDownload(image.id)}
                          >
                            <Download className="mr-1 h-3 w-3" /> 저장
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))
              }

              {/* 데이터는 로드됐지만 이미지가 없는 경우 */}
              {recentImages && recentImages.length === 0 && !transformedImage && (
                <div className="col-span-2 text-center py-8 bg-muted rounded-xl border border-dashed border-border">
                  <PaintbrushVertical className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                  <p className="text-card-foreground font-medium">아직 추억이 없습니다</p>
                  <p className="text-sm mt-1 mb-4 text-muted-foreground">첫 번째 사진을 변환하여 추억 컬렉션을 시작하세요</p>
                </div>
              )}

              {/* 에러 발생 또는 로딩 중인 경우 */}
              {isLoadingImages && !transformedImage && (
                <div className="col-span-2 text-center py-8 bg-muted rounded-xl border border-dashed border-border">
                  <RefreshCw className="h-8 w-8 mx-auto mb-2 text-muted-foreground animate-spin" />
                  <p className="text-card-foreground font-medium">이미지 데이터 로딩 중...</p>
                  <p className="text-sm mt-1 mb-4 text-muted-foreground">잠시만 기다려주세요</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
      
      {/* 이미지 상세 보기 다이얼로그 */}
      <Dialog open={viewImageDialog} onOpenChange={setViewImageDialog}>
        <DialogContent className="max-w-4xl bg-card border-border">
          <DialogHeader>
            <DialogTitle className="text-card-foreground">{selectedGalleryImage?.title}</DialogTitle>
            <DialogDescription className="text-muted-foreground">
              {selectedGalleryImage?.createdAt && 
                new Date(selectedGalleryImage.createdAt).toLocaleDateString('ko-KR', {
                  year: 'numeric',
                  month: '2-digit',
                  day: '2-digit',
                  hour: '2-digit',
                  minute: '2-digit'
                })
              } 생성됨
            </DialogDescription>
          </DialogHeader>
          
          <div className="relative aspect-video bg-muted rounded-md overflow-hidden">
            <img 
              src={selectedGalleryImage?.transformedUrl} 
              alt={selectedGalleryImage?.title}
              className="w-full h-full object-contain"
              onError={(e) => {
                console.error("상세 이미지 로드 실패:", selectedGalleryImage);
                e.currentTarget.src = "https://placehold.co/400x400/F0F0F0/AAA?text=이미지+로드+실패";
              }}
            />
          </div>
          
          <DialogFooter>
            <div className="flex items-center gap-2 w-full justify-end">
              <Button 
                className="bg-muted hover:bg-muted/80 text-muted-foreground font-medium shadow-sm"
                onClick={() => {
                  if (selectedGalleryImage) {
                    handleDownload(selectedGalleryImage.id);
                  }
                }}
              >
                <Download className="mr-2 h-4 w-4" /> 다운로드
              </Button>
              
              <Button
                className="bg-primary hover:bg-primary/90 text-primary-foreground font-medium shadow-sm"
                onClick={() => {
                  if (selectedGalleryImage) {
                    handleShare(selectedGalleryImage.id);
                  }
                }}
              >
                <Share2 className="mr-2 h-4 w-4" /> 공유하기
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
