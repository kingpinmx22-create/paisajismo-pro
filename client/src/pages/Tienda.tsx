import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { ShoppingCart, Plus, Edit2, Trash2, Search, AlertCircle, CheckCircle2, TreePine, Flower2, Leaf, Mountain, Sprout } from "lucide-react";
import { useState, useMemo } from "react";
import { toast } from "sonner";

const TYPE_ICONS: Record<string, React.ElementType> = {
  tree: TreePine,
  plant: Flower2,
  shrub: Sprout,
  grass: Leaf,
  stone: Mountain,
};

const TYPE_LABELS: Record<string, string> = {
  tree: "Árbol",
  plant: "Planta",
  shrub: "Arbusto",
  grass: "Césped",
  stone: "Piedra",
};

const CLIMATE_LABELS: Record<string, string> = {
  tropical: "Tropical",
  subtropical: "Subtropical",
  temperate: "Templado",
  arid: "Árido",
  mediterranean: "Mediterráneo",
  all: "Universal",
};

const SUN_LABELS: Record<string, string> = {
  full: "Sol pleno",
  partial: "Parcial",
  shade: "Sombra",
};

const MAINT_COLORS: Record<string, string> = {
  low: "bg-green-100 text-green-800",
  medium: "bg-yellow-100 text-yellow-800",
  high: "bg-red-100 text-red-800",
};

