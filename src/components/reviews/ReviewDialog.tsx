import { useState } from "react";
import { Star, Loader2 } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export function ReviewDialog({ trigger }: { trigger: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const [rating, setRating] = useState(0);
  const [hover, setHover] = useState(0);
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  function reset() { setRating(0); setHover(0); setComment(""); setSuccess(false); }

  async function submit() {
    if (rating < 1) return toast.error("Escolha de 1 a 5 estrelas");
    setSubmitting(true);
    const { error } = await supabase.from("reviews" as any).insert({
      rating,
      comment: comment.trim() || null,
    });
    setSubmitting(false);
    if (error) return toast.error(error.message);
    setSuccess(true);
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) reset(); }}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader><DialogTitle>Deixe sua avaliação</DialogTitle></DialogHeader>
        {success ? (
          <div className="py-6 text-center space-y-3">
            <div className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-primary/10 text-primary text-2xl">★</div>
            <p className="text-sm">Obrigado! Sua avaliação foi enviada anonimamente.</p>
            <Button onClick={() => setOpen(false)}>Fechar</Button>
          </div>
        ) : (
          <div className="space-y-4">
            <p className="text-xs text-muted-foreground">Sua avaliação é 100% anônima. Não coletamos nome, e-mail ou telefone.</p>
            <div className="flex justify-center gap-1">
              {[1, 2, 3, 4, 5].map((n) => (
                <button
                  key={n}
                  type="button"
                  onMouseEnter={() => setHover(n)}
                  onMouseLeave={() => setHover(0)}
                  onClick={() => setRating(n)}
                  className="p-1"
                  aria-label={`${n} estrela${n > 1 ? "s" : ""}`}
                >
                  <Star
                    className={`h-9 w-9 transition ${
                      (hover || rating) >= n ? "fill-primary text-primary" : "text-muted-foreground/40"
                    }`}
                  />
                </button>
              ))}
            </div>
            <Textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Conte sua experiência (opcional)"
              rows={4}
            />
            <Button className="w-full" onClick={submit} disabled={submitting}>
              {submitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Enviar Avaliação
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}