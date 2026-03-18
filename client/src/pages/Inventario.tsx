import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { trpc } from "@/lib/trpc";
import { Package, Search, Plus, Edit2, Leaf, TreePine, Mountain, Sprout, Flower2 } from "lucide-react";
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

export default function Inventario() {
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [climateFilter, setClimateFilter] = useState("all");
  const [editItem, setEditItem] = useState<any>(null);
  const [showForm, setShowForm] = useState(false);

  const { data: plants, isLoading, refetch } = trpc.inventory.list.useQuery({
    type: typeFilter !== "all" ? typeFilter : undefined,
    climate: climateFilter !== "all" ? climateFilter : undefined,
    activeOnly: true,
  });

  const upsertMutation = trpc.inventory.upsert.useMutation({
    onSuccess: () => { toast.success("Guardado"); setShowForm(false); setEditItem(null); refetch(); },
    onError: (err) => toast.error(err.message),
  });

  const deleteMutation = trpc.inventory.delete.useMutation({
    onSuccess: () => { toast.success("Eliminado"); refetch(); },
    onError: (err) => toast.error(err.message),
  });

  const filtered = useMemo(() => {
    if (!plants) return [];
    if (!search.trim()) return plants;
    const q = search.toLowerCase();
    return plants.filter(p =>
      p.name.toLowerCase().includes(q) ||
      (p.scientificName?.toLowerCase().includes(q)) ||
      (p.description?.toLowerCase().includes(q))
    );
  }, [plants, search]);

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
      <div className="max-w-5xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold flex items-center gap-2">
              <Package className="h-5 w-5 text-primary" />
              Módulo 4 — Inventario
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              {filtered.length} elementos disponibles
            </p>
          </div>
          <Button
            size="sm"
            className="gap-2"
            onClick={() => { setEditItem(null); setShowForm(true); }}
          >
            <Plus className="h-4 w-4" />
            Agregar elemento
          </Button>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-3">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por nombre..."
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

        {/* Plant table */}
        {isLoading ? (
          <p className="text-sm text-muted-foreground">Cargando inventario...</p>
        ) : (
          <div className="space-y-2">
            {filtered.map(plant => {
              const Icon = TYPE_ICONS[plant.type] || Leaf;
              return (
                <Card key={plant.id} className="hover:shadow-sm transition-shadow">
                  <CardContent className="py-3 px-4">
                    <div className="flex items-center gap-3 flex-wrap">
                      <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                        <Icon className="h-4 w-4 text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="font-medium text-sm">{plant.name}</p>
                          {plant.scientificName && (
                            <p className="text-xs text-muted-foreground italic">{plant.scientificName}</p>
                          )}
                        </div>
                        <div className="flex items-center gap-2 mt-1 flex-wrap">
                          <Badge variant="outline" className="text-xs">{TYPE_LABELS[plant.type]}</Badge>
                          <Badge variant="outline" className="text-xs">{CLIMATE_LABELS[plant.climate]}</Badge>
                          <span className="text-xs text-muted-foreground">{SUN_LABELS[plant.sun]}</span>
                          <span className="text-xs text-muted-foreground">Spacing: {plant.spacingMin}–{plant.spacingMax}m</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-4 shrink-0">
                        <div className="text-right">
                          <p className="font-bold text-sm text-primary">${Number(plant.price).toFixed(2)}</p>
                          <p className="text-xs text-muted-foreground">Stock: {plant.stock}</p>
                        </div>
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${MAINT_COLORS[plant.maintenance]}`}>
                          {plant.maintenance === "low" ? "Bajo" : plant.maintenance === "medium" ? "Medio" : "Alto"}
                        </span>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7"
                          onClick={() => { setEditItem(plant); setShowForm(true); }}
                        >
                          <Edit2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                    {plant.description && (
                      <p className="text-xs text-muted-foreground mt-2 ml-11 line-clamp-1">{plant.description}</p>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {/* Form dialog */}
      <Dialog open={showForm} onOpenChange={v => { setShowForm(v); if (!v) setEditItem(null); }}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editItem ? "Editar elemento" : "Nuevo elemento"}</DialogTitle>
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
                <Label>Tamaño *</Label>
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
                <Input name="description" defaultValue={editItem?.description} />
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
    </DashboardLayout>
  );
}