export default function Tienda() {
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";

  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [climateFilter, setClimateFilter] = useState("all");
  const [editItem, setEditItem] = useState<any>(null);
  const [showForm, setShowForm] = useState(false);

  const { data: products, isLoading, refetch } = trpc.inventory.list.useQuery({
    type: typeFilter !== "all" ? typeFilter : undefined,
    climate: climateFilter !== "all" ? climateFilter : undefined,
    activeOnly: true,
  });

  const upsertMutation = trpc.inventory.upsert.useMutation({
    onSuccess: () => {
      toast.success("Producto guardado");
      setShowForm(false);
      setEditItem(null);
      refetch();
    },
    onError: (err) => toast.error(err.message),
  });

  const deleteMutation = trpc.inventory.delete.useMutation({
    onSuccess: () => {
      toast.success("Producto eliminado");
      refetch();
    },
    onError: (err) => toast.error(err.message),
  });

  const filtered = useMemo(() => {
    if (!products) return [];
    if (!search.trim()) return products;
    const q = search.toLowerCase();
    return products.filter(p =>
      p.name.toLowerCase().includes(q) ||
      (p.scientificName?.toLowerCase().includes(q)) ||
      (p.description?.toLowerCase().includes(q))
    );
  }, [products, search]);

  const handleSave = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const data: any = {
      name: fd.get("name") as string,
      scientificName: fd.get("scientificName") as string || undefined,
      type: fd.get("type") as any,
      price: fd.get("price") as string,
      stock: parseInt(fd.get("stock") as string),
      climate: fd.get("climate") as any,
      sizeCategory: fd.get("sizeCategory") as any,
      spacingMin: fd.get("spacingMin") as string,
      spacingMax: fd.get("spacingMax") as string,
      sun: fd.get("sun") as any,
      maintenance: fd.get("maintenance") as any,
      waterNeeds: fd.get("waterNeeds") as any,
      description: fd.get("description") as string || undefined,
    };
    if (editItem?.id) data.id = editItem.id;
    upsertMutation.mutate(data);
  };

  return (
    <DashboardLayout>
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <ShoppingCart className="h-6 w-6 text-primary" />
              Tienda — Catálogo de Productos
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              {filtered.length} productos disponibles · Fuente única de verdad para diseño y cotización
            </p>
          </div>
          {isAdmin && (
            <Button
              size="sm"
              className="gap-2"
              onClick={() => { setEditItem(null); setShowForm(true); }}
            >
              <Plus className="h-4 w-4" />
              Agregar producto
            </Button>
          )}
        </div>

        {/* Info box */}
        <Card className="border-blue-200 bg-blue-50">
          <CardContent className="py-3 flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-blue-600 shrink-0 mt-0.5" />
            <div className="text-sm">
              <p className="font-medium text-blue-900">Tienda es el núcleo del sistema</p>
              <p className="text-blue-800 text-xs mt-1">
                Todos los productos aquí se usan en el motor de diseño y cotizador. El stock se valida automáticamente.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Filters */}
        <div className="flex flex-wrap gap-3">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por nombre, especie..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger className="w-36">
              <SelectValue placeholder="Tipo" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos los tipos</SelectItem>
              <SelectItem value="tree">Árboles</SelectItem>
              <SelectItem value="plant">Plantas</SelectItem>
              <SelectItem value="shrub">Arbustos</SelectItem>
              <SelectItem value="grass">Césped</SelectItem>
              <SelectItem value="stone">Piedras</SelectItem>
            </SelectContent>
          </Select>
          <Select value={climateFilter} onValueChange={setClimateFilter}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Clima" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos los climas</SelectItem>
              <SelectItem value="tropical">Tropical</SelectItem>
              <SelectItem value="subtropical">Subtropical</SelectItem>
              <SelectItem value="temperate">Templado</SelectItem>
              <SelectItem value="arid">Árido</SelectItem>
              <SelectItem value="mediterranean">Mediterráneo</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Products grid */}
        {isLoading ? (
          <p className="text-sm text-muted-foreground">Cargando productos...</p>
        ) : filtered.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="flex flex-col items-center gap-4 py-12">
              <ShoppingCart className="h-10 w-10 text-muted-foreground/40" />
              <p className="text-sm text-muted-foreground">No hay productos que coincidan</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.map(product => {
              const Icon = TYPE_ICONS[product.type] || Leaf;
              const stockColor = product.stock > 20 ? "text-emerald-600" : product.stock > 5 ? "text-amber-600" : "text-destructive";
              return (
                <Card key={product.id} className="hover:shadow-md transition-shadow flex flex-col">
                  <CardHeader className="pb-3">
                    <div className="flex items-start gap-2">
                      <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                        <Icon className="h-4 w-4 text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <CardTitle className="text-base line-clamp-1">{product.name}</CardTitle>
                        {product.scientificName && (
                          <CardDescription className="text-xs italic">{product.scientificName}</CardDescription>
                        )}
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="flex-1 space-y-3">
                    {/* Type & Climate */}
                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge variant="outline" className="text-xs">{TYPE_LABELS[product.type]}</Badge>
                      <Badge variant="outline" className="text-xs">{CLIMATE_LABELS[product.climate]}</Badge>
                    </div>

                    {/* Key specs */}
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div>
                        <p className="text-muted-foreground">Sol</p>
                        <p className="font-medium">{SUN_LABELS[product.sun]}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Spacing</p>
                        <p className="font-medium">{product.spacingMin}–{product.spacingMax}m</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Mantenimiento</p>
                        <p className={`font-medium text-xs px-1.5 py-0.5 rounded w-fit ${MAINT_COLORS[product.maintenance]}`}>
                          {product.maintenance === "low" ? "Bajo" : product.maintenance === "medium" ? "Medio" : "Alto"}
                        </p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Agua</p>
                        <p className="font-medium">{product.waterNeeds === "low" ? "Baja" : product.waterNeeds === "medium" ? "Media" : "Alta"}</p>
                      </div>
                    </div>

                    {product.description && (
                      <p className="text-xs text-muted-foreground line-clamp-2">{product.description}</p>
                    )}

                    {/* Price & Stock */}
                    <div className="border-t pt-3 flex items-end justify-between">
                      <div>
                        <p className="text-xs text-muted-foreground">Precio</p>
                        <p className="text-lg font-bold text-primary">${Number(product.price).toFixed(2)}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-xs text-muted-foreground">Stock</p>
                        <p className={`text-lg font-bold ${stockColor}`}>{product.stock}</p>
                      </div>
                    </div>

                    {/* Admin actions */}
                    {isAdmin && (
                      <div className="flex gap-2 pt-2">
                        <Button
                          variant="outline"
                          size="sm"
                          className="flex-1 gap-2"
                          onClick={() => { setEditItem(product); setShowForm(true); }}
                        >
                          <Edit2 className="h-3.5 w-3.5" />
                          Editar
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          className="text-destructive hover:text-destructive"
                          onClick={() => {
                            if (confirm("¿Eliminar este producto?")) {
                              deleteMutation.mutate({ id: product.id });
                            }
                          }}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {/* Form dialog (admin only) */}
      {isAdmin && (
        <Dialog open={showForm} onOpenChange={v => { setShowForm(v); if (!v) setEditItem(null); }}>
          <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editItem ? "Editar producto" : "Nuevo producto"}</DialogTitle>
              <DialogDescription className="text-xs">
                Los cambios aquí afectan inmediatamente el motor de diseño y cotizador
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSave} className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2 space-y-1">
                  <Label>Nombre *</Label>
                  <Input name="name" defaultValue={editItem?.name} required />
                </div>
                <div className="space-y-1">
                  <Label>Nombre científico</Label>
                  <Input name="scientificName" defaultValue={editItem?.scientificName} />
                </div>
                <div className="space-y-1">
                  <Label>Tipo *</Label>
                  <Select name="type" defaultValue={editItem?.type || "plant"}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="tree">Árbol</SelectItem>
                      <SelectItem value="plant">Planta</SelectItem>
                      <SelectItem value="shrub">Arbusto</SelectItem>
                      <SelectItem value="grass">Césped</SelectItem>
                      <SelectItem value="stone">Piedra</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label>Precio (USD) *</Label>
                  <Input name="price" type="number" step="0.01" defaultValue={editItem?.price} required />
                </div>
                <div className="space-y-1">
                  <Label>Stock *</Label>
                  <Input name="stock" type="number" defaultValue={editItem?.stock ?? 0} required />
                </div>
                <div className="space-y-1">
                  <Label>Clima *</Label>
                  <Select name="climate" defaultValue={editItem?.climate || "all"}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="tropical">Tropical</SelectItem>
                      <SelectItem value="subtropical">Subtropical</SelectItem>
                      <SelectItem value="temperate">Templado</SelectItem>
                      <SelectItem value="arid">Árido</SelectItem>
                      <SelectItem value="mediterranean">Mediterráneo</SelectItem>
                      <SelectItem value="all">Universal</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label>Tamaño adulto *</Label>
                  <Select name="sizeCategory" defaultValue={editItem?.sizeCategory || "medium"}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="small">Pequeño</SelectItem>
                      <SelectItem value="medium">Mediano</SelectItem>
                      <SelectItem value="large">Grande</SelectItem>
                      <SelectItem value="xlarge">Muy grande</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label>Spacing mín (m) *</Label>
                  <Input name="spacingMin" type="number" step="0.1" defaultValue={editItem?.spacingMin} required />
                </div>
                <div className="space-y-1">
                  <Label>Spacing máx (m) *</Label>
                  <Input name="spacingMax" type="number" step="0.1" defaultValue={editItem?.spacingMax} required />
                </div>
                <div className="space-y-1">
                  <Label>Sol *</Label>
                  <Select name="sun" defaultValue={editItem?.sun || "full"}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="full">Sol pleno</SelectItem>
                      <SelectItem value="partial">Parcial</SelectItem>
                      <SelectItem value="shade">Sombra</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label>Mantenimiento *</Label>
                  <Select name="maintenance" defaultValue={editItem?.maintenance || "low"}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low">Bajo</SelectItem>
                      <SelectItem value="medium">Medio</SelectItem>
                      <SelectItem value="high">Alto</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label>Necesidad de agua *</Label>
                  <Select name="waterNeeds" defaultValue={editItem?.waterNeeds || "medium"}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low">Baja</SelectItem>
                      <SelectItem value="medium">Media</SelectItem>
                      <SelectItem value="high">Alta</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="col-span-2 space-y-1">
                  <Label>Descripción</Label>
                  <Textarea name="description" defaultValue={editItem?.description} rows={2} />
                </div>
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setShowForm(false)}>Cancelar</Button>
                <Button type="submit" disabled={upsertMutation.isPending}>
                  {upsertMutation.isPending ? "Guardando..." : "Guardar"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      )}
    </DashboardLayout>
  );
}
