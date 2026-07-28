import { useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Loader2, Upload, Trash2 } from "lucide-react";
import { toast } from "sonner";

type Props = {
  value: string | null;
  onChange: (url: string | null) => void;
};

export function ImageUploader({ value, onChange }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);

  async function handleFile(file: File) {
    if (!file.type.startsWith("image/")) {
      toast.error("Selecione uma imagem");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Imagem muito grande (máx 5MB)");
      return;
    }
    setBusy(true);
    try {
      const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
      const path = `${crypto.randomUUID()}-${Date.now()}.${ext}`;
      const { error } = await supabase.storage
        .from("menu-images")
        .upload(path, file, { contentType: file.type, upsert: false });
      if (error) throw error;
      const { data } = supabase.storage.from("menu-images").getPublicUrl(path);
      onChange(data.publicUrl);
      toast.success("Foto enviada");
    } catch (e: any) {
      toast.error(e.message ?? "Falha no upload");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-2">
      {value ? (
        <div className="relative w-full aspect-[4/3] overflow-hidden rounded-lg border border-border bg-muted">
          <img src={value} alt="Foto do produto" className="h-full w-full object-cover" />
        </div>
      ) : (
        <div className="flex h-32 w-full items-center justify-center rounded-lg border border-dashed border-border bg-muted/40 text-xs text-muted-foreground">
          Nenhuma foto
        </div>
      )}
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) handleFile(f);
          e.target.value = "";
        }}
      />
      <div className="flex gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={busy}
          onClick={() => inputRef.current?.click()}
        >
          {busy ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Upload className="h-4 w-4 mr-2" />}
          {value ? "Trocar foto" : "Enviar foto"}
        </Button>
        {value && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            disabled={busy}
            onClick={() => onChange(null)}
          >
            <Trash2 className="h-4 w-4 mr-2" /> Remover
          </Button>
        )}
      </div>
    </div>
  );
}