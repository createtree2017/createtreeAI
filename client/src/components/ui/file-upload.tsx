import React, { useState, useRef } from 'react';
import { Upload, FileType2, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogFooter } from '@/components/ui/alert-dialog';

interface FileUploadProps {
  accept?: string;
  maxSize?: number; // in bytes
  onFileSelect: (file: File) => void;
  className?: string;
}

export function FileUpload({
  accept = '*',
  maxSize = 5 * 1024 * 1024, // 5MB default
  onFileSelect,
  className,
}: FileUploadProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const validateFile = (file: File): boolean => {
    // Check if the file type is accepted
    if (accept !== '*') {
      const fileType = file.type;
      const acceptedTypes = accept.split(',').map(type => type.trim());
      
      if (!acceptedTypes.some(type => {
        if (type.includes('/*')) {
          // Handle wildcards like 'image/*'
          const category = type.split('/')[0];
          return fileType.startsWith(`${category}/`);
        }
        return type === fileType;
      })) {
        setErrorMessage(`파일 형식이 올바르지 않습니다. 허용된 형식: ${accept}`);
        return false;
      }
    }

    // Check file size
    if (file.size > maxSize) {
      const sizeMB = maxSize / (1024 * 1024);
      setErrorMessage(`파일 크기가 너무 큽니다. 최대 허용 크기: ${sizeMB}MB`);
      return false;
    }

    return true;
  };

  const handleFileDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const file = e.dataTransfer.files[0];
      handleFileSelection(file);
    }
  };

  const handleFileSelection = (file: File) => {
    setErrorMessage(null);
    if (validateFile(file)) {
      setSelectedFile(file);
      onFileSelect(file);
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      handleFileSelection(file);
    }
  };

  const triggerFileInput = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const closeErrorDialog = () => {
    setErrorMessage(null);
  };

  return (
    <>
      <div
        className={cn(
          "border-2 border-dashed rounded-md p-6 flex flex-col items-center justify-center transition-colors",
          isDragging ? "border-primary bg-primary/5" : "border-gray-300 hover:border-primary/50",
          className
        )}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleFileDrop}
        onClick={triggerFileInput}
      >
        <input
          type="file"
          accept={accept}
          onChange={handleFileInputChange}
          ref={fileInputRef}
          className="hidden"
        />

        {selectedFile ? (
          <div className="flex flex-col items-center gap-2">
            <FileType2 className="w-10 h-10 text-primary" />
            <p className="font-medium text-center">{selectedFile.name}</p>
            <p className="text-xs text-gray-500">
              {(selectedFile.size / 1024).toFixed(1)} KB
            </p>
            <Button 
              variant="outline" 
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                setSelectedFile(null);
                if (fileInputRef.current) fileInputRef.current.value = '';
              }}
            >
              파일 변경
            </Button>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-2">
            <Upload className="w-10 h-10 text-gray-400 mb-2" />
            <p className="text-sm font-medium text-center">
              이미지를 드래그하거나 클릭하여 업로드하세요
            </p>
            <p className="text-xs text-gray-500 text-center">
              {accept === '*' ? '모든 파일 형식' : accept.replace('image/*', '이미지 파일')} 지원
              (최대 {maxSize / (1024 * 1024)}MB)
            </p>
          </div>
        )}
      </div>

      <AlertDialog open={!!errorMessage} onOpenChange={closeErrorDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-red-500" />
              파일 업로드 오류
            </AlertDialogTitle>
          </AlertDialogHeader>
          <p className="py-4">{errorMessage}</p>
          <AlertDialogFooter>
            <Button onClick={closeErrorDialog}>확인</Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}