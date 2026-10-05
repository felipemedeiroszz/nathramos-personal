"use client";

import { cn } from "@/lib/utils";
import { HTMLAttributes, useRef, useState } from "react";
import { Upload } from "lucide-react";

export interface FileUploadProps extends HTMLAttributes<HTMLDivElement> {
  accept?: string;
  maxSize?: number;
  multiple?: boolean;
  onFileSelect?: (files: File[]) => void;
}

export function FileUpload({
  accept,
  maxSize = 5 * 1024 * 1024,
  multiple = false,
  onFileSelect,
  className,
  ...props
}: FileUploadProps) {
  const [isDragging, setIsDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

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

    const files = Array.from(e.dataTransfer.files);
    processFiles(files);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    processFiles(files);
  };

  const processFiles = (files: File[]) => {
    const validFiles = files.filter((file) => {
      if (maxSize && file.size > maxSize) {
        alert(`File ${file.name} exceeds maximum size of ${maxSize / 1024 / 1024}MB`);
        return false;
      }
      return true;
    });

    onFileSelect?.(validFiles);
  };

  return (
    <div
      className={cn(
        "relative border-2 border-dashed rounded-xl p-8 text-center transition-colors",
        isDragging
          ? "border-primary bg-primary/5"
          : "border-border hover:border-border hover:bg-surface-secondary",
        className
      )}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      {...props}
    >
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        multiple={multiple}
        onChange={handleFileSelect}
        className="hidden"
      />
      <div className="flex flex-col items-center gap-4">
        <div className="w-12 h-12 rounded-full bg-surface-secondary flex items-center justify-center">
          <Upload size={24} className="text-text-secondary" />
        </div>
        <div className="space-y-1">
          <p className="text-sm font-medium text-text">
            Arraste e solte arquivos aqui
          </p>
          <p className="text-xs text-text-secondary">
            ou clique para selecionar
          </p>
        </div>
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className="px-4 py-2 text-sm font-medium text-primary hover:text-primary-foreground transition-colors"
        >
          Selecionar arquivos
        </button>
      </div>
    </div>
  );
}
