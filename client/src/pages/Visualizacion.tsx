import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { trpc } from "@/lib/trpc";
import { useCurrentProjectId } from "@/hooks/useProject";
import { Eye, AlertCircle, Download, Loader2, CheckCircle2, TreePine, Flower2, Leaf, Mountain, Sprout, Save } from "lucide-react";
import { useRef, useEffect, useState } from "react";
import { useLocation } from "wouter";
import { toast } from "sonner";

const TYPE_COLORS: Record<string, string> = {
  tree:   "#16a34a",
  plant:  "#2563eb",
  shrub:  "#7c3aed",
  grass:  "#65a30d",
  stone:  "#78716c",
};

const TYPE_ICONS_SVG: Record<string, string> = {
  tree:  "🌳",
  plant: "🌸",
  shrub: "🌿",
  grass: "🌱",
  stone: "🪨",
};

export default function Visualizacion() {
  const [, setLocation] = useLocation();
  const { projectId } = useCurrentProjectId();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [rendering, setRendering] = useState(false);
  const [rendered, setRendered] = useState(false);
  const [saving, setSaving] = useState(false);

  const { data: projectData, refetch } = trpc.projects.getById.useQuery(
    { id: projectId! },
    { enabled: !!projectId }
  );

  const renderMutation = trpc.projects.renderDesign.useMutation({
    onSuccess: () => {
      toast.success("Visualización IA generada y guardada");
      setSaving(false);
      refetch();
    },
    onError: (err) => {
      toast.error(err.message);
      setSaving(false);
    },
  });

  const project = projectData?.project;
  const layout = project?.designLayout as any;
  const imageUrl = project?.cleanedImageUrl || project?.originalImageUrl;

  // Draw 2D design overlay on canvas
  useEffect(() => {
    if (!layout || !imageUrl || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d")!;
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;

      // Draw base image
      ctx.drawImage(img, 0, 0);

      // Draw semi-transparent overlay
      ctx.fillStyle = "rgba(0,0,0,0.15)";
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Draw each element
      layout.elements?.forEach((el: any) => {
        const x = (el.positionX / 100) * canvas.width;
        const y = (el.positionY / 100) * canvas.height;
        const color = TYPE_COLORS[el.type] || "#16a34a";

        // Size based on plant type
        const radius = el.type === "tree" ? 28 : el.type === "shrub" ? 20 : el.type === "stone" ? 18 : 14;

        // Shadow
        ctx.shadowColor = "rgba(0,0,0,0.4)";
        ctx.shadowBlur = 8;

        // Circle
        ctx.beginPath();
        ctx.arc(x, y, radius, 0, Math.PI * 2);
        ctx.fillStyle = color + "cc";
        ctx.fill();
        ctx.strokeStyle = color;
        ctx.lineWidth = 2;
        ctx.stroke();

        ctx.shadowBlur = 0;

        // Quantity badge
        if (el.quantity > 1) {
          ctx.beginPath();
          ctx.arc(x + radius * 0.7, y - radius * 0.7, 10, 0, Math.PI * 2);
          ctx.fillStyle = "#fff";
          ctx.fill();
          ctx.strokeStyle = color;
          ctx.lineWidth = 1.5;
          ctx.stroke();

          ctx.fillStyle = color;
          ctx.font = "bold 10px sans-serif";
          ctx.textAlign = "center";
          ctx.textBaseline = "middle";
          ctx.fillText(String(el.quantity), x + radius * 0.7, y - radius * 0.7);
        }

        // Label
        ctx.fillStyle = "#fff";
        ctx.font = "bold 11px sans-serif";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.shadowColor = "rgba(0,0,0,0.8)";
        ctx.shadowBlur = 4;

        // Truncate name
        const shortName = el.plantName.split(" ")[0];
        ctx.fillText(shortName, x, y + radius + 12);
        ctx.shadowBlur = 0;
      });

      setRendered(true);
    };
    img.src = imageUrl;
  }, [layout, imageUrl]);

  const handleDownload = () => {
    if (!canvasRef.current) return;
    const link = document.createElement("a");
    link.download = `diseno-${project?.name || "paisajismo"}.png`;
    link.href = canvasRef.current.toDataURL("image/png");
    link.click();
    toast.success("Imagen descargada");
  };

  const handleSaveRendered = () => {
    if (!projectId) return;
    setSaving(true);
    renderMutation.mutate({ projectId });
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
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold flex items-center gap-2">
              <Eye className="h-5 w-5 text-primary" />
              Módulo 7 — Visualización 2D
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Proyecto: <span className="font-medium text-foreground">{project?.name}</span>
            </p>
          </div>
          <div className="flex gap-2">
            {rendered && (
              <Button variant="outline" size="sm" className="gap-2" onClick={handleDownload}>
                <Download className="h-4 w-4" />
                Descargar
              </Button>
            )}
          </div>
        </div>

        {!layout ? (
          <Card className="border-dashed">
            <CardContent className="flex flex-col items-center gap-4 py-12">
              <Eye className="h-10 w-10 text-muted-foreground/40" />
              <div className="text-center">
                <p className="font-medium text-muted-foreground">Sin diseño generado</p>
                <p className="text-sm text-muted-foreground/70">Genera el diseño en el Módulo 5 primero</p>
              </div>
              <Button onClick={() => setLocation("/diseno")} variant="outline">Ir al Motor de Diseño</Button>
            </CardContent>
          </Card>
        ) : (
          <>
            {/* 2D Canvas visualization */}
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base">Diseño sobre terreno (2D)</CardTitle>
                  <Badge variant="secondary" className="text-xs">{layout.elements?.length} elementos</Badge>
                </div>
                <CardDescription className="text-xs">
                  Posiciones reales de cada elemento sobre la imagen del terreno
                </CardDescription>
              </CardHeader>
              <CardContent>
                {!imageUrl ? (
                  <div className="h-48 rounded-lg bg-muted flex items-center justify-center">
                    <p className="text-sm text-muted-foreground">Sin imagen base</p>
                  </div>
                ) : (
                  <canvas
                    ref={canvasRef}
                    className="w-full rounded-lg"
                    style={{ maxHeight: "500px", objectFit: "contain" }}
                  />
                )}
              </CardContent>
            </Card>

            {/* Legend */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Leyenda del diseño</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {layout.elements?.map((el: any, i: number) => (
                    <div key={i} className="flex items-center gap-2.5 p-2 rounded-lg bg-muted/40 text-sm">
                      <div
                        className="h-4 w-4 rounded-full shrink-0"
                        style={{ backgroundColor: TYPE_COLORS[el.type] || "#16a34a" }}
                      />
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-xs truncate">{el.plantName}</p>
                        <p className="text-xs text-muted-foreground">{el.zone} · x{el.quantity}</p>
                      </div>
                      <span className="text-xs text-muted-foreground font-mono shrink-0">
                        {el.positionX.toFixed(0)}%, {el.positionY.toFixed(0)}%
                      </span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* AI Render */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Visualización IA (fotorrealista)</CardTitle>
                <CardDescription className="text-xs">
                  Genera una imagen fotorrealista del diseño aplicado sobre el terreno usando inteligencia artificial.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {project?.renderedImageUrl ? (
                  <>
                    <div className="flex items-center gap-2 text-sm text-emerald-700 bg-emerald-50 rounded-lg px-3 py-2">
                      <CheckCircle2 className="h-4 w-4 shrink-0" />
                      Visualización IA generada
                    </div>
                    <img
                      src={project.renderedImageUrl}
                      alt="Diseño renderizado"
                      className="w-full rounded-lg"
                    />
                    <Button variant="outline" size="sm" className="gap-2" onClick={handleSaveRendered} disabled={saving}>
                      {saving ? <><Loader2 className="h-4 w-4 animate-spin" />Regenerando...</> : "Regenerar con IA"}
                    </Button>
                  </>
                ) : (
                  <Button
                    className="w-full gap-2"
                    onClick={handleSaveRendered}
                    disabled={saving}
                  >
                    {saving ? (
                      <><Loader2 className="h-4 w-4 animate-spin" />Generando visualización IA...</>
                    ) : (
                      <><Eye className="h-4 w-4" />Generar visualización fotorrealista</>
                    )}
                  </Button>
                )}
              </CardContent>
            </Card>

            {/* Save project */}
            <Card className="border-primary/20 bg-primary/5">
              <CardContent className="py-4 flex items-center justify-between gap-4">
                <div>
                  <p className="font-medium text-sm">Proyecto completo</p>
                  <p className="text-xs text-muted-foreground">
                    Estado: <span className="font-medium">{project?.status}</span>
                    {project?.updatedAt && ` · Actualizado: ${new Date(project.updatedAt).toLocaleString("es-ES")}`}
                  </p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-2 shrink-0"
                  onClick={() => setLocation("/")}
                >
                  <Save className="h-4 w-4" />
                  Volver a Proyectos
                </Button>
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </DashboardLayout>
  );
}
