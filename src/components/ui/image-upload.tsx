"use client";

import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { ImagePlus, Loader2, X } from "lucide-react";

export default function ImageUpload({
  businessId,
  value,
  onChange,
  label = "Imagen",
  aspect = "aspect-video",
  className = "",
}: {
  businessId: string;
  value?: string | null;
  onChange: (url: string | null) => void;
  label?: string;
  aspect?: string;
  className?: string;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  const handleFile = async (file: File) => {
    if (!file.type.startsWith("image/")) {
      toast.error("Selecciona una imagen");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error("La imagen supera los 5 MB");
      return;
    }
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("businessId", businessId);

      const res = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error ?? "Error al subir la imagen");
      }
      onChange(data.url);
      toast.success("Imagen subida correctamente");
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Error al subir la imagen";
      toast.error(message);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className={className}>
      <div className="mb-2 text-sm font-medium text-foreground/80">{label}</div>
      <div className="flex items-start gap-4">
        <div
          className={`relative overflow-hidden rounded-lg border ${aspect} w-40 bg-muted flex items-center justify-center`}
        >
          {value ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={value}
              alt={label}
              className="absolute inset-0 w-full h-full object-cover"
            />
          ) : (
            <ImagePlus className="h-8 w-8 text-muted-foreground/50" />
          )}
        </div>
        <div className="space-y-2">
          <Button
            type="button"
            size="sm"
            variant="outline"
            disabled={uploading}
            onClick={() => inputRef.current?.click()}
          >
            {uploading ? (
              <Loader2 className="mr-1 h-4 w-4 animate-spin" />
            ) : (
              <ImagePlus className="mr-1 h-4 w-4" />
            )}
            {uploading ? "Subiendo..." : "Subir imagen"}
          </Button>
          {value && (
            <Button
              type="button"
              size="sm"
              variant="ghost"
              className="text-red-600"
              onClick={() => onChange(null)}
            >
              <X className="mr-1 h-4 w-4" /> Quitar
            </Button>
          )}
          <input
            ref={inputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) handleFile(file);
              e.target.value = "";
            }}
          />
        </div>
      </div>
    </div>
  );
}
