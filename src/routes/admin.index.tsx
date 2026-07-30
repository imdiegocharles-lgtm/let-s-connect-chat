import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { hasMyRole } from "@/lib/roles";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import { Loader2, Pencil, Plus, Trash2, LogOut, ArrowLeft, ShieldCheck, ChefHat, Star } from "lucide-react";
import { ImageUploader } from "@/components/admin/ImageUploader";
import { useServerFn } from "@tanstack/react-start";
import {
  listKitchenUsers,
  createKitchenUser,
  updateKitchenPermissions,
  deleteKitchenUser,
} from "@/lib/kitchen-users.functions";

export const Route = createFileRoute("/admin/")({
  head: () => ({
    meta: [
      { title: "Painel Administrativo — Família Amaral" },
      { name: "description", content: "Gerencie categorias, itens do cardápio e bairros de entrega." },
      { name: "robots", content: "noindex,nofollow" },
      { property: "og:title", content: "Painel — Família Amaral" },
      { property: "og:description", content: "Painel administrativo do restaurante." },
    ],
  }),
  component: AdminPage,
});

function AdminPage() {
  const navigate = useNavigate();
  const [status, setStatus] = useState<"loading" | "ok" | "unauth" | "not-admin">("loading");

  useEffect(() => {
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return setStatus("unauth");
      const isAdmin = await hasMyRole("admin");
      setStatus(isAdmin ? "ok" : "not-admin");
    })();
  }, []);

  if (status === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }
  if (status === "unauth") {
    return <LoginChooser />;
  }
  if (status === "not-admin") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background px-4">
        <Card className="p-8 max-w-md text-center">
          <h2 className="text-xl font-bold">Acesso negado</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Sua conta não tem permissão de administrador.
          </p>
          <Button className="mt-4" onClick={async () => { await supabase.auth.signOut(); navigate({ to: "/auth" }); }}>
            Sair
          </Button>
        </Card>
      </div>
    );
  }

  return <AdminDashboard />;
}

function AdminDashboard() {
  const navigate = useNavigate();
  async function signOut() {
    await supabase.auth.signOut();
    navigate({ to: "/auth" });
  }
  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card sticky top-0 z-40">
        <div className="mx-auto max-w-6xl px-4 py-4 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <Link to="/" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
              <ArrowLeft className="h-4 w-4" /> Site
            </Link>
            <h1 className="text-lg sm:text-xl font-bold">Painel Administrativo</h1>
          </div>
          <div className="flex items-center gap-2">
            <Link to="/operacional">
              <Button variant="outline" size="sm">Painel Operacional</Button>
            </Link>
            <Button variant="outline" size="sm" onClick={signOut}>
              <LogOut className="h-4 w-4 mr-2" /> Sair
            </Button>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-6">
        <Tabs defaultValue="items">
          <TabsList>
            <TabsTrigger value="items">Itens</TabsTrigger>
            <TabsTrigger value="categories">Categorias</TabsTrigger>
            <TabsTrigger value="neighborhoods">Bairros</TabsTrigger>
            <TabsTrigger value="kitchen">Usuários Cozinha</TabsTrigger>
            <TabsTrigger value="reservations">🍽️ Reservas</TabsTrigger>
            <TabsTrigger value="reviews">⭐ Avaliações</TabsTrigger>
            <TabsTrigger value="settings">Configurações</TabsTrigger>
          </TabsList>
          <TabsContent value="items" className="mt-6"><ItemsPanel /></TabsContent>
          <TabsContent value="categories" className="mt-6"><CategoriesPanel /></TabsContent>
          <TabsContent value="neighborhoods" className="mt-6"><NeighborhoodsPanel /></TabsContent>
          <TabsContent value="kitchen" className="mt-6"><KitchenUsersPanel /></TabsContent>
          <TabsContent value="reservations" className="mt-6"><ReservationsPanel /></TabsContent>
          <TabsContent value="reviews" className="mt-6"><ReviewsPanel /></TabsContent>
          <TabsContent value="settings" className="mt-6"><SettingsPanel /></TabsContent>
        </Tabs>
      </main>
    </div>
  );
}

