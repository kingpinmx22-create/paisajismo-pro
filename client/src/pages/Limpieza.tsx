import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Slider } from "@/components/ui/slider";
import { Label } from "@/components/ui/label";
import { trpc } from "@/lib/trpc";
import { useCurrentProjectId } from "@/hooks/useProject";
import { Eraser, ArrowRight, AlertCircle, RotateCcw, CheckCircle2, Loader2, Brush } from "lucide-react";
import { useRef, useState, useEffect, useCallback } from "react";
import { useLocation } from "wouter";
import { toast } from "sonner";

export default function Limpieza() {
  const [, setLocation] = useLocation();
  const { projectId } = useCurrentProjectId();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const maskCanvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [brushSize, setBrushSize] = useState(30);
  const [hasMask, setHasMask] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);
  const imgRef = useRef<HTMLImageElement | null>(null);

  const { data: projectData, refetch } = trpc.projects.getById.useQuery(
    { id: projectId! },
    { enabled: !!projectId }
  );

  const uploadMutation = trpc.projects.uploadImage.useMutation({
    onSuccess: () => {
      toast.success("Imagen limpia guardada");
      setSaving(false);
      setSaved(true);
      refetch();
    },
    onError: (err) => {
      toast.error(err.message);
      setSaving(false);
    },
  });

  const project = projectData?.project;
  const imageUrl = project?.cleanedImageUrl || project?.originalImageUrl;

  // Load image onto canvas
  useEffect(() => {
    if (!imageUrl || !canvasRef.current || !maskCanvasRef.current) return;
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      imgRef.current = img;
      const canvas = canvasRef.current!;
      const mask = maskCanvasRef.current!;
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
      mask.width = img.naturalWidth;
      mask.height = img.naturalHeight;
      const ctx = canvas.getContext("2d")!;
      ctx.drawImage(img, 0, 0);
      setImageLoaded(true);
    };
    img.src = imageUrl;
  }, [imageUrl]);

  const getCanvasPos = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current!;
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    let clientX: number, clientY: number;
    if ("touches" in e) {
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else {
      clientX = e.clientX;
      clientY = e.clientY;
    }
    return {
      x: (clientX - rect.left) * scaleX,
      y: (clientY - rect.top) * scaleY,
    };
  };

  const drawOnMask = useCallback((x: number, y: number) => {
    const mask = maskCanvasRef.current!;
    const mCtx = mask.getContext("2d")!;
    mCtx.globalCompositeOperation = "source-over";
    mCtx.fillStyle = "rgba(255, 0, 0, 0.6)";
    mCtx.beginPath();
    mCtx.arc(x, y, brushSize, 0, Math.PI * 2);
    mCtx.fill();

    // Overlay mask on canvas
    const canvas = canvasRef.current!;
    const ctx = canvas.getContext("2d")!;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    if (imgRef.current) ctx.drawImage(imgRef.current, 0, 0);
    ctx.drawImage(mask, 0, 0);
    setHasMask(true);
  }, [brushSize]);

  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    setIsDrawing(true);
    const pos = getCanvasPos(e);
    drawOnMask(pos.x, pos.y);
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    const pos = getCanvasPos(e);
    drawOnMask(pos.x, pos.y);
  };

  const handleMouseUp = () => setIsDrawing(false);

  const handleTouchStart = (e: React.TouchEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    setIsDrawing(true);
    const pos = getCanvasPos(e);
    drawOnMask(pos.x, pos.y);
  };

  const handleTouchMove = (e: React.TouchEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    if (!isDrawing) return;
    const pos = getCanvasPos(e);
    drawOnMask(pos.x, pos.y);
  };

  const clearMask = () => {
    const mask = maskCanvasRef.current!;
    const canvas = canvasRef.current!;
    const mCtx = mask.getContext("2d")!;
    const ctx = canvas.getContext("2d")!;
    mCtx.clearRect(0, 0, mask.width, mask.height);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    if (imgRef.current) ctx.drawImage(imgRef.current, 0, 0);
    setHasMask(false);
    setSaved(false);
  };

  const applyCleanup = async () => {
    if (!canvasRef.current || !projectId) return;
    setSaving(true);

    // Create cleaned image: fill masked areas with surrounding color (simple inpainting)
    const canvas = canvasRef.current!;
    const mask = maskCanvasRef.current!;
    const outputCanvas = document.createElement("canvas");
    outputCanvas.width = canvas.width;
    outputCanvas.height = canvas.height;
    const outCtx = outputCanvas.getContext("2d")!;

    // Draw original image
    if (imgRef.current) outCtx.drawImage(imgRef.current, 0, 0);

    // Simple inpainting: blur masked areas
    const maskCtx = mask.getContext("2d")!;
    const maskData = maskCtx.getImageData(0, 0, mask.width, mask.height);
    const imgData = outCtx.getImageData(0, 0, outputCanvas.width, outputCanvas.height);

    // For each masked pixel, replace with average of nearby non-masked pixels
    for (let y = 0; y < outputCanvas.height; y++) {
      for (let x = 0; x < outputCanvas.width; x++) {
        const idx = (y * outputCanvas.width + x) * 4;
        const maskAlpha = maskData.data[idx + 3];
        if (maskAlpha > 50) {
          // Sample from a wider area
          let r = 0, g = 0, b = 0, count = 0;
          const radius = 20;
          for (let dy = -radius; dy <= radius; dy += 4) {
            for (let dx = -radius; dx <= radius; dx += 4) {
              const nx = x + dx, ny = y + dy;
              if (nx < 0 || ny < 0 || nx >= outputCanvas.width || ny >= outputCanvas.height) continue;
              const nIdx = (ny * outputCanvas.width + nx) * 4;
              const nMaskAlpha = maskData.data[nIdx + 3];
              if (nMaskAlpha < 50) {
                r += imgData.data[nIdx];
                g += imgData.data[nIdx + 1];
                b += imgData.data[nIdx + 2];
                count++;
              }
            }
          }
          if (count > 0) {
            imgData.data[idx] = Math.round(r / count);
            imgData.data[idx + 1] = Math.round(g / count);
            imgData.data[idx + 2] = Math.round(b / count);
          }
        }
      }
    }
    outCtx.putImageData(imgData, 0, 0);

    const dataUrl = outputCanvas.toDataURL("image/jpeg", 0.92);
    uploadMutation.mutate({
      projectId,
      imageBase64: dataUrl,
      mimeType: "image/jpeg",
      imageType: "cleaned",
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
            <Eraser className="h-5 w-5 text-primary" />
            Módulo 3 — Limpieza de Escena
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Proyecto: <span className="font-medium text-foreground">{project?.name}</span>
          </p>
        </div>

        {/* Controls */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Brush className="h-4 w-4 text-primary" />
              Herramienta de borrado
            </CardTitle>
            <CardDescription className="text-xs">
              Pinta sobre los elementos que quieres eliminar del terreno. El sistema los reemplazará con el fondo.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label className="text-sm">Tamaño del pincel: {brushSize}px</Label>
              <Slider
                min={10}
                max={80}
                step={5}
                value={[brushSize]}
                onValueChange={([v]) => setBrushSize(v)}
                className="max-w-xs"
              />
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" className="gap-2" onClick={clearMask} disabled={!hasMask}>
                <RotateCcw className="h-3.5 w-3.5" />
                Limpiar selección
              </Button>
              {hasMask && !saved && (
                <Button size="sm" className="gap-2" onClick={applyCleanup} disabled={saving}>
                  {saving ? <><Loader2 className="h-3.5 w-3.5 animate-spin" />Procesando...</> : <><Eraser className="h-3.5 w-3.5" />Aplicar limpieza</>}
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Canvas */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {imageLoaded ? "Pinta sobre los elementos a eliminar (rojo)" : "Cargando imagen..."}
            </CardTitle>
          </CardHeader>
          <CardContent ref={containerRef}>
            {!imageUrl ? (
              <div className="h-48 rounded-lg bg-muted flex items-center justify-center">
                <p className="text-sm text-muted-foreground">Sin imagen. Completa el Módulo 1 primero.</p>
              </div>
            ) : (
              <div className="relative">
                <canvas
                  ref={canvasRef}
                  className="w-full rounded-lg cursor-crosshair touch-none"
                  style={{ maxHeight: "400px", objectFit: "contain" }}
                  onMouseDown={handleMouseDown}
                  onMouseMove={handleMouseMove}
                  onMouseUp={handleMouseUp}
                  onMouseLeave={handleMouseUp}
                  onTouchStart={handleTouchStart}
                  onTouchMove={handleTouchMove}
                  onTouchEnd={handleMouseUp}
                />
                <canvas ref={maskCanvasRef} className="hidden" />
              </div>
            )}
          </CardContent>
        </Card>

        {saved && (
          <div className="flex items-center gap-2 text-sm text-emerald-700 bg-emerald-50 rounded-lg px-3 py-2">
            <CheckCircle2 className="h-4 w-4 shrink-0" />
            Imagen limpia guardada correctamente
          </div>
        )}

        <div className="flex gap-3">
          <Button
            variant="outline"
            className="gap-2"
            onClick={() => setLocation("/diseno")}
          >
            Saltar limpieza
          </Button>
          <Button
            className="flex-1 gap-2"
            onClick={() => setLocation("/diseno")}
            disabled={!imageUrl}
          >
            Continuar al Motor de Diseño
            <ArrowRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </DashboardLayout>
  );
}
