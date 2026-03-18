import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { trpc } from "@/lib/trpc";
import { useCurrentProjectId } from "@/hooks/useProject";
import { Cpu, ArrowRight, AlertCircle, Loader2, CheckCircle2, TreePine, Flower2, Leaf, Mountain, Sprout } from "lucide-react";
import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { toast } from "sonner";

const TYPE_ICONS: Record<string, React.ElementType> = {
  tree: TreePine,
  plant: Flower2,
  shrub: Sprout,
  grass: Leaf,
  stone: Mountain,
};

const ZONE_COLORS: Record<string, string> = {
  "zona posterior": "bg-blue-100 text-blue-800",
  "zona media": "bg-yellow-100 text-yellow-800",
  "zona frontal": "bg-green-100 text-green-800",
  "zona central": "bg-purple-100 text-purple-800",
};

export default function Diseno() {
  const [, setLocation] = useLocation();
  const { projectId } = useCurrentProjectId();
  const [generating, setGenerating] = useState(false);
  const [projectType, setProjectType] = useState("jardín residencial");
  const [climate, setClimate] = useState("");
  const [region, setRegion] = useState("");

  const { data: projectData, refetch } = trpc.projects.getById.useQuery(
    { id: projectId! },
    { enabled: !!projectId }
  );

  const generateMutation = trpc.projects.generateDesign.useMutation({
    onSuccess: () => {
      toast.success("Diseño y cotización generados");
      setGenerating(false);
      refetch();
    },
    onError: (err) => {
      toast.error(err.message);
      setGenerating(false);
    },
  });

  const project = projectData?.project;
  const layout = project?.designLayout as any;
  const quotation = project?.quotation as any;
  const analysis = project?.terrainAnalysis as any;

  useEffect(() => {
    if (project?.climate) setClimate(project.climate);
    if (project?.region) setRegion(project.region || "");
    if (project?.projectType) setProjectType(project.projectType);
  }, [project]);

  const handleGenerate = () => {
    if (!projectId) return;
    if (!analysis) {
      toast.error("Primero analiza el terreno (Módulo 2)");
      return;
    }
    setGenerating(true);
    generateMutation.mutate({
      projectId,
      projectType,
      climate: climate || undefined,
      region: region || undefined,
    });
  };

  if (!projectId) {
    return (
      <DashboardLayout>
        <div className="max-w-xl mx-auto mt-12">
          <Card className="border-destructive/30">
            <CardContent className="flex flex-col items-center gap-4 py-10">
              <AlertCircle className="h-10 w-10 text-destructive" />
              <p className="font-medium">No hay proyecto activo</p>
              <Button onClick={() => setLocation("/")} variant="outline">Ir a Proyectos</Button>
            </CardContent>
          </Card>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="max-w-4xl mx-auto space-y-6">
        <div>
          <h1 className="text-xl font-bold flex items-center gap-2">
            <Cpu className="h-5 w-5 text-primary" />
            Módulo 5 — Motor de Diseño
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Proyecto: <span className="font-medium text-foreground">{project?.name}</span>
            {project?.areaM2 && <span className="ml-2 text-muted-foreground">· {project.areaM2} m²</span>}
          </p>
        </div>

        {/* Config */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Parámetros del diseño</CardTitle>
            <CardDescription className="text-xs">
              El motor usará solo elementos del inventario compatibles con el clima seleccionado.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="space-y-1.5">
              <Label className="text-sm">Tipo de proyecto</Label>
              <Select value={projectType} onValueChange={setProjectType}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="jardín residencial">Jardín residencial</SelectItem>
                  <SelectItem value="jardín comercial">Jardín comercial</SelectItem>
                  <SelectItem value="jardín minimalista">Jardín minimalista</SelectItem>
                  <SelectItem value="jardín tropical">Jardín tropical</SelectItem>
                  <SelectItem value="jardín mediterráneo">Jardín mediterráneo</SelectItem>
                  <SelectItem value="jardín xerofítico">Jardín xerofítico</SelectItem>
                  <SelectItem value="jardín formal">Jardín formal</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-sm">Clima</Label>
              <Select value={climate} onValueChange={setClimate}>
                <SelectTrigger>
                  <SelectValue placeholder="Detectado del análisis" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="tropical">Tropical</SelectItem>
                  <SelectItem value="subtropical">Subtropical</SelectItem>
                  <SelectItem value="temperate">Templado</SelectItem>
                  <SelectItem value="arid">Árido</SelectItem>
                  <SelectItem value="mediterranean">Mediterráneo</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-sm">Región (opcional)</Label>
              <Input
                placeholder="Ej: Costa Rica, España..."
                value={region}
                onChange={e => setRegion(e.target.value)}
              />
            </div>
          </CardContent>
        </Card>

        {/* Generate button */}
        {!layout ? (
          <Button
            className="w-full gap-2 h-11"
            onClick={handleGenerate}
            disabled={generating || !analysis}
          >
            {generating ? (
              <><Loader2 className="h-4 w-4 animate-spin" />Generando diseño con IA...</>
            ) : (
              <><Cpu className="h-4 w-4" />Generar diseño automático</>
            )}
          </Button>
        ) : (
          <div className="flex items-center gap-2 text-sm text-emerald-700 bg-emerald-50 rounded-lg px-3 py-2">
            <CheckCircle2 className="h-4 w-4 shrink-0" />
            Diseño generado
            <Button variant="ghost" size="sm" className="ml-auto h-6 text-xs" onClick={handleGenerate} disabled={generating}>
              {generating ? "Regenerando..." : "Regenerar"}
            </Button>
          </div>
        )}

        {!analysis && (
          <p className="text-sm text-amber-700 bg-amber-50 rounded-lg px-3 py-2">
            ⚠️ Necesitas completar el Análisis del terreno (Módulo 2) antes de generar el diseño.
          </p>
        )}

        {/* Design layout */}
        {layout && (
          <>
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base">Diseño generado</CardTitle>
                  <Badge variant="secondary">{layout.totalElements} elementos</Badge>
                </div>
                <CardDescription className="text-xs">{layout.designNotes}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {layout.elements?.map((el: any, i: number) => {
                    const Icon = TYPE_ICONS[el.type] || Leaf;
                    const zoneColor = ZONE_COLORS[el.zone?.toLowerCase()] || "bg-gray-100 text-gray-800";
                    return (
                      <div key={i} className="flex items-center gap-3 p-2.5 rounded-lg bg-muted/40 text-sm">
                        <div className="h-7 w-7 rounded-md bg-primary/10 flex items-center justify-center shrink-0">
                          <Icon className="h-3.5 w-3.5 text-primary" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-xs">{el.plantName}</p>
                          <p className="text-xs text-muted-foreground line-clamp-1">{el.justification}</p>
                        </div>
                        <div className="flex items-center gap-2 shrink-0 text-xs">
                          <span className={`px-1.5 py-0.5 rounded text-xs font-medium ${zoneColor}`}>{el.zone}</span>
                          <span className="text-muted-foreground">x{el.quantity}</span>
                          <span className="text-muted-foreground font-mono">({el.positionX.toFixed(0)}%, {el.positionY.toFixed(0)}%)</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>

            {/* Quotation (Módulo 6) */}
            {quotation && (
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    Módulo 6 — Cotización
                    <Badge className="bg-emerald-600 text-white text-xs">
                      Total: ${Number(quotation.total).toFixed(2)} {quotation.currency}
                    </Badge>
                  </CardTitle>
                  <CardDescription className="text-xs">
                    Precios reales del inventario · Stock validado
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="space-y-1.5">
                    {quotation.items?.map((item: any, i: number) => (
                      <div key={i} className="flex items-center gap-3 text-sm py-1.5 border-b last:border-0">
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-xs">{item.plantName}</p>
                          <p className="text-xs text-muted-foreground">{item.quantity} unidades × ${Number(item.unitPrice).toFixed(2)}</p>
                        </div>
                        <div className="text-right shrink-0">
                          <p className="font-bold text-sm">${Number(item.totalPrice).toFixed(2)}</p>
                          {!item.stockSufficient && (
                            <p className="text-xs text-amber-600">Stock limitado ({item.stockAvailable})</p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="rounded-lg bg-muted/50 p-3 space-y-1.5">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Subtotal materiales</span>
                      <span>${Number(quotation.subtotal).toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Mano de obra (25%)</span>
                      <span>${Number(quotation.laborCost).toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between font-bold text-base border-t pt-1.5 mt-1.5">
                      <span>Total del proyecto</span>
                      <span className="text-primary">${Number(quotation.total).toFixed(2)} {quotation.currency}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            <Button
              className="w-full gap-2"
              onClick={() => setLocation("/visualizacion")}
            >
              Continuar a Visualización
              <ArrowRight className="h-4 w-4" />
            </Button>
          </>
        )}
      </div>
    </DashboardLayout>
  );
}