/* --------------------------- LOGIN CHOOSER --------------------------- */

function LoginChooser() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="w-full max-w-3xl">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-black">Família Amaral</h1>
          <p className="text-sm text-muted-foreground mt-1">Selecione o tipo de acesso</p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <Link to="/auth" search={{ role: "admin" }}>
            <Card className="p-8 text-center hover:border-primary hover:shadow-lg transition cursor-pointer h-full">
              <ShieldCheck className="h-12 w-12 mx-auto text-primary mb-3" />
              <h2 className="text-xl font-bold">Login Administrativo</h2>
              <p className="text-sm text-muted-foreground mt-2">
                Gerenciar cardápio, bairros, usuários da cozinha e configurações.
              </p>
            </Card>
          </Link>
          <Link to="/auth" search={{ role: "cozinha" }}>
            <Card className="p-8 text-center hover:border-primary hover:shadow-lg transition cursor-pointer h-full">
              <ChefHat className="h-12 w-12 mx-auto text-primary mb-3" />
              <h2 className="text-xl font-bold">Login Cozinha</h2>
              <p className="text-sm text-muted-foreground mt-2">
                Receber pedidos, imprimir cupons e operar o turno.
              </p>
            </Card>
          </Link>
        </div>
        <div className="text-center mt-6">
          <Link to="/" className="text-sm text-muted-foreground hover:text-foreground inline-flex items-center gap-1">
            <ArrowLeft className="h-3 w-3" /> Voltar ao site
          </Link>
        </div>
      </div>
    </div>
  );
}

/* --------------------------- KITCHEN USERS --------------------------- */

type Perms = {
  can_open_close_shift: boolean;
  can_confirm_payment: boolean;
  can_manage_menu: boolean;
  can_update_order_status: boolean;
};

const PERM_LABELS: Record<keyof Perms, string> = {
  can_open_close_shift: "Abrir/fechar turno",
  can_confirm_payment: "Confirmar pagamento",
  can_manage_menu: "Gerenciar disponibilidade do cardápio",
  can_update_order_status: "Atualizar status de pedidos",
};

