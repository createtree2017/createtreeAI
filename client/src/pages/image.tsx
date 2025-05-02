import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { FileUpload } from "@/components/ui/file-upload";
import { transformImage, getImageList, downloadMedia, shareMedia, getActiveAbTest } from "@/lib/api";
import { queryClient } from "@/lib/queryClient";
import { PaintbrushVertical, Download, Share2, Eye } from "lucide-react";
import ABTestComparer from "@/components/ABTestComparer";

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
}

export default function Image() {
  const [location, setLocation] = useLocation();
  const { toast } = useToast();
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [selectedStyle, setSelectedStyle] = useState<string | null>(null);
  const [transformedImage, setTransformedImage] = useState<TransformedImage | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  
  // A/B Testing states
  const [activeAbTest, setActiveAbTest] = useState<any>(null);
  const [abTestImages, setAbTestImages] = useState<Record<string, string>>({});
  const [showAbTest, setShowAbTest] = useState<boolean>(false);

  // Extract image ID from URL if any
  const query = new URLSearchParams(location.split("?")[1] || "");
  const imageId = query.get("id");

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

  // Fetch art styles/concepts from the database (using public endpoints)
  const { data: conceptCategories = [] } = useQuery({
    queryKey: ["/api/concept-categories"],
  });

  const { data: concepts = [] } = useQuery({
    queryKey: ["/api/concepts"],
  });
  
  // Use only database-defined styles, no hardcoded styles
  const defaultArtStyles: ImageStyle[] = [];
  
  // Define expected concept shape
  interface Concept {
    id: number;
    conceptId: string;
    title: string;
    description?: string;
    promptTemplate: string;
    thumbnailUrl?: string;
    categoryId?: string;
    isActive: boolean;
    isFeatured: boolean;
    order: number;
    createdAt: string;
    updatedAt: string;
  }
  
  // Create styles from database concepts
  const conceptStyles: ImageStyle[] = Array.isArray(concepts) 
    ? concepts.map((concept: Concept) => ({
        value: concept.conceptId,
        label: concept.title,
        thumbnailUrl: concept.thumbnailUrl || `https://placehold.co/300x200/F0F0F0/333?text=${encodeURIComponent(concept.title)}`,
        categoryId: concept.categoryId,
        description: concept.description
      }))
    : [];
  
  // Combine both arrays, with database concepts taking precedence (overwriting hardcoded if same ID)
  const artStyles: ImageStyle[] = [
    ...defaultArtStyles,
    ...conceptStyles
  ];

  return (
    <div className="p-5 animate-fadeIn">
      <div className="text-center mb-6">
        <h2 className="font-heading font-bold text-2xl mb-2">마터니티 아트 매직</h2>
        <p className="text-neutral-dark">임신 및 아기 사진을 아름다운 추억으로 변환해보세요</p>
      </div>

      {/* Preview Styles Section (NEW) */}
      <div className="bg-white rounded-xl p-5 shadow-soft border border-neutral-light mb-6">
        <div className="text-center mb-5">
          <h3 className="font-heading font-semibold text-lg mb-2">이 마법같은 스타일 중에서 선택하세요!</h3>
          <p className="text-neutral-dark mb-4 max-w-md mx-auto">
            특별한 순간을 어떻게 변환할 수 있는지 확인해보세요. 마음에 드는 스타일을 클릭하세요.
          </p>
        </div>

        <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
          {artStyles.map((style) => (
            <div 
              key={style.value}
              className={`cursor-pointer rounded-xl overflow-hidden transition-all duration-200 
                ${selectedStyle === style.value 
                  ? 'ring-4 ring-primary shadow-lg transform scale-105 z-10' 
                  : 'shadow-sm hover:shadow-md'
                }`}
              onClick={() => handleStyleSelected(style.value)}
            >
              <div className="relative">
                <img 
                  src={style.thumbnailUrl} 
                  alt={style.label} 
                  className="w-full h-32 object-cover"
                />
                <div className={`absolute inset-0 flex items-center justify-center ${
                  selectedStyle === style.value ? 'bg-black/10' : 'bg-black/30'
                }`}>
                  <span className={`px-3 py-1 rounded-full text-sm font-medium transition-all ${
                    selectedStyle === style.value 
                    ? 'bg-primary text-white font-bold shadow-md scale-110' 
                    : 'bg-white/80 text-primary-dark'
                  }`}>
                    {style.label}
                    {selectedStyle === style.value && ' ✓'}
                  </span>
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
      </div>

      {/* Image Upload Section */}
      <div className="bg-white rounded-xl p-5 shadow-soft border border-neutral-light">
        <div className="text-center mb-5">
          <div className="mb-4 text-primary-dark">
            <PaintbrushVertical className="h-10 w-10 mx-auto mb-2" />
            <h3 className="font-heading font-semibold text-lg">아름다운 추억 만들기</h3>
          </div>
          <p className="text-neutral-dark mb-4 max-w-md mx-auto">
            임신 사진, 초음파 이미지, 아기 사진을 영원히 간직할 수 있는 매력적인 예술 작품으로 변환해보세요.
          </p>
        </div>

        <div className="mb-6">
          <label className="block font-medium mb-3 text-neutral-darkest">사진 업로드하기</label>
          
          {/* Image preview */}
          {previewUrl && (
            <div className="mb-4 rounded-lg overflow-hidden border border-neutral-light">
              <img 
                src={previewUrl} 
                alt="선택한 이미지 미리보기" 
                className="w-full max-h-64 object-contain"
              />
              <div className="bg-neutral-lightest p-2 text-xs text-neutral-dark">
                <p className="font-medium">선택된 파일: {selectedFile?.name}</p>
              </div>
            </div>
          )}
          
          <FileUpload 
            onFileSelect={handleFileSelected} 
            accept="image/*"
            maxSize={10 * 1024 * 1024} // 10MB
          />
          <p className="text-xs text-neutral-dark mt-2">
            지원: 초음파 이미지, 임신 사진, 아기 사진, 가족 순간들
          </p>
        </div>

        {/* Transform Button */}
        {selectedFile && (
          <div id="transform-section">
            <div className="mb-5">
              <label className="block font-medium mb-3 text-neutral-darkest">선택한 스타일</label>
              {selectedStyle ? (
                <div className="flex items-center p-4 bg-primary/5 border border-primary/20 rounded-lg relative overflow-hidden">
                  <div className="absolute top-0 left-0 bg-primary text-white text-xs py-1 px-3 rounded-br-lg font-semibold">
                    스타일 선택됨 ✓
                  </div>
                  <div className="w-20 h-20 rounded-lg overflow-hidden mr-4 shadow-md border-2 border-primary">
                    <img 
                      src={artStyles.find(s => s.value === selectedStyle)?.thumbnailUrl || ''} 
                      alt={artStyles.find(s => s.value === selectedStyle)?.label || ''}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div className="mt-4">
                    <p className="font-bold text-lg text-primary-dark">
                      {artStyles.find(s => s.value === selectedStyle)?.label} 
                      <span className="inline-block ml-2 bg-primary text-white rounded-full w-5 h-5 text-xs flex items-center justify-center">✓</span>
                    </p>
                    <p className="text-sm text-neutral-dark mt-1">
                      이 스타일을 적용하여 이미지를 변환합니다. 
                      <span className="text-primary font-medium">다른 스타일로 변경하려면 위 옵션 중에서 다시 선택하세요.</span>
                    </p>
                  </div>
                </div>
              ) : (
                <div className="p-5 bg-yellow-50 border border-yellow-200 rounded-lg text-neutral-dark text-center">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 mx-auto mb-3 text-yellow-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <p className="font-medium">스타일을 선택해주세요</p>
                  <p className="text-sm mt-1">위의 스타일 옵션 중에서 하나를 선택하세요</p>
                </div>
              )}
            </div>

            <Button
              type="button"
              className={`w-full text-white font-medium py-3 px-4 rounded-lg transition-all duration-300 ${
                selectedStyle 
                  ? 'bg-primary hover:bg-primary-dark transform hover:scale-105 shadow-md' 
                  : 'bg-neutral-light cursor-not-allowed'
              }`}
              onClick={handleTransformImage}
              disabled={isTransforming || !selectedStyle}
            >
              {selectedStyle ? (
                <>
                  <div className="flex items-center justify-center">
                    <PaintbrushVertical className="mr-2 h-5 w-5" />
                    <span className="text-lg">
                      {isTransforming ? (
                        <div className="flex items-center">
                          <div className="animate-spin mr-2 h-4 w-4 border-2 border-white border-t-transparent rounded-full"></div>
                          스타일 변환 중...
                        </div>
                      ) : (
                        `"${artStyles.find(s => s.value === selectedStyle)?.label}" 스타일로 변환하기`
                      )}
                    </span>
                  </div>
                </>
              ) : (
                <>
                  <PaintbrushVertical className="mr-2 h-4 w-4" />
                  스타일을 먼저 선택해주세요
                </>
              )}
            </Button>
          </div>
        )}
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
