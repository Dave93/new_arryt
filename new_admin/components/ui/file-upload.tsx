"use client";

import { useState, useRef, useCallback } from "react";
import { Upload, X, File, Image, Loader2, Download } from "lucide-react";
import { Button } from "./button";
import { cn } from "../../lib/utils";
import { apiClient, useGetAuthHeaders } from "../../lib/eden-client";
import { toast } from "sonner";

interface FileInfo {
  id: string;
  file_name: string;
  model: string;
  model_id: string | null;
  sub_folder: string;
  link: string;
}

interface FileUploadProps {
  userId?: string;
  existingFiles?: FileInfo[];
  onFilesChange?: (files: FileInfo[]) => void;
  multiple?: boolean;
  accept?: string;
  maxSize?: number; // in MB
  disabled?: boolean;
}

export function FileUpload({
  userId,
  existingFiles = [],
  onFilesChange,
  multiple = true,
  accept = "image/*,application/pdf",
  maxSize = 10,
  disabled = false
}: FileUploadProps) {
  const [files, setFiles] = useState<FileInfo[]>(existingFiles);
  const [uploading, setUploading] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = useCallback(async (selectedFiles: FileList | null) => {
    if (!selectedFiles || !userId) return;

    const validFiles: File[] = [];
    
    for (let i = 0; i < selectedFiles.length; i++) {
      const file = selectedFiles[i];
      
      // Check file size
      if (file.size > maxSize * 1024 * 1024) {
        toast.error(`Файл ${file.name} превышает максимальный размер ${maxSize}MB`);
        continue;
      }
      
      validFiles.push(file);
    }

    if (validFiles.length === 0) return;

    setUploading(true);

    try {
      const uploadedFiles: FileInfo[] = [];
      
      for (const file of validFiles) {
        const response = await apiClient.api["user-assets"]({ userId }).post({
          file,
        });

        if (response.error) {
          throw new Error(`Ошибка загрузки файла ${file.name}`);
        }

        if (response.data?.asset) {
          uploadedFiles.push(response.data.asset);
        }
      }

      const newFiles = [...files, ...uploadedFiles];
      setFiles(newFiles);
      onFilesChange?.(newFiles);
      
      toast.success(`Загружено файлов: ${uploadedFiles.length}`);
    } catch (error) {
      console.error("Error uploading files:", error);
      toast.error("Ошибка при загрузке файлов");
    } finally {
      setUploading(false);
    }
  }, [userId, files, maxSize, onFilesChange]);

  const handleRemoveFile = useCallback(async (fileId: string) => {
    if (!userId) return;

    try {
      const response = await apiClient.api["user-assets"]({ userId })({assetId: fileId}).delete({});

      if (response.error) {
        throw new Error("Ошибка удаления файла");
      }

      const newFiles = files.filter(f => f.id !== fileId);
      setFiles(newFiles);
      onFilesChange?.(newFiles);
      
      toast.success("Файл удален");
    } catch (error) {
      console.error("Error deleting file:", error);
      toast.error("Ошибка при удалении файла");
    }
  }, [userId, files, onFilesChange]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    handleFileSelect(e.dataTransfer.files);
  }, [handleFileSelect]);

  const getFileIcon = (fileName: string) => {
    const ext = fileName.split('.').pop()?.toLowerCase();
    if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'].includes(ext || '')) {
      return <Image className="h-4 w-4" />;
    }
    return <File className="h-4 w-4" />;
  };

  return (
    <div className="space-y-4">
      <div
        className={cn(
          "border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors",
          isDragging && "border-primary bg-primary/5",
          disabled && "opacity-50 cursor-not-allowed",
          !isDragging && !disabled && "hover:border-primary/50"
        )}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => !disabled && fileInputRef.current?.click()}
      >
        <input
          ref={fileInputRef}
          type="file"
          multiple={multiple}
          accept={accept}
          onChange={(e) => handleFileSelect(e.target.files)}
          className="hidden"
          disabled={disabled}
        />
        
        <div className="flex flex-col items-center gap-2">
          {uploading ? (
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          ) : (
            <Upload className="h-8 w-8 text-muted-foreground" />
          )}
          
          <div className="text-sm text-muted-foreground">
            {uploading ? (
              "Загрузка..."
            ) : (
              <>
                <span className="font-semibold">Нажмите для выбора</span> или перетащите файлы сюда
              </>
            )}
          </div>
          
          <div className="text-xs text-muted-foreground">
            Максимальный размер: {maxSize}MB
          </div>
        </div>
      </div>

      {files.length > 0 && (
        <div className="space-y-2">
          <div className="text-sm font-medium">Загруженные файлы:</div>
          <div className="grid gap-2">
            {files.map((file) => (
              <div
                key={file.id}
                className="flex items-center justify-between p-2 border rounded-lg"
              >
                <div className="flex items-center gap-2">
                  {getFileIcon(file.file_name)}
                  <span className="text-sm truncate max-w-[200px]">
                    {file.file_name}
                  </span>
                </div>
                
                <div className="flex items-center gap-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      e.preventDefault();
                      window.open(file.link, '_blank');
                    }}
                    title="Скачать файл"
                  >
                    <Download className="h-4 w-4" />
                  </Button>
                  
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      e.preventDefault();
                      handleRemoveFile(file.id);
                    }}
                    disabled={disabled}
                    title="Удалить файл"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}