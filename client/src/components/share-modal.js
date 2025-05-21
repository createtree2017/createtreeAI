/**
 * 공유 모달 컴포넌트
 * 이 컴포넌트는 콘텐츠를 소셜 미디어나 다른 채널로 공유하기 위한 모달입니다.
 */

import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Share2, Copy, Check, Twitter, Facebook } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

const ShareModal = ({ open, onOpenChange, title, url, description }) => {
  const { toast } = useToast();
  const [copied, setCopied] = useState(false);

  const handleCopyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      toast({
        title: '링크가 복사되었습니다',
        description: '공유 링크가 클립보드에 복사되었습니다.',
      });
      
      setTimeout(() => {
        setCopied(false);
      }, 2000);
    } catch (error) {
      toast({
        title: '링크 복사 실패',
        description: '클립보드에 복사하지 못했습니다. 다시 시도해주세요.',
        variant: 'destructive',
      });
    }
  };

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: title || '창조트리 AI 컨텐츠',
          text: description || '창조트리 AI로 만든 컨텐츠를 확인해보세요!',
          url: url,
        });
        toast({
          title: '공유되었습니다',
          description: '컨텐츠가 성공적으로 공유되었습니다.',
        });
      } catch (error) {
        if (error.name !== 'AbortError') {
          toast({
            title: '공유 실패',
            description: '컨텐츠를 공유하지 못했습니다. 다시 시도해주세요.',
            variant: 'destructive',
          });
        }
      }
    } else {
      handleCopyToClipboard();
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>컨텐츠 공유하기</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col space-y-4 py-4">
          <div className="flex items-center space-x-2">
            <div className="grid flex-1 gap-2">
              <div className="flex items-center justify-center p-4 border rounded-md bg-gray-50">
                <p className="text-sm text-gray-700 truncate">{url}</p>
              </div>
            </div>
            <Button 
              variant="outline" 
              size="icon" 
              onClick={handleCopyToClipboard}
              className="flex-shrink-0"
            >
              {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
            </Button>
          </div>
          
          <div className="flex justify-center space-x-4">
            <Button 
              variant="outline" 
              className="flex items-center space-x-2"
              onClick={handleShare}
            >
              <Share2 className="h-4 w-4" />
              <span>공유하기</span>
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ShareModal;