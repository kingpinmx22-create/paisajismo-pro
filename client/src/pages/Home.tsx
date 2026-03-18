import DashboardLayout from "@/components/DashboardLayout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { trpc } from "@/lib/trpc";
import { FolderOpen, Plus, Trash2, ArrowRight, Leaf, Camera, ScanSearch, Eraser, Cpu, Calculator, Eye } from "lucide-react";
import { useState } from "react";
import { useLocation } from "wouter";
import { toast } from "sonner";

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  capturing:  { label: "Captura",       color: "bg-blue-100 text-blue-800" },
  analyzing:  { label: "Analizando",    color: "bg-yellow-100 text-yellow-800" },
  cleaning:   { label: "Limpieza",      color: "bg-orange-100 text-orange-800" },
  designing:  { label: "Diseñando",     color: "bg-purple-100 text-purple-800" },
  quoted:     { label: "Cotizado",      color: "bg-green-100 text-green-800" },
  saved:      { label: "Guardado",      color: "bg-emerald-100 text-emerald-800" },
};

const STATUS_NEXT_ROUTE: Record<string, string> = {
  capturing:  "/captura",
  analyzing:  "/analisis",
  cleaning:   "/limpieza",
  designing:  "/diseno",
  quoted:     "/cotizador",
  saved:      "/visualizacion",
};

export default function Home() {
  const [, setLocation] = useLocation();
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState("");

  const { data: projects, isLoading, refetch } = trpc.projects.list.useQuery();
  const createMutation = trpc.projects.create.useMutation({
    onSuccess: (data) => {
      toast.success("Proyecto creado");
      setShowCreate(false);
      setNewName("");
      // Store project id and navigate to capture
      localStorage.setItem("currentProjectId", String(data.id));
      setLocation("/captura");
    },
    onError: (err) => toast.error(err.message),
  });
  const deleteMutation = trpc.projects.delete.useMutation({
    onSuccess: () => { toast.success("Proyecto eliminado"); refetch(); },
    onError: (err) => toast.error(err.message),
  });

  const openProject = (id: number, status: string) => {
    localStorage.setItem("currentProjectId", String(id));
    const route = STATUS_NEXT_ROUTE[status] || "/captura";
    setLocation(route);
  };

  return (
    <DashboardLayout>
      <div className="max-w-5xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Leaf className="h-6 w-6 text-primary" />
              Mis Proyectos
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Gestiona tus proyectos de diseño de paisajismo
            </p>
          </div>
          <Button onClick={() => setShowCreate(true)} className="gap-2">
            <Plus className="h-4 w-4" />
            Nuevo proyecto
          </Button>
        </div>

        {/* Workflow steps */}
        <Card className="border-primary/20 bg-primary/5">
          <CardContent className="pt-4 pb-3">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">Flujo de trabajo</p>
            <div className="flex flex-wrap gap-2 items-center text-xs">
              {[
                { icon: Camera, label: "Captura" },
                { icon: ScanSearch, label: "Análisis" },
                { icon: Eraser, label: "Limpieza" },
                { icon: Cpu, label: "Diseño" },
                { icon: Calculator, label: "Cotización" },
                { icon: Eye, label: "Visualización" },
              ].map((step, i) => (
                <div key={i} className="flex items-center gap-1">
                  <div className="flex items-center gap-1 bg-background rounded px-2 py-1 border">
                    <step.icon className="h-3 w-3 text-primary" />
                    <span className="text-foreground">{step.label}</span>
                  </div>
                  {i < 5 && <ArrowRight className="h-3 w-3 text-muted-foreground" />}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Projects list */}
        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3].map(i => <Skeleton key={i} className="h-40 rounded-lg" />)}
          </div>
        ) : !projects || projects.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="flex flex-col items-center justify-center py-16 gap-4">
              <FolderOpen className="h-12 w-12 text-muted-foreground/40" />
              <div className="text-center">
                <p className="font-medium text-muted-foreground">No tienes proyectos aún</p>
                <p className="text-sm text-muted-foreground/70">Crea tu primer proyecto para comenzar</p>
              </div>
              <Button onClick={() => setShowCreate(true)} variant="outline" className="gap-2">
                <Plus className="h-4 w-4" />
                Crear primer proyecto
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {projects.map(project => {
              const statusInfo = STATUS_LABELS[project.status] || { label: project.status, color: "bg-gray-100 text-gray-800" };
              return (
                <Card key={project.id} className="hover:shadow-md transition-shadow cursor-pointer group">
                  <CardHeader className="pb-2">
                    <div className="flex items-start justify-between gap-2">
                      <CardTitle className="text-base line-clamp-1">{project.name}</CardTitle>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity text-destructive hover:text-destructive shrink-0"
                        onClick={(e) => {
                          e.stopPropagation();
                          if (confirm("¿Eliminar este proyecto?")) deleteMutation.mutate({ id: project.id });
                        }}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                    <CardDescription className="text-xs">
                      {new Date(project.updatedAt).toLocaleDateString("es-ES", { day: "numeric", month: "short", year: "numeric" })}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="pt-0 space-y-3">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${statusInfo.color}`}>
                        {statusInfo.label}
                      </span>
                      {project.climate && (
                        <Badge variant="outline" className="text-xs">{project.climate}</Badge>
                      )}
                      {project.areaM2 && (
                        <Badge variant="outline" className="text-xs">{project.areaM2} m²</Badge>
                      )}
                    </div>
                    <Button
                      className="w-full gap-2 h-8 text-sm"
                      onClick={() => openProject(project.id, project.status)}
                    >
                      Continuar
                      <ArrowRight className="h-3.5 w-3.5" />
                    </Button>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {/* Create dialog */}
      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nuevo proyecto de paisajismo</DialogTitle>
          </DialogHeader>
          <div className="py-2">
            <Input
              placeholder="Ej: Jardín residencial Calle 5"
              value={newName}
              onChange={e => setNewName(e.target.value)}
              onKeyDown={e => { if (e.key === "Enter" && newName.trim()) createMutation.mutate({ name: newName.trim() }); }}
              autoFocus
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreate(false)}>Cancelar</Button>
            <Button
              onClick={() => { if (newName.trim()) createMutation.mutate({ name: newName.trim() }); }}
              disabled={!newName.trim() || createMutation.isPending}
            >
              {createMutation.isPending ? "Creando..." : "Crear proyecto"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
