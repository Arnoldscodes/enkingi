import { useRef, useState } from "react";
import { ImagePlus, Loader2, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/hooks/useAuth";
import { uploadImage, type UploadBucket } from "@/lib/upload";

interface Props {
  label: string;
  bucket: UploadBucket;
  value: string[];
  onChange: (urls: string[]) => void;
  multiple?: boolean;
  hint?: string;
}

export function ImageUploader({ label, bucket, value, onChange, multiple = false, hint }: Props) {
  const { user } = useAuth();
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);

  const handleFiles = async (files: FileList | null) => {
    if (!files?.length || !user) return;
    setBusy(true);
    try {
      const uploaded: string[] = [];
      for (const file of Array.from(files)) {
        uploaded.push(await uploadImage(bucket, user.id, file));
      }
      onChange(multiple ? [...value, ...uploaded] : uploaded.slice(-1));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Upload failed");
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <div className="flex flex-wrap items-center gap-3">
        {value.map((url) => (
          <div key={url} className="relative h-20 w-20 overflow-hidden rounded-xl border bg-muted">
            <img src={url} alt="" className="h-full w-full object-cover" loading="lazy" />
            <button
              type="button"
              aria-label="Remove image"
              onClick={() => onChange(value.filter((v) => v !== url))}
              className="absolute right-1 top-1 rounded-full bg-background/90 p-1 text-foreground shadow"
            >
              <X className="h-3 w-3" />
            </button>
          </div>
        ))}
        <Button
          type="button"
          variant="outline"
          disabled={busy}
          onClick={() => inputRef.current?.click()}
          className="h-20 w-20 flex-col gap-1 rounded-xl border-dashed"
        >
          {busy ? <Loader2 className="h-5 w-5 animate-spin" /> : <ImagePlus className="h-5 w-5" />}
          <span className="text-[10px]">Upload</span>
        </Button>
      </div>
      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        multiple={multiple}
        className="hidden"
        onChange={(e) => void handleFiles(e.target.files)}
      />
    </div>
  );
}
