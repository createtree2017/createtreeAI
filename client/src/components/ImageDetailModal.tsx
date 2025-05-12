import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { getImageDetail } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Download, Share, Heart } from "lucide-react";

interface ImageDetailModalProps {
  imageId: number | null;
  onClose: () => void;
}

interface ImageDetail {
  id: number;
  title: string;
  description?: string;
  originalUrl: string;
  transformedUrl: string;
  style: string;
  createdAt: string;
  metadata: {
    userId?: string | number;
    username?: string;
    isShared?: boolean;
    [key: string]: any;
  };
}

export default function ImageDetailModal({ imageId, onClose }: ImageDetailModalProps) {
  const [imageDetail, setImageDetail] = useState<ImageDetail | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    if (!imageId) return;

    const loadImageDetail = async () => {
      console.log(`이미지 상세 정보 로드 시작: ID ${imageId}`);
      setIsLoading(true);
      setError(null);
      
      try {
        console.log(`API 호출: getImageDetail(${imageId})`);
        const data = await getImageDetail(imageId);
        console.log("이미지 상세 정보 로드 성공:", data);
        setImageDetail(data);
      } catch (err) {
        console.error("이미지 상세 정보 로드 오류:", err);
        setError("이미지를 불러오는 중 오류가 발생했습니다.");
        toast({
          title: "이미지 로드 오류",
          description: "이미지 상세 정보를 불러오는 중 문제가 발생했습니다.",
          variant: "destructive",
        });
      } finally {
        setIsLoading(false);
      }
    };

    loadImageDetail();
  }, [imageId, toast]);

  const handleDownload = () => {
    if (!imageDetail) return;
    
    // 이미지 다운로드 로직
    const link = document.createElement("a");
    link.href = imageDetail.transformedUrl;
    link.download = `${imageDetail.title}-${imageDetail.id}.jpg`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    toast({
      title: "이미지 다운로드",
      description: "이미지 다운로드가 시작되었습니다.",
    });
  };

  return (
    <Dialog open={!!imageId} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[600px] max-h-[80vh] overflow-y-auto">
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <span className="ml-2">이미지를 불러오는 중...</span>
          </div>
        ) : error ? (
          <div className="text-center py-12 text-destructive">
            <p>{error}</p>
          </div>
        ) : imageDetail ? (
          <>
            <DialogHeader>
              <DialogTitle>{imageDetail.title}</DialogTitle>
              <DialogDescription>
                스타일: {imageDetail.style} • 생성일: {new Date(imageDetail.createdAt).toLocaleDateString()}
              </DialogDescription>
            </DialogHeader>

            <div className="relative mt-4 rounded-lg overflow-hidden">
              <img
                src={imageDetail.transformedUrl}
                alt={imageDetail.title}
                className="w-full object-contain max-h-[400px]"
                onError={(e) => {
                  console.error("이미지 로드 실패:", imageDetail.transformedUrl);
                  const target = e.target as HTMLImageElement;
                  target.src = "https://placehold.co/600x400/e2e8f0/1e293b?text=이미지+로드+실패";
                }}
              />
              {/* 디버깅용 텍스트 */}
              <div className="mt-2 text-xs text-neutral-dark">
                이미지 경로: {imageDetail.transformedUrl}
              </div>
            </div>

            {imageDetail.description && (
              <div className="mt-4">
                <h4 className="font-medium mb-1">설명</h4>
                <p className="text-sm text-neutral-dark">{imageDetail.description}</p>
              </div>
            )}

            <DialogFooter className="flex items-center justify-between mt-6 gap-2">
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-1"
                  onClick={handleDownload}
                >
                  <Download className="w-4 h-4" /> 다운로드
                </Button>
              </div>
              <DialogClose asChild>
                <Button variant="secondary" size="sm">닫기</Button>
              </DialogClose>
            </DialogFooter>
          </>
        ) : (
          <div className="text-center py-12">
            <p>이미지 정보가 없습니다.</p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}