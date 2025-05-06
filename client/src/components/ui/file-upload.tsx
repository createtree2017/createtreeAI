import React, { useState, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Upload, Image as ImageIcon } from "lucide-react";

interface FileUploadProps {
  onFileSelect: (file: File) => void;
  accept?: string;
  maxSize?: number;
  className?: string;
  id?: string; // Added id property
}

export function FileUpload({
  onFileSelect,
  accept = "image/*",
  maxSize = 10 * 1024 * 1024, // 10MB default
  className = "",
  id = "file-upload",
}: FileUploadProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelection = useCallback(
    (file: File) => {
      if (file.size > maxSize) {
        setError(`File size exceeds the limit (${maxSize / (1024 * 1024)}MB)`);
        return;
      }

      setSelectedFile(file);
      setError(null);
      onFileSelect(file);
    },
    [maxSize, onFileSelect]
  );

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      handleFileSelection(files[0]);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      handleFileSelection(files[0]);
    }
  };

  const triggerFileInput = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  return (
    <div className={className}>
      <input
        type="file"
        ref={fileInputRef}
        className="hidden"
        accept={accept}
        onChange={handleFileInputChange}
        id={id}
      />
      <div
        className={`border-2 border-dashed ${
          isDragging ? "border-secondary" : "border-neutral-light"
        } rounded-lg p-6 text-center cursor-pointer transition-colors`}
        onClick={triggerFileInput}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        {selectedFile ? (
          <div className="py-4">
            <div className="mb-3 w-16 h-16 bg-secondary-light rounded-full flex items-center justify-center mx-auto">
              <ImageIcon className="h-8 w-8 text-secondary-dark" />
            </div>
            <p className="mb-1 font-medium">
              File selected: {selectedFile.name}
            </p>
            <p className="text-sm text-neutral-dark mt-1">Click to change</p>
          </div>
        ) : (
          <div className="py-4">
            <div className="mb-3 w-16 h-16 bg-secondary-light rounded-full flex items-center justify-center mx-auto">
              <Upload className="h-8 w-8 text-secondary-dark" />
            </div>
            <p className="mb-1 font-medium">Drag and drop your file here</p>
            <p className="text-sm text-neutral-dark mb-3">or</p>
            <Button
              type="button"
              className="bg-secondary hover:bg-secondary-dark text-white"
            >
              <ImageIcon className="mr-2 h-4 w-4" />
              Browse Files
            </Button>
            <p className="mt-3 text-xs text-neutral-dark">
              {accept === "image/*"
                ? "JPG, PNG or HEIC • Max "
                : "Acceptable format: "}
              {maxSize / (1024 * 1024)}MB
            </p>
          </div>
        )}
      </div>
      {error && <p className="text-destructive text-sm mt-2">{error}</p>}
    </div>
  );
}

export default FileUpload;
