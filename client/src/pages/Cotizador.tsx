import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { trpc } from "@/lib/trpc";
import { useCurrentProjectId } from "@/hooks/useProject";
import { Calculator, ArrowRight, AlertCircle, CheckCircle2, TriangleAlert, Download } from "lucide-react";
import { useLocation } from "wouter";
import { toast } from "sonner";

export default function Cotizador() {
  const [, setLocation] = useLocation();
  const { projectId } = useCurrentProjectId();

  const { data: projectData } = trpc.projects.getById.useQuery(
    { id: projectId! },
    { enabled: !!projectId }
  );

  const project = projectData?.project;
  const quotation = project?.quotation as any;
  const layout = project?.designLayout as any;

  const handleExport = () => {
    if (!quotation || !project) return;
    const lines = [
      `COTIZACIÓN — ${project.name}`,
      `Fecha: ${new Date().toLocaleDateString("es-ES")}`,
      `Tipo: ${project.projectType || "N/A"}`,
      `Área: ${project.areaM2 || "N/A"} m²`,
      `Clima: ${project.climate || "N/A"}`,
      "",
      "DETALLE DE MATERIALES:",
      "─".repeat(60),
      ...(quotation.items || []).map((item: any) =>
        `${item.plantName.padEnd(30)} ${String(item.quantity).padStart(3)} u × $${Number(item.unitPrice).toFixed(2).padStart(8)} = $${Number(item.totalPrice).toFixed(2).padStart(10)}`
      ),
      "─".repeat(60),
      `${"Subtotal materiales".padEnd(44)} $${Number(quotation.subtotal).toFixed(2).padStart(10)}`,
      `${"Mano de obra (25%)".padEnd(44)} $${Number(quotation.laborCost).toFixed(2).padStart(10)}`,
      "═".repeat(60),
      `${"TOTAL".padEnd(44)} $${Number(quotation.total).toFixed(2).padStart(10)} ${quotation.currency}`,
    ];
    const blob = new Blob([lines.join("\n")], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `cotizacion-${project.name.replace(/\s+/g, "-")}.txt`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Cotización exportada");
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
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold flex items-center gap-2">
              <Calculator className="h-5 w-5 text-primary" />
              Módulo 6 — Cotizador
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Proyecto: <span className="font-medium text-foreground">{project?.name}</span>
            </p>
          </div>
          {quotation && (
            <Button variant="outline" size="sm" className="gap-2" onClick={handleExport}>
              <Download className="h-4 w-4" />
              Exportar
            </Button>
          )}
        </div>

        {!quotation ? (
          <Card className="border-dashed">
            <CardContent className="flex flex-col items-center gap-4 py-12">
              <Calculator className="h-10 w-10 text-muted-foreground/40" />
              <div className="text-center">
                <p className="font-medium text-muted-foreground">Sin cotización</p>
                <p className="text-sm text-muted-foreground/70">Genera el diseño en el Módulo 5 para obtener la cotización</p>
              </div>
              <Button onClick={() => setLocation("/diseno")} variant="outline">
                Ir al Motor de Diseño
              </Button>
            </CardContent>
          </Card>
        ) : (
          <>
            {/* Summary cards */}
            <div className="grid grid-cols-3 gap-3">
              <Card>
                <CardContent className="pt-4 pb-3 text-center">
                  <p className="text-xl font-bold text-foreground">${Number(quotation.subtotal).toFixed(0)}</p>
                  <p className="text-xs text-muted-foreground mt-1">Materiales</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-4 pb-3 text-center">
                  <p className="text-xl font-bold text-blue-600">${Number(quotation.laborCost).toFixed(0)}</p>
                  <p className="text-xs text-muted-foreground mt-1">Mano de obra</p>
                </CardContent>
              </Card>
              <Card className="border-primary/30 bg-primary/5">
                <CardContent className="pt-4 pb-3 text-center">
                  <p className="text-xl font-bold text-primary">${Number(quotation.total).toFixed(0)}</p>
                  <p className="text-xs text-muted-foreground mt-1">Total {quotation.currency}</p>
                </CardContent>
              </Card>
            </div>

            {/* Project info */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Información del proyecto</CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
                <div>
                  <p className="text-xs text-muted-foreground">Tipo</p>
                  <p className="font-medium">{project?.projectType || "N/A"}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Área</p>
                  <p className="font-medium">{project?.areaM2 || "N/A"} m²</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Clima</p>
                  <p className="font-medium">{project?.climate || "N/A"}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Elementos</p>
                  <p className="font-medium">{quotation.items?.length || 0} tipos</p>
                </div>
              </CardContent>
            </Card>

            {/* Itemized list */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Detalle de materiales</CardTitle>
                <CardDescription className="text-xs">Precios reales del inventario · Stock validado</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-0">
                  {quotation.items?.map((item: any, i: number) => (
                    <div key={i} className="flex items-center gap-3 py-2.5 border-b last:border-0 text-sm">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="font-medium text-sm">{item.plantName}</p>
                          {!item.stockSufficient && (
                            <Badge variant="outline" className="text-xs text-amber-600 border-amber-300">
                              <TriangleAlert className="h-3 w-3 mr-1" />
                              Stock limitado
                            </Badge>
                          )}
                          {item.stockSufficient && (
                            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {item.quantity} unidades × ${Number(item.unitPrice).toFixed(2)} c/u
                          {!item.stockSufficient && ` (disponible: ${item.stockAvailable})`}
                        </p>
                      </div>
                      <p className="font-bold text-sm shrink-0">${Number(item.totalPrice).toFixed(2)}</p>
                    </div>
                  ))}
                </div>

                {/* Totals */}
                <div className="mt-4 rounded-lg bg-muted/50 p-4 space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Subtotal materiales</span>
                    <span>${Number(quotation.subtotal).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Mano de obra (25%)</span>
                    <span>${Number(quotation.laborCost).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between font-bold text-lg border-t pt-2 mt-2">
                    <span>Total del proyecto</span>
                    <span className="text-primary">${Number(quotation.total).toFixed(2)} {quotation.currency}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

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