function KitchenUsersPanel() {
  const qc = useQueryClient();
  const list = useServerFn(listKitchenUsers);
  const create = useServerFn(createKitchenUser);
  const updatePerms = useServerFn(updateKitchenPermissions);
  const remove = useServerFn(deleteKitchenUser);

  const { data: users, isLoading } = useQuery({
    queryKey: ["kitchen-users"],
    queryFn: () => list({}),
  });

  const [newEmail, setNewEmail] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [newPerms, setNewPerms] = useState<Perms>({
    can_open_close_shift: true,
    can_confirm_payment: true,
    can_manage_menu: true,
    can_update_order_status: true,
  });

  const createMut = useMutation({
    mutationFn: () =>
      create({ data: { email: newEmail, password: newPassword, permissions: newPerms } }),
    onSuccess: () => {
      toast.success("Usuário da cozinha criado");
      setNewEmail(""); setNewPassword("");
      qc.invalidateQueries({ queryKey: ["kitchen-users"] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  const updateMut = useMutation({
    mutationFn: (v: { user_id: string; permissions: Perms }) => updatePerms({ data: v }),
    onSuccess: () => {
      toast.success("Permissões atualizadas");
      qc.invalidateQueries({ queryKey: ["kitchen-users"] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  const delMut = useMutation({
    mutationFn: (user_id: string) => remove({ data: { user_id } }),
    onSuccess: () => {
      toast.success("Usuário removido");
      qc.invalidateQueries({ queryKey: ["kitchen-users"] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  return (
    <div className="space-y-6">
      <Card className="p-4">
        <h3 className="font-semibold mb-3 flex items-center gap-2">
          <Plus className="h-4 w-4" /> Novo usuário da cozinha
        </h3>
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <Label>E-mail</Label>
            <Input type="email" value={newEmail} onChange={(e) => setNewEmail(e.target.value)} />
          </div>
          <div>
            <Label>Senha (mín. 6)</Label>
            <Input type="text" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} />
          </div>
        </div>
        <div className="mt-4 space-y-2">
          <p className="text-sm font-medium">Permissões</p>
          {(Object.keys(PERM_LABELS) as (keyof Perms)[]).map((k) => (
            <label key={k} className="flex items-center gap-2 text-sm">
              <Switch
                checked={newPerms[k]}
                onCheckedChange={(v) => setNewPerms((p) => ({ ...p, [k]: v }))}
              />
              {PERM_LABELS[k]}
            </label>
          ))}
        </div>
        <div className="mt-4 flex justify-end">
          <Button
            onClick={() => createMut.mutate()}
            disabled={createMut.isPending || !newEmail || newPassword.length < 6}
          >
            {createMut.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Criar usuário
          </Button>
        </div>
      </Card>

      <div>
        <h3 className="font-semibold mb-3">Usuários existentes</h3>
        {isLoading ? <Loader2 className="h-6 w-6 animate-spin" /> : (
          <div className="grid gap-3">
            {(users ?? []).map((u: any) => (
              <Card key={u.id} className="p-4">
                <div className="flex items-center justify-between gap-3 mb-3">
                  <div>
                    <div className="font-medium">{u.email}</div>
                    <div className="text-xs text-muted-foreground">
                      Criado em {u.created_at ? new Date(u.created_at).toLocaleDateString("pt-BR") : "—"}
                    </div>
                  </div>
                  <ConfirmDelete onConfirm={() => delMut.mutate(u.id)} label={`Excluir ${u.email}?`} />
                </div>
                <div className="grid gap-2 sm:grid-cols-2">
                  {(Object.keys(PERM_LABELS) as (keyof Perms)[]).map((k) => (
                    <label key={k} className="flex items-center gap-2 text-sm">
                      <Switch
                        checked={!!u.permissions?.[k]}
                        onCheckedChange={(v) =>
                          updateMut.mutate({
                            user_id: u.id,
                            permissions: { ...u.permissions, [k]: v },
                          })
                        }
                      />
                      {PERM_LABELS[k]}
                    </label>
                  ))}
                </div>
              </Card>
            ))}
            {(users ?? []).length === 0 && (
              <p className="text-sm text-muted-foreground">Nenhum usuário da cozinha cadastrado.</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

/* --------------------------- CATEGORIES --------------------------- */

type Category = { id: string; name: string; sort_order: number };

function CategoriesPanel() {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ["admin-categories"],
    queryFn: async () => {
      const { data, error } = await supabase.from("menu_categories").select("*").order("sort_order");
      if (error) throw error;
      return (data ?? []) as unknown as Category[];
    },
  });

  const del = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("menu_categories").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Categoria excluída"); qc.invalidateQueries({ queryKey: ["admin-categories"] }); },
    onError: (e: any) => toast.error(e.message),
  });

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-lg font-semibold">Categorias</h2>
        <CategoryDialog trigger={<Button size="sm"><Plus className="h-4 w-4 mr-1" /> Nova categoria</Button>} />
      </div>
      {isLoading ? <Loader2 className="h-6 w-6 animate-spin" /> : (
        <div className="grid gap-2">
          {data?.map((c) => (
            <Card key={c.id} className="p-3 flex items-center justify-between">
              <div>
                <div className="font-medium">{c.name}</div>
                <div className="text-xs text-muted-foreground">
                  Ordem: {c.sort_order} · {(c as any).available_lunch ? "Almoço ✓" : "Almoço ✗"} · {(c as any).available_dinner ? "Churrasco ✓" : "Churrasco ✗"}
                </div>
              </div>
              <div className="flex gap-2">
                <CategoryDialog category={c} trigger={<Button size="icon" variant="ghost"><Pencil className="h-4 w-4" /></Button>} />
                <ConfirmDelete onConfirm={() => del.mutate(c.id)} label={`Excluir "${c.name}"?`} />
              </div>
            </Card>
          ))}
          {data?.length === 0 && <p className="text-sm text-muted-foreground">Nenhuma categoria.</p>}
        </div>
      )}
    </div>
  );
}

function CategoryDialog({ category, trigger }: { category?: Category; trigger: React.ReactNode }) {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState(category?.name ?? "");
  const [sortOrder, setSortOrder] = useState(category?.sort_order ?? 0);
  const [availLunch, setAvailLunch] = useState<boolean>((category as any)?.available_lunch ?? true);
  const [availDinner, setAvailDinner] = useState<boolean>((category as any)?.available_dinner ?? true);

  useEffect(() => {
    if (open) {
      setName(category?.name ?? "");
      setSortOrder(category?.sort_order ?? 0);
      setAvailLunch((category as any)?.available_lunch ?? true);
      setAvailDinner((category as any)?.available_dinner ?? true);
    }
  }, [open, category]);

  const save = useMutation({
    mutationFn: async () => {
      const payload: any = { name, sort_order: sortOrder, available_lunch: availLunch, available_dinner: availDinner };
      if (category) {
        const { error } = await supabase.from("menu_categories").update(payload).eq("id", category.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("menu_categories").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success("Salvo");
      qc.invalidateQueries({ queryKey: ["admin-categories"] });
      setOpen(false);
    },
    onError: (e: any) => toast.error(e.message),
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent>
        <DialogHeader><DialogTitle>{category ? "Editar categoria" : "Nova categoria"}</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div><Label>Nome</Label><Input value={name} onChange={(e) => setName(e.target.value)} /></div>
          <div><Label>Ordem</Label><Input type="number" value={sortOrder} onChange={(e) => setSortOrder(Number(e.target.value))} /></div>
          <div className="flex items-center gap-6 pt-1">
            <label className="flex items-center gap-2 text-sm"><Switch checked={availLunch} onCheckedChange={setAvailLunch} /> Disponível no almoço</label>
            <label className="flex items-center gap-2 text-sm"><Switch checked={availDinner} onCheckedChange={setAvailDinner} /> Disponível no jantar/churrasco</label>
          </div>
        </div>
        <DialogFooter>
          <Button onClick={() => save.mutate()} disabled={save.isPending || !name}>
            {save.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Salvar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* --------------------------- ITEMS --------------------------- */

type MenuItem = {
  id: string;
  category_id: string;
  name: string;
  description: string | null;
  price: number;
  image_url: string | null;
  is_available: boolean;
  sort_order: number;
};

function ItemsPanel() {
  const qc = useQueryClient();
  const { data: cats } = useQuery({
    queryKey: ["admin-categories"],
    queryFn: async () => {
      const { data, error } = await supabase.from("menu_categories").select("*").order("sort_order");
      if (error) throw error;
      return (data ?? []) as unknown as Category[];
    },
  });
  const { data: items, isLoading } = useQuery({
    queryKey: ["admin-items"],
    queryFn: async () => {
      const { data, error } = await supabase.from("menu_items").select("*").order("sort_order");
      if (error) throw error;
      return data as MenuItem[];
    },
  });

  const del = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("menu_items").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Item excluído"); qc.invalidateQueries({ queryKey: ["admin-items"] }); },
    onError: (e: any) => toast.error(e.message),
  });

  const toggle = useMutation({
    mutationFn: async (it: MenuItem) => {
      const { error } = await supabase.from("menu_items").update({ is_available: !it.is_available }).eq("id", it.id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin-items"] }),
    onError: (e: any) => toast.error(e.message),
  });

  const byCat: Record<string, MenuItem[]> = {};
  items?.forEach((i) => { (byCat[i.category_id] ??= []).push(i); });

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-lg font-semibold">Itens do cardápio</h2>
        {cats && <ItemDialog categories={cats} trigger={<Button size="sm"><Plus className="h-4 w-4 mr-1" /> Novo item</Button>} />}
      </div>
      {isLoading ? <Loader2 className="h-6 w-6 animate-spin" /> : (
        <div className="space-y-6">
          {cats?.map((c) => (
            <div key={c.id}>
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-2">{c.name}</h3>
              <div className="grid gap-2">
                {(byCat[c.id] ?? []).map((it) => (
                  <Card key={it.id} className="p-3 flex items-center justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="font-medium truncate">{it.name}</div>
                      {it.description && <div className="text-xs text-muted-foreground line-clamp-1">{it.description}</div>}
                      <div className="text-sm font-semibold text-primary mt-1">R$ {Number(it.price).toFixed(2).replace(".", ",")}</div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Switch checked={it.is_available} onCheckedChange={() => toggle.mutate(it)} />
                      {cats && <ItemDialog categories={cats} item={it} trigger={<Button size="icon" variant="ghost"><Pencil className="h-4 w-4" /></Button>} />}
                      <ConfirmDelete onConfirm={() => del.mutate(it.id)} label={`Excluir "${it.name}"?`} />
                    </div>
                  </Card>
                ))}
                {(byCat[c.id] ?? []).length === 0 && <p className="text-xs text-muted-foreground">Sem itens nesta categoria.</p>}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function ItemDialog({ item, categories, trigger }: { item?: MenuItem; categories: Category[]; trigger: React.ReactNode }) {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [categoryId, setCategoryId] = useState(item?.category_id ?? categories[0]?.id ?? "");
  const [name, setName] = useState(item?.name ?? "");
  const [description, setDescription] = useState(item?.description ?? "");
  const [price, setPrice] = useState(item?.price?.toString() ?? "");
  const [imageUrl, setImageUrl] = useState<string | null>(item?.image_url ?? null);
  const [available, setAvailable] = useState(item?.is_available ?? true);
  const [sortOrder, setSortOrder] = useState(item?.sort_order ?? 0);

  useEffect(() => {
    if (open) {
      setCategoryId(item?.category_id ?? categories[0]?.id ?? "");
      setName(item?.name ?? "");
      setDescription(item?.description ?? "");
      setPrice(item?.price?.toString() ?? "");
      setImageUrl(item?.image_url ?? null);
      setAvailable(item?.is_available ?? true);
      setSortOrder(item?.sort_order ?? 0);
    }
  }, [open, item, categories]);

  const save = useMutation({
    mutationFn: async () => {
      const payload = {
        category_id: categoryId,
        name,
        description: description || null,
        price: Number(price.replace(",", ".")),
        image_url: imageUrl || null,
        is_available: available,
        sort_order: sortOrder,
      };
      if (item) {
        const { error } = await supabase.from("menu_items").update(payload).eq("id", item.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("menu_items").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success("Salvo");
      qc.invalidateQueries({ queryKey: ["admin-items"] });
      setOpen(false);
    },
    onError: (e: any) => toast.error(e.message),
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle>{item ? "Editar item" : "Novo item"}</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div>
            <Label>Categoria</Label>
            <Select value={categoryId} onValueChange={setCategoryId}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {categories.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div><Label>Nome</Label><Input value={name} onChange={(e) => setName(e.target.value)} /></div>
          <div><Label>Descrição</Label><Textarea value={description ?? ""} onChange={(e) => setDescription(e.target.value)} rows={3} /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><Label>Preço (R$)</Label><Input value={price} onChange={(e) => setPrice(e.target.value)} placeholder="0,00" /></div>
            <div><Label>Ordem</Label><Input type="number" value={sortOrder} onChange={(e) => setSortOrder(Number(e.target.value))} /></div>
          </div>
          <div>
            <Label>Foto do produto</Label>
            <ImageUploader value={imageUrl} onChange={setImageUrl} />
          </div>
          <div className="flex items-center gap-2">
            <Switch checked={available} onCheckedChange={setAvailable} />
            <Label>Disponível para pedido</Label>
          </div>
        </div>
        <DialogFooter>
          <Button onClick={() => save.mutate()} disabled={save.isPending || !name || !price || !categoryId}>
            {save.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Salvar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* --------------------------- NEIGHBORHOODS --------------------------- */

type Neighborhood = { id: string; name: string; fee: number };

function NeighborhoodsPanel() {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ["admin-neighborhoods"],
    queryFn: async () => {
      const { data, error } = await supabase.from("neighborhoods").select("*").order("name");
      if (error) throw error;
      return (data ?? []) as unknown as Neighborhood[];
    },
  });

  const del = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("neighborhoods").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Bairro excluído"); qc.invalidateQueries({ queryKey: ["admin-neighborhoods"] }); },
    onError: (e: any) => toast.error(e.message),
  });

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-lg font-semibold">Bairros e taxas de entrega</h2>
        <NeighborhoodDialog trigger={<Button size="sm"><Plus className="h-4 w-4 mr-1" /> Novo bairro</Button>} />
      </div>
      {isLoading ? <Loader2 className="h-6 w-6 animate-spin" /> : (
        <div className="grid gap-2">
          {data?.map((n) => (
            <Card key={n.id} className="p-3 flex items-center justify-between">
              <div>
                <div className="font-medium">{n.name}</div>
                <div className="text-xs text-muted-foreground">Taxa: R$ {Number(n.fee).toFixed(2).replace(".", ",")}</div>
              </div>
              <div className="flex gap-2">
                <NeighborhoodDialog neighborhood={n} trigger={<Button size="icon" variant="ghost"><Pencil className="h-4 w-4" /></Button>} />
                <ConfirmDelete onConfirm={() => del.mutate(n.id)} label={`Excluir "${n.name}"?`} />
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

function NeighborhoodDialog({ neighborhood, trigger }: { neighborhood?: Neighborhood; trigger: React.ReactNode }) {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState(neighborhood?.name ?? "");
  const [fee, setFee] = useState(neighborhood?.fee?.toString() ?? "");

  useEffect(() => {
    if (open) {
      setName(neighborhood?.name ?? "");
      setFee(neighborhood?.fee?.toString() ?? "");
    }
  }, [open, neighborhood]);

  const save = useMutation({
    mutationFn: async () => {
      const payload = { name, fee: Number(fee.replace(",", ".")) };
      if (neighborhood) {
        const { error } = await supabase.from("neighborhoods").update(payload).eq("id", neighborhood.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("neighborhoods").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success("Salvo");
      qc.invalidateQueries({ queryKey: ["admin-neighborhoods"] });
      setOpen(false);
    },
    onError: (e: any) => toast.error(e.message),
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent>
        <DialogHeader><DialogTitle>{neighborhood ? "Editar bairro" : "Novo bairro"}</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div><Label>Nome</Label><Input value={name} onChange={(e) => setName(e.target.value)} /></div>
          <div><Label>Taxa de entrega (R$)</Label><Input value={fee} onChange={(e) => setFee(e.target.value)} placeholder="0,00" /></div>
        </div>
        <DialogFooter>
          <Button onClick={() => save.mutate()} disabled={save.isPending || !name || !fee}>
            {save.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Salvar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* --------------------------- helpers --------------------------- */

function ConfirmDelete({ onConfirm, label }: { onConfirm: () => void; label: string }) {
  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button size="icon" variant="ghost" className="text-destructive"><Trash2 className="h-4 w-4" /></Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{label}</AlertDialogTitle>
          <AlertDialogDescription>Esta ação não pode ser desfeita.</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancelar</AlertDialogCancel>
          <AlertDialogAction onClick={onConfirm}>Excluir</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

function SettingsPanel() {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ["system_settings"],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("system_settings")
        .select("*")
        .eq("id", 1)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });
  const [form, setForm] = useState<any>(null);
  useEffect(() => { if (data) setForm({ ...data, report_emails: (data.report_emails ?? []).join(", ") }); }, [data]);

  const save = useMutation({
    mutationFn: async () => {
      const payload = {
        lunch_start: form.lunch_start,
        lunch_end: form.lunch_end,
        dinner_start: form.dinner_start,
        dinner_end: form.dinner_end,
        avg_prep_minutes: Number(form.avg_prep_minutes) || 30,
        min_order_value: Number(form.min_order_value) || 0,
        printer_url: form.printer_url,
        report_emails: String(form.report_emails || "")
          .split(",").map((s: string) => s.trim()).filter(Boolean),
      };
      const { error } = await (supabase as any).from("system_settings").update(payload).eq("id", 1);
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Configurações salvas"); qc.invalidateQueries({ queryKey: ["system_settings"] }); qc.invalidateQueries({ queryKey: ["menu"] }); },
    onError: (e: any) => toast.error(e.message),
  });

  if (isLoading || !form) return <Loader2 className="h-5 w-5 animate-spin" />;
  return (
    <Card className="p-6 max-w-2xl space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <div><Label>Almoço — início</Label><Input type="time" value={form.lunch_start?.slice(0,5)} onChange={(e) => setForm({ ...form, lunch_start: e.target.value })} /></div>
        <div><Label>Almoço — fim</Label><Input type="time" value={form.lunch_end?.slice(0,5)} onChange={(e) => setForm({ ...form, lunch_end: e.target.value })} /></div>
        <div><Label>Churrasco — início</Label><Input type="time" value={form.dinner_start?.slice(0,5)} onChange={(e) => setForm({ ...form, dinner_start: e.target.value })} /></div>
        <div><Label>Churrasco — fim</Label><Input type="time" value={form.dinner_end?.slice(0,5)} onChange={(e) => setForm({ ...form, dinner_end: e.target.value })} /></div>
        <div><Label>Tempo médio de preparo (min)</Label><Input type="number" value={form.avg_prep_minutes} onChange={(e) => setForm({ ...form, avg_prep_minutes: e.target.value })} /></div>
        <div><Label>Pedido mínimo (R$)</Label><Input type="number" step="0.01" value={form.min_order_value} onChange={(e) => setForm({ ...form, min_order_value: e.target.value })} /></div>
      </div>
      <div><Label>URL do agente da impressora</Label><Input value={form.printer_url} onChange={(e) => setForm({ ...form, printer_url: e.target.value })} placeholder="http://localhost:8080/print" /></div>
      <div><Label>E-mails para relatórios (separe por vírgula)</Label><Input value={form.report_emails} onChange={(e) => setForm({ ...form, report_emails: e.target.value })} placeholder="ex: dono@restaurante.com, gerente@restaurante.com" /></div>
      <Button onClick={() => save.mutate()} disabled={save.isPending}>{save.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}Salvar configurações</Button>
    </Card>
  );
}

/* --------------------------- RESERVATIONS --------------------------- */

const LOCATION_LABELS: Record<string, string> = {
  varanda: "Varanda",
  salao: "Salão",
  segundo_andar: "Segundo Andar (AC)",
};

const STATUS_LABELS: Record<string, { label: string; className: string }> = {
  pendente: { label: "🟡 Pendente", className: "bg-yellow-100 text-yellow-800" },
  confirmada: { label: "🟢 Confirmada", className: "bg-green-100 text-green-800" },
  cancelada: { label: "🔴 Cancelada", className: "bg-red-100 text-red-800" },
};

function ReservationsPanel() {
  const qc = useQueryClient();
  const [searchName, setSearchName] = useState("");
  const [searchPhone, setSearchPhone] = useState("");
  const [filterDate, setFilterDate] = useState("");

  const { data, isLoading } = useQuery({
    queryKey: ["admin-reservations"],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("reservations")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const updateStatus = useMutation({
    mutationFn: async (v: { id: string; status: string }) => {
      const { error } = await (supabase as any)
        .from("reservations").update({ status: v.status }).eq("id", v.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Status atualizado");
      qc.invalidateQueries({ queryKey: ["admin-reservations"] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  const del = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase as any).from("reservations").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Reserva excluída");
      qc.invalidateQueries({ queryKey: ["admin-reservations"] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  const filtered = (data ?? []).filter((r: any) => {
    if (searchName && !r.customer_name.toLowerCase().includes(searchName.toLowerCase())) return false;
    if (searchPhone && !r.phone.includes(searchPhone)) return false;
    if (filterDate && r.reservation_date !== filterDate) return false;
    return true;
  });

  return (
    <div className="space-y-4">
      <Card className="p-4 grid gap-3 sm:grid-cols-3">
        <div>
          <Label>Buscar por nome</Label>
          <Input value={searchName} onChange={(e) => setSearchName(e.target.value)} placeholder="Nome do cliente" />
        </div>
        <div>
          <Label>Buscar por telefone</Label>
          <Input value={searchPhone} onChange={(e) => setSearchPhone(e.target.value)} placeholder="Telefone" />
        </div>
        <div>
          <Label>Filtrar por data</Label>
          <Input type="date" value={filterDate} onChange={(e) => setFilterDate(e.target.value)} />
        </div>
      </Card>

      {isLoading ? (
        <Loader2 className="h-6 w-6 animate-spin" />
      ) : (
        <div className="grid gap-3">
          {filtered.map((r: any) => {
            const s = STATUS_LABELS[r.status] ?? STATUS_LABELS.pendente;
            return (
              <Card key={r.id} className="p-4">
                <div className="flex items-start justify-between gap-3 flex-wrap">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold">{r.customer_name}</span>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${s.className}`}>{s.label}</span>
                    </div>
                    <div className="text-sm text-muted-foreground">
                      📞 {r.phone} · 👥 {r.people_count} pessoas · 📍 {LOCATION_LABELS[r.location] ?? r.location}
                    </div>
                    <div className="text-sm">
                      📅 <strong>Data da reserva:</strong>{" "}
                      {new Date(r.reservation_date + "T00:00:00").toLocaleDateString("pt-BR")}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      Solicitado em {new Date(r.created_at).toLocaleString("pt-BR")}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Select value={r.status} onValueChange={(v) => updateStatus.mutate({ id: r.id, status: v })}>
                      <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="pendente">🟡 Pendente</SelectItem>
                        <SelectItem value="confirmada">🟢 Confirmada</SelectItem>
                        <SelectItem value="cancelada">🔴 Cancelada</SelectItem>
                      </SelectContent>
                    </Select>
                    <ConfirmDelete onConfirm={() => del.mutate(r.id)} label={`Excluir reserva de ${r.customer_name}?`} />
                  </div>
                </div>
              </Card>
            );
          })}
          {filtered.length === 0 && (
            <p className="text-sm text-muted-foreground">Nenhuma reserva encontrada.</p>
          )}
        </div>
      )}
    </div>
  );
}

/* --------------------------- REVIEWS --------------------------- */

function ReviewsPanel() {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ["admin-reviews"],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("reviews")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const del = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase as any).from("reviews").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Avaliação excluída");
      qc.invalidateQueries({ queryKey: ["admin-reviews"] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  return (
    <div className="space-y-3">
      {isLoading ? (
        <Loader2 className="h-6 w-6 animate-spin" />
      ) : (data ?? []).length === 0 ? (
        <p className="text-sm text-muted-foreground">Nenhuma avaliação recebida ainda.</p>
      ) : (
        (data ?? []).map((r: any) => (
          <Card key={r.id} className="p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="flex items-center gap-0.5 mb-1">
                  {[1, 2, 3, 4, 5].map((n) => (
                    <Star
                      key={n}
                      className={`h-4 w-4 ${n <= r.rating ? "fill-primary text-primary" : "text-muted-foreground/30"}`}
                    />
                  ))}
                  <span className="ml-2 text-xs text-muted-foreground">
                    {new Date(r.created_at).toLocaleString("pt-BR")}
                  </span>
                </div>
                {r.comment ? (
                  <p className="text-sm whitespace-pre-wrap">{r.comment}</p>
                ) : (
                  <p className="text-sm italic text-muted-foreground">Sem comentário</p>
                )}
              </div>
              <ConfirmDelete onConfirm={() => del.mutate(r.id)} label="Excluir esta avaliação?" />
            </div>
          </Card>
        ))
      )}
    </div>
  );
}
