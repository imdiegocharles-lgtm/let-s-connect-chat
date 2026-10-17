import type { ErrorComponentProps } from "@tanstack/react-router";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export function OperacionalError({ error, reset }: Partial<ErrorComponentProps>) {
  if (error) console.error(error);
  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <Card className="p-8 max-w-md text-center">
        <h2 className="text-xl font-bold">Não foi possível carregar o painel</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Houve uma falha temporária. Tente novamente — seus dados de turno e pedidos estão salvos.
        </p>
        {(error as Error | undefined)?.message && (
          <p className="mt-2 text-xs text-muted-foreground break-words">{(error as Error).message}</p>
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
          <Button variant="outline" onClick={() => { if (typeof window !== "undefined") window.location.href = "/"; }}>
            Ir para o site
          </Button>
        </div>
      </Card>
    </div>
  );
}
