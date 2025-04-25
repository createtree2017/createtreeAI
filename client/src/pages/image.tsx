import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { FileUpload } from "@/components/ui/file-upload";
import { transformImage, getImageList, downloadMedia, shareMedia } from "@/lib/api";
import { queryClient } from "@/lib/queryClient";
import { PaintbrushVertical, Download, Share2, Eye } from "lucide-react";

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
  
  // Transform image mutation
  const { mutate: transformImageMutation, isPending: isTransforming } = useMutation({
    mutationFn: (data: FormData) => transformImage(data),
    onSuccess: (data) => {
      setTransformedImage(data);
      queryClient.invalidateQueries({ queryKey: ["/api/image"] });
      toast({
        title: "Success!",
        description: "Your image has been transformed",
      });
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
      thumbnailUrl: "https://images.unsplash.com/photo-1612177178197-c233467e0ba2?ixlib=rb-1.2.1&auto=format&fit=crop&w=300&q=80" 
    },
    { 
      value: "disney", 
      label: "Disney Animation", 
      thumbnailUrl: "https://images.unsplash.com/photo-1608848461950-0fe51dfc41cb?ixlib=rb-1.2.1&auto=format&fit=crop&w=300&q=80" 
    },
    { 
      value: "korean_webtoon", 
      label: "Korean Webtoon", 
      thumbnailUrl: "https://images.unsplash.com/photo-1595750296587-295246b2dd5d?ixlib=rb-1.2.1&auto=format&fit=crop&w=300&q=80" 
    },
    { 
      value: "watercolor", 
      label: "Soft Watercolor", 
      thumbnailUrl: "https://images.unsplash.com/photo-1579783902614-a3fb3927b6a5?ixlib=rb-1.2.1&auto=format&fit=crop&w=300&q=80" 
    },
    { 
      value: "fairytale", 
      label: "Fairytale", 
      thumbnailUrl: "https://images.unsplash.com/photo-1518998053901-5348d3961a04?ixlib=rb-1.2.1&auto=format&fit=crop&w=300&q=80" 
    },
    { 
      value: "storybook", 
      label: "Baby Storybook", 
      thumbnailUrl: "https://images.unsplash.com/photo-1516683037151-9a17603a8dc7?ixlib=rb-1.2.1&auto=format&fit=crop&w=300&q=80" 
    },
  ];
  
  return (
    <div className="p-5 animate-fadeIn">
      <div className="text-center mb-6">
        <h2 className="font-heading font-bold text-2xl mb-2">Maternity Art Magic</h2>
        <p className="text-neutral-dark">Transform your pregnancy and baby photos into beautiful memories</p>
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
          <FileUpload 
            onFileSelect={handleFileSelected} 
            accept="image/*"
            maxSize={10 * 1024 * 1024} // 10MB
          />
          <p className="text-xs text-neutral-dark mt-2">
            Supported: Ultrasound images, maternity photos, baby pictures, family moments
          </p>
        </div>
        
        {/* Style Selection */}
        {selectedFile && (
          <div>
            <div className="mb-5">
              <label className="block font-medium mb-3 text-neutral-darkest">Choose Your Magical Style</label>
              <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
                {artStyles.map((style) => (
                  <label key={style.value} className="cursor-pointer">
                    <input 
                      type="radio" 
                      name="artStyle" 
                      value={style.value} 
                      className="hidden" 
                      onChange={() => handleStyleSelected(style.value)}
                    />
                    <div className={`art-style-option border-2 ${
                      selectedStyle === style.value ? 'border-primary' : 'border-transparent'
                    } hover:border-primary rounded-xl overflow-hidden transition-all duration-200 p-1 shadow-sm hover:shadow-soft`}>
                      <img 
                        src={style.thumbnailUrl} 
                        alt={style.label} 
                        className="rounded-lg w-full h-24 object-cover"
                      />
                      <p className="text-center font-medium text-sm mt-2">{style.label}</p>
                    </div>
                  </label>
                ))}
              </div>
            </div>
            
            <Button
              type="button"
              className="w-full bg-primary hover:bg-primary-dark text-white font-medium py-3 px-4 rounded-lg transition-colors shadow-sm"
              onClick={handleTransformImage}
              disabled={isTransforming}
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
