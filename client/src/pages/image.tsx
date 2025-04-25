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

  // Fetch image list
  const { data: imageList, isLoading: isLoadingImages } = useQuery({
    queryKey: ["/api/image"],
    queryFn: getImageList,
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

  // Transform image mutation
  const { mutate: transformImageMutation, isPending: isTransforming } = useMutation({
    mutationFn: (data: FormData) => transformImage(data),
    onSuccess: (data) => {
      setTransformedImage(data);
      queryClient.invalidateQueries({ queryKey: ["/api/image"] });
      
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
            
            const variantResult = await transformImage(formData);
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
    setSelectedStyle(style);
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

    transformImageMutation(formData);
  };

  const handleDownload = (id: number) => {
    downloadMedia(id, "image");
  };

  const handleShare = async (id: number) => {
    try {
      const shareData = await shareMedia(id, "image");
      toast({
        title: "Share link created",
        description: "Ready to share your artwork!",
      });
    } catch (error) {
      toast({
        title: "Error creating share link",
        description: "Please try again later",
        variant: "destructive",
      });
    }
  };

  const handleViewImage = (image: TransformedImage) => {
    setTransformedImage(image);
  };

  // Art styles data - optimized for maternity/baby photos
  const artStyles: ImageStyle[] = [
    { 
      value: "ghibli", 
      label: "Studio Ghibli", 
      thumbnailUrl: "https://placehold.co/300x200/FFD5AA/333?text=Ghibli+Style" 
    },
    { 
      value: "disney", 
      label: "Disney Animation", 
      thumbnailUrl: "https://placehold.co/300x200/B6E1FF/333?text=Disney+Style" 
    },
    { 
      value: "korean_webtoon", 
      label: "Korean Webtoon", 
      thumbnailUrl: "https://placehold.co/300x200/FFD6E7/333?text=Korean+Webtoon" 
    },
    { 
      value: "watercolor", 
      label: "Soft Watercolor", 
      thumbnailUrl: "https://placehold.co/300x200/E1FFE2/333?text=Watercolor" 
    },
    { 
      value: "fairytale", 
      label: "Fairytale", 
      thumbnailUrl: "https://placehold.co/300x200/DCBEFF/333?text=Fairytale" 
    },
    { 
      value: "storybook", 
      label: "Baby Storybook", 
      thumbnailUrl: "https://placehold.co/300x200/FFFACD/333?text=Storybook" 
    },
  ];

  return (
    <div className="p-5 animate-fadeIn">
      <div className="text-center mb-6">
        <h2 className="font-heading font-bold text-2xl mb-2">Maternity Art Magic</h2>
        <p className="text-neutral-dark">Transform your pregnancy and baby photos into beautiful memories</p>
      </div>

      {/* Preview Styles Section (NEW) */}
      <div className="bg-white rounded-xl p-5 shadow-soft border border-neutral-light mb-6">
        <div className="text-center mb-5">
          <h3 className="font-heading font-semibold text-lg mb-2">Choose from these magical styles!</h3>
          <p className="text-neutral-dark mb-4 max-w-md mx-auto">
            See how your special moments can be transformed. Click on a style that speaks to you.
          </p>
        </div>

        <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
          {artStyles.map((style) => (
            <div 
              key={style.value}
              className={`cursor-pointer rounded-xl overflow-hidden shadow-sm transition-all duration-200 hover:shadow-md ${
                selectedStyle === style.value ? 'ring-2 ring-primary' : ''
              }`}
              onClick={() => handleStyleSelected(style.value)}
            >
              <div className="relative">
                <img 
                  src={style.thumbnailUrl} 
                  alt={style.label} 
                  className="w-full h-32 object-cover"
                />
                <div className="absolute inset-0 bg-black/20 flex items-center justify-center">
                  <span className="bg-white/80 px-3 py-1 rounded-full text-sm font-medium text-primary-dark">
                    {style.label}
                  </span>
                </div>
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
            <h3 className="font-heading font-semibold text-lg">Create Beautiful Memories</h3>
          </div>
          <p className="text-neutral-dark mb-4 max-w-md mx-auto">
            Turn your maternity photos, ultrasound images, or baby pictures into enchanting artworks to cherish forever.
          </p>
        </div>

        <div className="mb-6">
          <label className="block font-medium mb-3 text-neutral-darkest">Upload Your Photo</label>
          
          {/* Image preview */}
          {previewUrl && (
            <div className="mb-4 rounded-lg overflow-hidden border border-neutral-light">
              <img 
                src={previewUrl} 
                alt="Selected image preview" 
                className="w-full max-h-64 object-contain"
              />
              <div className="bg-neutral-lightest p-2 text-xs text-neutral-dark">
                <p className="font-medium">File selected: {selectedFile?.name}</p>
              </div>
            </div>
          )}
          
          <FileUpload 
            onFileSelect={handleFileSelected} 
            accept="image/*"
            maxSize={10 * 1024 * 1024} // 10MB
          />
          <p className="text-xs text-neutral-dark mt-2">
            Supported: Ultrasound images, maternity photos, baby pictures, family moments
          </p>
        </div>

        {/* Transform Button */}
        {selectedFile && (
          <div>
            <div className="mb-5">
              <label className="block font-medium mb-3 text-neutral-darkest">Selected Style</label>
              {selectedStyle ? (
                <div className="flex items-center p-3 bg-neutral-lightest rounded-lg">
                  <div className="w-16 h-16 rounded-lg overflow-hidden mr-4">
                    <img 
                      src={artStyles.find(s => s.value === selectedStyle)?.thumbnailUrl || ''} 
                      alt={artStyles.find(s => s.value === selectedStyle)?.label || ''}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div>
                    <p className="font-medium">{artStyles.find(s => s.value === selectedStyle)?.label}</p>
                    <p className="text-xs text-neutral-dark mt-1">Click any style above to change your selection</p>
                  </div>
                </div>
              ) : (
                <div className="p-3 bg-neutral-lightest rounded-lg text-neutral-dark text-center">
                  <p>Please select a style from the options above</p>
                </div>
              )}
            </div>

            <Button
              type="button"
              className="w-full bg-primary hover:bg-primary-dark text-white font-medium py-3 px-4 rounded-lg transition-colors shadow-sm"
              onClick={handleTransformImage}
              disabled={isTransforming || !selectedStyle}
            >
              <PaintbrushVertical className="mr-2 h-4 w-4" />
              {isTransforming ? "Creating your memory art..." : "Transform My Photo"}
            </Button>
          </div>
        )}
      </div>

      {/* Generated Art Section */}
      {transformedImage && (
        <div className="mt-8">
          <div className="flex items-center mb-3">
            <h3 className="font-heading font-semibold text-lg">Your Magical Memory</h3>
            <div className="ml-2 bg-primary-light rounded-full px-2 py-0.5">
              <span className="text-xs font-medium text-primary-dark">New</span>
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
                  Created {transformedImage.createdAt}
                </p>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row space-y-3 sm:space-y-0 sm:space-x-3">
              <Button
                className="bg-neutral-light hover:bg-neutral text-neutral-darkest font-medium py-2.5 px-4 rounded-lg transition-colors"
                onClick={() => handleDownload(transformedImage.id)}
              >
                <Download className="mr-2 h-4 w-4" />
                <span>Save to Photos</span>
              </Button>
              <Button
                className="bg-primary hover:bg-primary-dark text-white font-medium py-2.5 px-4 rounded-lg transition-colors"
                onClick={() => handleShare(transformedImage.id)}
              >
                <Share2 className="mr-2 h-4 w-4" />
                <span>Share with Family</span>
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
          <h3 className="font-heading font-semibold text-lg">Your Memory Collection</h3>
          {imageList && imageList.length > 0 && (
            <span className="text-xs bg-neutral-lightest rounded-full px-3 py-1 text-neutral-dark">
              {imageList.length} memories
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
                    <p className="text-white text-xs font-medium">{image.style} Style</p>
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
                      <Eye className="mr-1 h-3 w-3" /> View
                    </Button>
                    <Button
                      size="sm"
                      className="flex-1 text-xs bg-primary-light hover:bg-primary/20 text-primary-dark"
                      onClick={() => handleShare(image.id)}
                    >
                      <Share2 className="mr-1 h-3 w-3" /> Share
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8 bg-neutral-lightest rounded-xl border border-dashed border-neutral-light">
            <PaintbrushVertical className="h-8 w-8 mx-auto mb-2 text-neutral" />
            <p className="text-neutral-dark font-medium">No magical memories yet</p>
            <p className="text-sm mt-1 mb-4 text-neutral-dark">Transform your first photo to begin your collection</p>
            <Button
              variant="outline"
              size="sm"
              className="bg-white hover:bg-neutral-lightest"
              onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
            >
              Upload a Photo
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
