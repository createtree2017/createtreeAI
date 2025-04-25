import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { getGalleryItems, toggleFavorite } from "@/lib/api";
import { queryClient } from "@/lib/queryClient";
import { Music, PaintbrushVertical, Heart, Play, Eye, Share2 } from "lucide-react";
import { useLocation } from "wouter";

interface GalleryItem {
  id: number;
  title: string;
  type: "music" | "image";
  url: string;
  thumbnailUrl?: string;
  duration?: number;
  createdAt: string;
  isFavorite: boolean;
}

type FilterType = "all" | "music" | "image" | "favorite";

export default function Gallery() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [activeFilter, setActiveFilter] = useState<FilterType>("all");
  
  // Fetch gallery items
  const { data: galleryItems, isLoading } = useQuery({
    queryKey: ["/api/gallery", activeFilter],
    queryFn: () => getGalleryItems(activeFilter !== "all" ? activeFilter : undefined),
  });
  
  // Toggle favorite mutation
  const { mutate: toggleFavoriteMutation } = useMutation({
    mutationFn: ({ itemId, type }: { itemId: number; type: string }) => toggleFavorite(itemId, type),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/gallery"] });
      toast({
        title: "Favorites updated",
        description: "Your gallery has been updated",
      });
    },
    onError: (error) => {
      toast({
        title: "Error updating favorites",
        description: error.message,
        variant: "destructive",
      });
    },
  });
  
  const handleFilterGallery = (filter: FilterType) => {
    setActiveFilter(filter);
  };
  
  const handleToggleFavorite = (item: GalleryItem) => {
    toggleFavoriteMutation({ itemId: item.id, type: item.type });
  };
  
  const handleItemAction = (item: GalleryItem, action: 'view' | 'play' | 'share') => {
    if (action === 'view' || action === 'play') {
      // Navigate to the appropriate page with the item ID
      setLocation(`/${item.type === 'music' ? 'music' : 'image'}?id=${item.id}`);
    } else if (action === 'share') {
      toast({
        title: "Share feature",
        description: "Coming soon!",
      });
    }
  };
  
  const filters: { type: FilterType; label: string }[] = [
    { type: "all", label: "All Items" },
    { type: "music", label: "Music" },
    { type: "image", label: "Artwork" },
    { type: "favorite", label: "Favorites" },
  ];
  
  return (
    <div className="p-5 animate-fadeIn">
      <div className="text-center mb-6">
        <h2 className="font-heading font-bold text-2xl mb-2">My Gallery</h2>
        <p className="text-neutral-dark">All your beautiful memories in one place</p>
      </div>
      
      {/* Gallery Filters */}
      <div className="mb-5 flex items-center space-x-2 overflow-x-auto py-2 custom-scrollbar">
        {filters.map((filter) => (
          <button
            key={filter.type}
            className={`text-sm py-1.5 px-3 rounded-full whitespace-nowrap ${
              activeFilter === filter.type
                ? "bg-accent2 text-white"
                : "bg-neutral-lightest text-neutral-darkest"
            }`}
            onClick={() => handleFilterGallery(filter.type)}
          >
            {filter.label}
          </button>
        ))}
      </div>
      
      {/* Gallery Grid */}
      {isLoading ? (
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-neutral-lightest h-56 rounded-lg animate-pulse"></div>
          <div className="bg-neutral-lightest h-56 rounded-lg animate-pulse"></div>
          <div className="bg-neutral-lightest h-56 rounded-lg animate-pulse"></div>
          <div className="bg-neutral-lightest h-56 rounded-lg animate-pulse"></div>
        </div>
      ) : galleryItems && galleryItems.length > 0 ? (
        <div className="grid grid-cols-2 gap-3">
          {galleryItems.map((item: GalleryItem) => (
            <div
              key={`${item.type}-${item.id}`}
              className="bg-white rounded-lg overflow-hidden shadow-softer border border-neutral-light"
              data-item-type={item.type}
            >
              {item.type === "music" ? (
                <div className="h-32 bg-primary-light flex items-center justify-center">
                  <div className="p-3 bg-white rounded-full text-primary-dark">
                    <Music className="h-5 w-5" />
                  </div>
                </div>
              ) : (
                <img
                  src={item.thumbnailUrl || item.url}
                  alt={item.title}
                  className="w-full h-32 object-cover"
                />
              )}
              <div className="p-3">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="font-medium">{item.title}</p>
                    <p className="text-xs text-neutral-dark">
                      {item.type === "music" && item.duration
                        ? `${Math.floor(item.duration / 60)}:${(
                            item.duration % 60
                          )
                            .toString()
                            .padStart(2, "0")} • `
                        : ""}
                      {item.createdAt}
                    </p>
                  </div>
                  <button
                    className={`${
                      item.isFavorite ? "text-primary" : "text-neutral hover:text-primary"
                    }`}
                    onClick={() => handleToggleFavorite(item)}
                  >
                    {item.isFavorite ? (
                      <Heart className="h-4 w-4 fill-primary" />
                    ) : (
                      <Heart className="h-4 w-4" />
                    )}
                  </button>
                </div>
                <div className="flex mt-2 space-x-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="flex-1"
                    onClick={() =>
                      handleItemAction(
                        item,
                        item.type === "music" ? "play" : "view"
                      )
                    }
                  >
                    {item.type === "music" ? (
                      <>
                        <Play className="mr-1 h-3 w-3" /> Play
                      </>
                    ) : (
                      <>
                        <Eye className="mr-1 h-3 w-3" /> View
                      </>
                    )}
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="flex-1"
                    onClick={() => handleItemAction(item, "share")}
                  >
                    <Share2 className="mr-1 h-3 w-3" /> Share
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-10 bg-neutral-lightest rounded-lg">
          <div className="mb-3 w-16 h-16 mx-auto bg-accent2-light rounded-full flex items-center justify-center">
            {activeFilter === "music" ? (
              <Music className="h-8 w-8 text-accent2-dark" />
            ) : activeFilter === "image" ? (
              <PaintbrushVertical className="h-8 w-8 text-accent2-dark" />
            ) : activeFilter === "favorite" ? (
              <Heart className="h-8 w-8 text-accent2-dark" />
            ) : (
              <div className="flex">
                <Music className="h-8 w-8 text-accent2-dark" />
                <PaintbrushVertical className="h-8 w-8 text-accent2-dark ml-1" />
              </div>
            )}
          </div>
          <h3 className="font-heading font-semibold text-lg mb-1">
            No items found
          </h3>
          <p className="text-neutral-dark">
            {activeFilter === "favorite"
              ? "Mark some items as favorites to see them here!"
              : activeFilter === "music"
              ? "Create your first melody in the Baby Melody section!"
              : activeFilter === "image"
              ? "Transform your photos in the Memory Art section!"
              : "Create melodies or transform photos to fill your gallery!"}
          </p>
        </div>
      )}
    </div>
  );
}
