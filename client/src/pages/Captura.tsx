import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { trpc } from "@/lib/trpc";
import { useCurrentProjectId } from "@/hooks/useProject";
import { Camera, Upload, X, ArrowRight, AlertCircle, CheckCircle2, Ruler, ZoomIn, ZoomOut, RotateCcw } from "lucide-react";
import { useRef, useState, useCallback, useEffect } from "react";
import { useLocation } from "wouter";
import { toast } from "sonner";

export default function Captura() {
  const [, setLocation] = useLocation();
  const { projectId } = useCurrentProjectId();
  const [preview, setPreview] = useState<string | null>(null);
  const [cameraFullscreen, setCameraFullscreen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploaded, setUploaded] = useState(false);
  const [areaM2, setAreaM2] = useState("");
  const [measureMode, setMeasureMode] = useState(false);
  const [measurements, setMeasurements] = useState<Array<{ x1: number; y1: number; x2: number; y2: number; distance: number }>>([]);
  const [zoom, setZoom] = useState(1);
  const [currentMeasure, setCurrentMeasure] = useState<{ x1: number; y1: number } | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const measureCanvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const { data: projectData } = trpc.projects.getById.useQuery(
    { id: projectId! },
    { enabled: !!projectId }
  );

  const uploadMutation = trpc.projects.uploadImage.useMutation({
    onSuccess: () => {
      toast.success("Imagen guardada. Puedes continuar al análisis.");
      setUploaded(true);
      setUploading(false);
    },
    onError: (err) => {
      toast.error(err.message);
      setUploading(false);
    },
  });

  // Load existing image if project already has one
  useEffect(() => {
    if (projectData?.project?.originalImageUrl) {
      setPreview(projectData.project.originalImageUrl);
      setUploaded(true);
    }
    if (projectData?.project?.areaM2) {
      setAreaM2(String(projectData.project.areaM2));
    }
  }, [projectData]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast.error("Solo se permiten imágenes");
      return;
    }
    const reader = new FileReader();
    reader.onload = (ev) => {
      setPreview(ev.target?.result as string);
      setUploaded(false);
      setMeasurements([]);
      setMeasureMode(false);
    };
    reader.readAsDataURL(file);
  };

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: "environment",
          width: { ideal: 1920 },
          height: { ideal: 1080 },
          advanced: [{ focusMode: "continuous" }] as any,
        },
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
      }
      setCameraFullscreen(true);
    } catch (err) {
      toast.error("No se pudo acceder a la cámara. Verifica los permisos.");
    }
  };

  const stopCamera = () => {
    streamRef.current?.getTracks().forEach(t => t.stop());
    streamRef.current = null;
    setCameraFullscreen(false);
  };

  const capturePhoto = () => {
    if (!videoRef.current || !canvasRef.current) return;
    const video = videoRef.current;
    const canvas = canvasRef.current;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    canvas.getContext("2d")?.drawImage(video, 0, 0);
    const dataUrl = canvas.toDataURL("image/jpeg", 0.92);
    setPreview(dataUrl);
    setUploaded(false);
    setMeasurements([]);
    stopCamera();
    toast.success("Foto capturada");
  };

  const clearImage = () => {
    setPreview(null);
    setUploaded(false);
    setMeasurements([]);
    setMeasureMode(false);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  // Measurement tool
  const handleMeasureCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!measureCanvasRef.current) return;
    const rect = measureCanvasRef.current.getBoundingClientRect();
    const x = (e.clientX - rect.left) / zoom;
    const y = (e.clientY - rect.top) / zoom;

    if (!currentMeasure) {
      setCurrentMeasure({ x1: x, y1: y });
    } else {
      // Calculate distance (simplified: pixel distance)
      const distance = Math.sqrt(
        Math.pow(x - currentMeasure.x1, 2) + Math.pow(y - currentMeasure.y1, 2)
      );
      setMeasurements([...measurements, { x1: currentMeasure.x1, y1: currentMeasure.y1, x2: x, y2: y, distance }]);
      setCurrentMeasure(null);
      redrawMeasurements();
    }
  };

  const redrawMeasurements = () => {
    if (!measureCanvasRef.current || !preview) return;
    const canvas = measureCanvasRef.current;
    const ctx = canvas.getContext("2d")!;
    const img = new Image();
    img.onload = () => {
      canvas.width = img.width;
      canvas.height = img.height;
      ctx.drawImage(img, 0, 0);

      // Draw measurements
      measurements.forEach(m => {
        ctx.strokeStyle = "#ef4444";
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(m.x1, m.y1);
        ctx.lineTo(m.x2, m.y2);
        ctx.stroke();

        // Endpoints
        ctx.fillStyle = "#ef4444";
        ctx.beginPath();
        ctx.arc(m.x1, m.y1, 4, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(m.x2, m.y2, 4, 0, Math.PI * 2);
        ctx.fill();

        // Label
        const midX = (m.x1 + m.x2) / 2;
        const midY = (m.y1 + m.y2) / 2;
        ctx.fillStyle = "#fff";
        ctx.font = "bold 12px sans-serif";
        ctx.textAlign = "center";
        ctx.shadowColor = "rgba(0,0,0,0.8)";
        ctx.shadowBlur = 4;
        ctx.fillText(`${m.distance.toFixed(0)}px`, midX, midY - 8);
      });

      // Current measurement
      if (currentMeasure) {
        ctx.fillStyle = "#3b82f6";
        ctx.beginPath();
        ctx.arc(currentMeasure.x1, currentMeasure.y1, 5, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = "#3b82f6";
        ctx.font = "bold 10px sans-serif";
        ctx.fillText("Punto 1", currentMeasure.x1, currentMeasure.y1 - 10);
      }
    };
    img.src = preview!;
  };

  const handleUpload = async () => {
    if (!preview || !projectId) {
      toast.error("Selecciona una imagen y asegúrate de tener un proyecto activo");
      return;
    }
    setUploading(true);
    uploadMutation.mutate({
      projectId,
      imageBase64: preview,
      mimeType: "image/jpeg",
      imageType: "original",
    });
  };

  if (!projectId) {
    return (
      <DashboardLayout>
        <div className="max-w-xl mx-auto mt-12">
          <Card className="border-destructive/30">
            <CardContent className="flex flex-col items-center gap-4 py-10">
              <AlertCircle className="h-10 w-10 text-destructive" />
              <p className="font-medium text-center">No hay proyecto activo</p>
              <p className="text-sm text-muted-foreground text-center">Crea o abre un proyecto desde la página de Proyectos</p>
              <Button onClick={() => setLocation("/")} variant="outline">Ir a Proyectos</Button>
            </CardContent>
          </Card>
        </div>
      </DashboardLayout>
    );
  }

  // Fullscreen camera mode
  if (cameraFullscreen) {
    return (
      <div className="fixed inset-0 bg-black z-50 flex flex-col">
        <video
          ref={videoRef}
          className="w-full h-full object-cover"
          autoPlay
          playsInline
          muted
        />
        <canvas ref={canvasRef} className="hidden" />

        {/* Controls overlay */}
        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black to-transparent p-6 flex gap-3 justify-center">
          <Button
            size="lg"
            className="gap-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-full w-20 h-20"
            onClick={capturePhoto}
          >
            <Camera className="h-8 w-8" />
          </Button>
          <Button
            size="lg"
            variant="outline"
            className="gap-2 rounded-full w-20 h-20 bg-white/10 border-white text-white hover:bg-white/20"
            onClick={stopCamera}
          >
            <X className="h-8 w-8" />
          </Button>
        </div>

        {/* Top info */}
        <div className="absolute top-0 left-0 right-0 bg-gradient-to-b from-black to-transparent p-4 text-white text-center">
          <p className="text-sm font-medium">Posiciona el terreno en el centro</p>
          <p className="text-xs text-white/70">Presiona el botón verde para capturar</p>
        </div>
      </div>
    );
  }

  return (
    <DashboardLayout>
      <div className="max-w-4xl mx-auto space-y-4 sm:space-y-6">
        <div>
          <h1 className="text-lg sm:text-xl font-bold flex items-center gap-2">
            <Camera className="h-4 sm:h-5 w-4 sm:w-5 text-primary" />
            Módulo 1 — Captura de Terreno
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground mt-1">
            Proyecto: <span className="font-medium text-foreground">{projectData?.project?.name}</span>
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
          {/* Upload from file */}
          <Card>
            <CardHeader className="pb-2 sm:pb-3">
              <CardTitle className="text-sm sm:text-base flex items-center gap-2">
                <Upload className="h-4 w-4 text-primary" />
                Subir imagen
              </CardTitle>
              <CardDescription className="text-xs">JPG, PNG, WEBP hasta 10MB</CardDescription>
            </CardHeader>
            <CardContent>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleFileChange}
              />
              <Button
                variant="outline"
                className="w-full gap-2 text-sm"
                onClick={() => fileInputRef.current?.click()}
              >
                <Upload className="h-4 w-4" />
                Seleccionar archivo
              </Button>
            </CardContent>
          </Card>

          {/* Camera */}
          <Card>
            <CardHeader className="pb-2 sm:pb-3">
              <CardTitle className="text-sm sm:text-base flex items-center gap-2">
                <Camera className="h-4 w-4 text-primary" />
                Cámara en vivo
              </CardTitle>
              <CardDescription className="text-xs">Pantalla completa para mejor captura</CardDescription>
            </CardHeader>
            <CardContent>
              <Button variant="outline" className="w-full gap-2 text-sm" onClick={startCamera}>
                <Camera className="h-4 w-4" />
                Abrir cámara
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Image preview with measurement tool */}
        {preview && (
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">Vista previa y medición</CardTitle>
                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={clearImage}>
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Measurement tool controls */}
              <div className="flex gap-2 items-center flex-wrap">
                <Button
                  variant={measureMode ? "default" : "outline"}
                  size="sm"
                  className="gap-2"
                  onClick={() => {
                    setMeasureMode(!measureMode);
                    if (!measureMode) redrawMeasurements();
                  }}
                >
                  <Ruler className="h-4 w-4" />
                  {measureMode ? "Midiendo..." : "Activar medición"}
                </Button>
                {measurements.length > 0 && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setMeasurements([]);
                      setCurrentMeasure(null);
                      redrawMeasurements();
                    }}
                  >
                    Limpiar medidas
                  </Button>
                )}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setZoom(Math.max(0.5, zoom - 0.1))}
                  disabled={!measureMode}
                >
                  <ZoomOut className="h-4 w-4" />
                </Button>
                <span className="text-xs text-muted-foreground">{(zoom * 100).toFixed(0)}%</span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setZoom(Math.min(2, zoom + 0.1))}
                  disabled={!measureMode}
                >
                  <ZoomIn className="h-4 w-4" />
                </Button>
              </div>

              {/* Canvas for measurement */}
              {measureMode ? (
                <canvas
                  ref={measureCanvasRef}
                  onClick={handleMeasureCanvasClick}
                  className="w-full rounded-lg bg-black cursor-crosshair"
                  style={{ maxHeight: "500px", objectFit: "contain" }}
                />
              ) : (
                <img
                  src={preview}
                  alt="Terreno capturado"
                  className="w-full rounded-lg object-cover max-h-96"
                />
              )}

              {/* Measurements list */}
              {measurements.length > 0 && (
                <div className="bg-muted/50 rounded-lg p-3 space-y-1 text-xs">
                  <p className="font-medium">Medidas capturadas:</p>
                  {measurements.map((m, i) => (
                    <p key={i} className="text-muted-foreground">
                      Línea {i + 1}: {m.distance.toFixed(0)} píxeles
                    </p>
                  ))}
                  <p className="text-xs text-amber-600 mt-2">
                    💡 Las medidas en píxeles se usan como referencia. Especifica el área real en m² abajo.
                  </p>
                </div>
              )}

              {/* Area input */}
              <div className="space-y-2">
                <Label htmlFor="area" className="text-sm font-medium">
                  Área aproximada del terreno (opcional)
                </Label>
                <div className="flex gap-2 items-center">
                  <Input
                    id="area"
                    type="number"
                    placeholder="Ej: 150"
                    value={areaM2}
                    onChange={e => setAreaM2(e.target.value)}
                    className="max-w-[160px]"
                  />
                  <span className="text-sm text-muted-foreground">m²</span>
                </div>
                <p className="text-xs text-muted-foreground">
                  Si no lo sabes, el sistema lo estimará automáticamente en el análisis.
                </p>
              </div>

              {uploaded ? (
                <div className="flex items-center gap-2 text-sm text-emerald-700 bg-emerald-50 rounded-lg px-3 py-2">
                  <CheckCircle2 className="h-4 w-4 shrink-0" />
                  Imagen guardada correctamente
                </div>
              ) : (
                <Button
                  className="w-full gap-2"
                  onClick={handleUpload}
                  disabled={uploading}
                >
                  {uploading ? "Guardando..." : (
                    <>
                      <Upload className="h-4 w-4" />
                      Guardar imagen del terreno
                    </>
                  )}
                </Button>
              )}

              {uploaded && (
                <Button
                  variant="outline"
                  className="w-full gap-2"
                  onClick={() => setLocation("/analisis")}
                >
                  Continuar al Análisis
                  <ArrowRight className="h-4 w-4" />
                </Button>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
}
