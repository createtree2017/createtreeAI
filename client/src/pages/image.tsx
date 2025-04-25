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
  
  // Art styles data
  const artStyles: ImageStyle[] = [
    { 
      value: "watercolor", 
      label: "Watercolor", 
      thumbnailUrl: "https://images.unsplash.com/photo-1579783902614-a3fb3927b6a5?ixlib=rb-1.2.1&auto=format&fit=crop&w=300&q=80" 
    },
    { 
      value: "sketch", 
      label: "Sketch", 
      thumbnailUrl: "https://images.unsplash.com/photo-1572883454114-1cf0031ede2a?ixlib=rb-1.2.1&auto=format&fit=crop&w=300&q=80" 
    },
    { 
      value: "cartoon", 
      label: "Cartoon", 
      thumbnailUrl: "https://images.unsplash.com/photo-1581833971358-2c8b550f87b3?ixlib=rb-1.2.1&auto=format&fit=crop&w=300&q=80" 
    },
    { 
      value: "oil", 
      label: "Oil Painting", 
      thumbnailUrl: "https://images.unsplash.com/photo-1579783901586-d88db74b4fe4?ixlib=rb-1.2.1&auto=format&fit=crop&w=300&q=80" 
    },
    { 
      value: "fantasy", 
      label: "Fantasy", 
      thumbnailUrl: "https://images.unsplash.com/photo-1518998053901-5348d3961a04?ixlib=rb-1.2.1&auto=format&fit=crop&w=300&q=80" 
    },
    { 
      value: "storybook", 
      label: "Storybook", 
      thumbnailUrl: "https://images.unsplash.com/photo-1516683037151-9a17603a8dc7?ixlib=rb-1.2.1&auto=format&fit=crop&w=300&q=80" 
    },
  ];
  
  return (
    <div className="p-5 animate-fadeIn">
      <div className="text-center mb-6">
        <h2 className="font-heading font-bold text-2xl mb-2">Memory Art</h2>
        <p className="text-neutral-dark">Transform your photos into beautiful artworks</p>
      </div>
      
      {/* Image Upload Section */}
      <div className="bg-white rounded-xl p-5 shadow-soft border border-neutral-light">
        <div className="mb-5">
          <label className="block font-medium mb-3 text-neutral-darkest">Upload Your Photo</label>
          <FileUpload 
            onFileSelect={handleFileSelected} 
            accept="image/*"
            maxSize={10 * 1024 * 1024} // 10MB
          />
        </div>
        
        {/* Style Selection */}
        {selectedFile && (
          <div>
            <div className="mb-5">
              <label className="block font-medium mb-3 text-neutral-darkest">Choose Art Style</label>
              <div className="grid grid-cols-3 gap-3">
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
                      selectedStyle === style.value ? 'border-secondary' : 'border-transparent'
                    } hover:border-secondary rounded-lg overflow-hidden transition-all duration-200 p-1`}>
                      <img 
                        src={style.thumbnailUrl} 
                        alt={style.label} 
                        className="rounded-md w-full h-20 object-cover"
                      />
                      <p className="text-center text-sm mt-1">{style.label}</p>
                    </div>
                  </label>
                ))}
              </div>
            </div>
            
            <Button
              type="button"
              className="w-full bg-secondary hover:bg-secondary-dark text-white font-medium py-3 px-4 rounded-lg transition-colors shadow-sm"
              onClick={handleTransformImage}
              disabled={isTransforming}
            >
              <PaintbrushVertical className="mr-2 h-4 w-4" />
              {isTransforming ? "Transforming..." : "Transform Image"}
            </Button>
          </div>
        )}
      </div>
      
      {/* Generated Art Section */}
      {transformedImage && (
        <div className="mt-8">
          <h3 className="font-heading font-semibold text-lg mb-3">Your Transformed Art</h3>
          <div className="bg-white rounded-xl p-5 shadow-soft border border-neutral-light">
            <div className="mb-4">
              <div className="rounded-lg overflow-hidden shadow-sm">
                <img 
                  src={transformedImage.transformedUrl} 
                  alt="Transformed Art" 
                  className="w-full object-cover"
                />
              </div>
              <p className="text-center text-sm text-neutral-dark mt-2">
                {transformedImage.style} Style • Created {transformedImage.createdAt}
              </p>
            </div>
            
            <div className="flex space-x-3">
              <Button
                className="flex-1 bg-neutral-light hover:bg-neutral text-neutral-darkest font-medium py-2.5 px-4 rounded-lg transition-colors"
                onClick={() => handleDownload(transformedImage.id)}
              >
                <Download className="mr-2 h-4 w-4" />
                <span>Download</span>
              </Button>
              <Button
                className="flex-1 bg-secondary hover:bg-secondary-dark text-white font-medium py-2.5 px-4 rounded-lg transition-colors"
                onClick={() => handleShare(transformedImage.id)}
              >
                <Share2 className="mr-2 h-4 w-4" />
                <span>Share</span>
              </Button>
            </div>
          </div>
        </div>
      )}
      
      {/* Previous Art */}
      <div className="mt-8">
        <h3 className="font-heading font-semibold text-lg mb-3">Your Art Gallery</h3>
        {isLoadingImages ? (
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-neutral-lightest h-48 rounded-lg animate-pulse"></div>
            <div className="bg-neutral-lightest h-48 rounded-lg animate-pulse"></div>
          </div>
        ) : imageList && imageList.length > 0 ? (
          <div className="grid grid-cols-2 gap-3">
            {imageList.map((image: TransformedImage) => (
              <div 
                key={image.id}
                className="bg-white rounded-lg overflow-hidden shadow-softer border border-neutral-light"
              >
                <img 
                  src={image.transformedUrl} 
                  alt={image.title} 
                  className="w-full h-32 object-cover"
                />
                <div className="p-2">
                  <p className="text-sm font-medium">{image.title}</p>
                  <p className="text-xs text-neutral-dark">{image.createdAt}</p>
                  <div className="flex mt-2 space-x-2">
                    <Button
                      size="sm"
                      variant="ghost"
                      className="flex-1 text-xs"
                      onClick={() => handleViewImage(image)}
                    >
                      <Eye className="mr-1 h-3 w-3" /> View
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="flex-1 text-xs"
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
          <div className="text-center py-6 bg-neutral-lightest rounded-lg">
            <p className="text-neutral-dark">No artworks created yet</p>
            <p className="text-sm mt-1">Transform your first photo above!</p>
          </div>
        )}
      </div>
    </div>
  );
}
