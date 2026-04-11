"use client";

import { useState, useRef, useCallback } from "react";
import { Upload, X, File, Image, Loader2, Download } from "lucide-react";
import { Button } from "./button";
import { cn } from "../../lib/utils";
import { useAuthStore } from "../../lib/auth-store";
import { toast } from "sonner";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:7474";

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
      const token = useAuthStore.getState().token;

      for (const file of validFiles) {
        const formData = new FormData();
        formData.append("file", file);

        const res = await fetch(`${API_URL}/api/user-assets/${userId}`, {
          method: "POST",
          headers: {
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          body: formData,
        });

        if (!res.ok) {
          throw new Error(`Ошибка загрузки файла ${file.name}`);
        }

        const data = await res.json();

        if (data?.asset) {
          uploadedFiles.push(data.asset);
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
      const token = useAuthStore.getState().token;
      const res = await fetch(`${API_URL}/api/user-assets/${userId}/${fileId}`, {
        method: "DELETE",
        headers: {
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });

      if (!res.ok) {
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

  const isImage = (fileName: string) => {
    const ext = fileName.split('.').pop()?.toLowerCase();
    return ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'].includes(ext || '');
  };

  const getFileIcon = (fileName: string) => {
    if (isImage(fileName)) {
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
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {files.map((file) => (
              <div
                key={file.id}
                className="relative group border rounded-lg overflow-hidden"
              >
                {isImage(file.file_name) ? (
                  <a href={file.link} target="_blank" rel="noopener noreferrer">
                    <img
                      src={file.link}
                      alt={file.file_name}
                      className="w-full h-40 object-cover cursor-pointer hover:opacity-90 transition-opacity"
                    />
                  </a>
                ) : (
                  <a
                    href={file.link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex flex-col items-center justify-center h-40 bg-muted/30 hover:bg-muted/50 transition-colors"
                  >
                    <File className="h-10 w-10 text-muted-foreground" />
                    <span className="text-xs text-muted-foreground mt-2 px-2 truncate max-w-full">
                      {file.file_name}
                    </span>
                  </a>
                )}
                <div className="absolute top-1 right-1 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <Button
                    variant="secondary"
                    size="icon"
                    className="h-7 w-7"
                    onClick={(e) => {
                      e.stopPropagation();
                      e.preventDefault();
                      window.open(file.link, '_blank');
                    }}
                    title="Скачать файл"
                  >
                    <Download className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    variant="destructive"
                    size="icon"
                    className="h-7 w-7"
                    onClick={(e) => {
                      e.stopPropagation();
                      e.preventDefault();
                      handleRemoveFile(file.id);
                    }}
                    disabled={disabled}
                    title="Удалить файл"
                  >
                    <X className="h-3.5 w-3.5" />
                  </Button>
                </div>
                <div className="p-1.5 text-xs truncate text-muted-foreground">
                  {file.file_name}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}