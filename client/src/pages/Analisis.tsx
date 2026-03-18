import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { trpc } from "@/lib/trpc";
import { useCurrentProjectId } from "@/hooks/useProject";
import { ScanSearch, ArrowRight, AlertCircle, Loader2, CheckCircle2, MapPin, Sun, Droplets, TriangleAlert } from "lucide-react";
import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { toast } from "sonner";

const CLIMATE_LABELS: Record<string, string> = {
  tropical: "Tropical",
  subtropical: "Subtropical",
  temperate: "Templado",
  arid: "Árido",
  mediterranean: "Mediterráneo",
};

const SUN_LABELS: Record<string, string> = {
  full: "Sol pleno",
  partial: "Sol parcial",
  shade: "Sombra",
};

export default function Analisis() {
  const [, setLocation] = useLocation();
  const { projectId } = useCurrentProjectId();
  const [analyzing, setAnalyzing] = useState(false);
  const [areaInput, setAreaInput] = useState("");

  const { data: projectData, refetch } = trpc.projects.getById.useQuery(
    { id: projectId! },
    { enabled: !!projectId }
  );

  const analyzeMutation = trpc.projects.analyzeTerrain.useMutation({
    onSuccess: () => {
      toast.success("Análisis completado");
      setAnalyzing(false);
      refetch();
    },
    onError: (err) => {
      toast.error(err.message);
      setAnalyzing(false);
    },
  });

  const project = projectData?.project;
  const analysis = project?.terrainAnalysis as any;
  const imageUrl = project?.originalImageUrl;

  const handleAnalyze = () => {
    if (!imageUrl || !projectId) {
      toast.error("Primero captura una imagen del terreno (Módulo 1)");
      return;
    }
    setAnalyzing(true);
    analyzeMutation.mutate({
      projectId,
      imageUrl,
      areaM2: areaInput ? parseFloat(areaInput) : undefined,
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
      <div className="max-w-3xl mx-auto space-y-6">
        <div>
          <h1 className="text-xl font-bold flex items-center gap-2">
            <ScanSearch className="h-5 w-5 text-primary" />
            Módulo 2 — Análisis del Terreno
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Proyecto: <span className="font-medium text-foreground">{project?.name}</span>
          </p>
        </div>

        {/* Image + analyze */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Imagen del terreno</CardTitle>
            <CardDescription className="text-xs">
              {imageUrl ? "Imagen lista para analizar" : "Aún no hay imagen. Ve al Módulo 1 primero."}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {imageUrl ? (
              <img src={imageUrl} alt="Terreno" className="w-full rounded-lg object-cover max-h-64" />
            ) : (
              <div className="h-40 rounded-lg bg-muted flex items-center justify-center">
                <p className="text-sm text-muted-foreground">Sin imagen</p>
              </div>
            )}

            {!analysis ? (
              <Button
                className="w-full gap-2"
                onClick={handleAnalyze}
                disabled={analyzing || !imageUrl}
              >
                {analyzing ? (
                  <><Loader2 className="h-4 w-4 animate-spin" />Analizando terreno con IA...</>
                ) : (
                  <><ScanSearch className="h-4 w-4" />Analizar terreno</>
                )}
              </Button>
            ) : (
              <div className="flex items-center gap-2 text-sm text-emerald-700 bg-emerald-50 rounded-lg px-3 py-2">
                <CheckCircle2 className="h-4 w-4 shrink-0" />
                Análisis completado
                <Button variant="ghost" size="sm" className="ml-auto h-6 text-xs" onClick={handleAnalyze}>
                  Re-analizar
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Analysis results */}
        {analysis && (
          <>
            {/* Key metrics */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <Card>
                <CardContent className="pt-4 pb-3 text-center">
                  <p className="text-2xl font-bold text-primary">{analysis.estimatedAreaM2}</p>
                  <p className="text-xs text-muted-foreground mt-1">m² estimados</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-4 pb-3 text-center">
                  <p className="text-2xl font-bold text-emerald-600">{analysis.usableAreaM2}</p>
                  <p className="text-xs text-muted-foreground mt-1">m² usables</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-4 pb-3 text-center">
                  <p className="text-2xl font-bold text-blue-600">{analysis.usableAreaPercent}%</p>
                  <p className="text-xs text-muted-foreground mt-1">área usable</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-4 pb-3 text-center">
                  <p className="text-2xl font-bold text-orange-500">{analysis.obstacles?.length ?? 0}</p>
                  <p className="text-xs text-muted-foreground mt-1">obstáculos</p>
                </CardContent>
              </Card>
            </div>

            {/* Soil & climate */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Condiciones del terreno</CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <MapPin className="h-3.5 w-3.5" />
                    Tipo de suelo
                  </div>
                  <p className="font-medium text-sm">{analysis.soilType}</p>
                  <p className="text-xs text-muted-foreground">{analysis.soilCondition}</p>
                </div>
                <div className="space-y-1">
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <Droplets className="h-3.5 w-3.5" />
                    Clima sugerido
                  </div>
                  <Badge variant="secondary" className="text-xs">
                    {CLIMATE_LABELS[analysis.suggestedClimate] || analysis.suggestedClimate}
                  </Badge>
                </div>
                <div className="space-y-1">
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <Sun className="h-3.5 w-3.5" />
                    Exposición solar
                  </div>
                  <Badge variant="secondary" className="text-xs">
                    {SUN_LABELS[analysis.sunExposure] || analysis.sunExposure}
                  </Badge>
                </div>
              </CardContent>
            </Card>

            {/* Obstacles */}
            {analysis.obstacles?.length > 0 && (
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <TriangleAlert className="h-4 w-4 text-orange-500" />
                    Obstáculos detectados
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {analysis.obstacles.map((obs: any, i: number) => (
                      <div key={i} className="flex items-start gap-3 p-2 rounded-lg bg-muted/50 text-sm">
                        <Badge variant="outline" className="text-xs shrink-0">{obs.positionZone}</Badge>
                        <div>
                          <p className="font-medium text-xs">{obs.type}</p>
                          <p className="text-xs text-muted-foreground">{obs.description}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Zones */}
            {analysis.zones?.length > 0 && (
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">Zonas del terreno</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {analysis.zones.map((zone: any, i: number) => (
                      <div key={i} className="flex items-center gap-3 p-2 rounded-lg bg-muted/50 text-sm">
                        <div className="w-8 text-right shrink-0">
                          <span className="text-xs font-bold text-primary">{zone.percentOfTotal}%</span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-xs">{zone.name}</p>
                          <p className="text-xs text-muted-foreground truncate">{zone.description}</p>
                        </div>
                        <Badge
                          variant={zone.type === "usable" ? "default" : "secondary"}
                          className="text-xs shrink-0"
                        >
                          {zone.type}
                        </Badge>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Recommendations */}
            {analysis.recommendations?.length > 0 && (
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">Recomendaciones</CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-1.5">
                    {analysis.recommendations.map((rec: string, i: number) => (
                      <li key={i} className="flex items-start gap-2 text-sm">
                        <CheckCircle2 className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                        {rec}
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            )}

            <Button
              className="w-full gap-2"
              onClick={() => setLocation("/limpieza")}
            >
              Continuar a Limpieza de Escena
              <ArrowRight className="h-4 w-4" />
            </Button>
          </>
        )}
      </div>
    </DashboardLayout>
  );
}
