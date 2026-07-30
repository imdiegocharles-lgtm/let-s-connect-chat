import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export function PainelError({ error, reset }: { error?: Error; reset?: () => void }) {
  if (error) console.error(error);
  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <Card className="p-8 max-w-md text-center">
        <h2 className="text-xl font-bold">Não foi possível carregar a página</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Houve uma falha temporária. Tente novamente — nenhum dado foi perdido.
        </p>
        {error?.message && (
          <p className="mt-2 text-xs text-muted-foreground break-words">{error.message}</p>
        )}
        <div className="mt-4 flex justify-center gap-2">
          <Button
            onClick={() => {
              reset?.();
              if (typeof window !== "undefined") window.location.reload();
            }}
          >
            Tentar novamente
          </Button>
          <Button
            variant="outline"
            onClick={() => {
              if (typeof window !== "undefined") window.location.href = "/";
            }}
          >
            Ir para o site
          </Button>
        </div>
      </Card>
    </div>
  );
}