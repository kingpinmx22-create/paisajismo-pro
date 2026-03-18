import { z } from "zod";
import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, protectedProcedure, router } from "./_core/trpc";
import { TRPCError } from "@trpc/server";
import { invokeLLM, type Message } from "./_core/llm";
import { generateImage } from "./_core/imageGeneration";
import { storagePut } from "./storage";
import {
  getAllPlants,
  getPlantById,
  getPlantsByIds,
  upsertPlant,
  deletePlant,
  getProjectsByUser,
  getProjectById,
  createProject,
  updateProject,
  deleteProject,
  getProjectItems,
  setProjectItems,
} from "./db";

// ─── Inventario Router (Módulo 4) ─────────────────────────────────────────────
const inventoryRouter = router({
  list: publicProcedure
    .input(z.object({
      type: z.string().optional(),
      climate: z.string().optional(),
      activeOnly: z.boolean().optional().default(true),
    }))
    .query(async ({ input }) => {
      return getAllPlants({ type: input.type, climate: input.climate, active: input.activeOnly });
    }),

  getById: publicProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      const plant = await getPlantById(input.id);
      if (!plant) throw new TRPCError({ code: "NOT_FOUND", message: "Planta no encontrada" });
      return plant;
    }),

  upsert: protectedProcedure
    .input(z.object({
      id: z.number().optional(),
      name: z.string().min(1),
      scientificName: z.string().optional(),
      type: z.enum(["tree", "plant", "stone", "shrub", "grass"]),
      price: z.string(),
      stock: z.number().int().min(0),
      region: z.string().optional(),
      climate: z.enum(["tropical", "subtropical", "temperate", "arid", "mediterranean", "all"]),
      sizeCategory: z.enum(["small", "medium", "large", "xlarge"]),
      heightMin: z.string().optional(),
      heightMax: z.string().optional(),
      spacingMin: z.string(),
      spacingMax: z.string(),
      sun: z.enum(["full", "partial", "shade"]),
      maintenance: z.enum(["low", "medium", "high"]),
      waterNeeds: z.enum(["low", "medium", "high"]),
      description: z.string().optional(),
      active: z.boolean().optional().default(true),
    }))
    .mutation(async ({ input }) => {
      const id = await upsertPlant(input as any);
      return { id };
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      await deletePlant(input.id);
      return { success: true };
    }),
});

// ─── Projects Router (Módulos 1, 8) ───────────────────────────────────────────
const projectsRouter = router({
  list: protectedProcedure.query(async ({ ctx }) => {
    return getProjectsByUser(ctx.user.id);
  }),

  getById: protectedProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ ctx, input }) => {
      const project = await getProjectById(input.id);
      if (!project) throw new TRPCError({ code: "NOT_FOUND" });
      if (project.userId !== ctx.user.id) throw new TRPCError({ code: "FORBIDDEN" });
      const items = await getProjectItems(input.id);
      return { project, items };
    }),

  create: protectedProcedure
    .input(z.object({ name: z.string().min(1) }))
    .mutation(async ({ ctx, input }) => {
      const id = await createProject({
        userId: ctx.user.id,
        name: input.name,
        status: "capturing",
      });
      return { id };
    }),

  update: protectedProcedure
    .input(z.object({
      id: z.number(),
      name: z.string().optional(),
      status: z.enum(["capturing", "analyzing", "cleaning", "designing", "quoted", "saved"]).optional(),
      originalImageUrl: z.string().optional(),
      originalImageKey: z.string().optional(),
      cleanedImageUrl: z.string().optional(),
      cleanedImageKey: z.string().optional(),
      renderedImageUrl: z.string().optional(),
      renderedImageKey: z.string().optional(),
      terrainAnalysis: z.any().optional(),
      designLayout: z.any().optional(),
      quotation: z.any().optional(),
      areaM2: z.string().optional(),
      climate: z.string().optional(),
      region: z.string().optional(),
      projectType: z.string().optional(),
      notes: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const project = await getProjectById(input.id);
      if (!project) throw new TRPCError({ code: "NOT_FOUND" });
      if (project.userId !== ctx.user.id) throw new TRPCError({ code: "FORBIDDEN" });
      const { id, ...data } = input;
      await updateProject(id, data as any);
      return { success: true };
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const project = await getProjectById(input.id);
      if (!project) throw new TRPCError({ code: "NOT_FOUND" });
      if (project.userId !== ctx.user.id) throw new TRPCError({ code: "FORBIDDEN" });
      await deleteProject(input.id);
      return { success: true };
    }),

  // Módulo 1: Upload image to S3
  uploadImage: protectedProcedure
    .input(z.object({
      projectId: z.number(),
      imageBase64: z.string(),
      mimeType: z.string().default("image/jpeg"),
      imageType: z.enum(["original", "cleaned"]).default("original"),
    }))
    .mutation(async ({ ctx, input }) => {
      const project = await getProjectById(input.projectId);
      if (!project) throw new TRPCError({ code: "NOT_FOUND" });
      if (project.userId !== ctx.user.id) throw new TRPCError({ code: "FORBIDDEN" });

      const base64Data = input.imageBase64.replace(/^data:image\/\w+;base64,/, "");
      const buffer = Buffer.from(base64Data, "base64");
      const ext = input.mimeType.split("/")[1] || "jpg";
      const suffix = Math.random().toString(36).substring(2, 8);
      const key = `projects/${ctx.user.id}/${input.projectId}/${input.imageType}-${suffix}.${ext}`;
      const { url } = await storagePut(key, buffer, input.mimeType);

      if (input.imageType === "original") {
        await updateProject(input.projectId, { originalImageUrl: url, originalImageKey: key, status: "analyzing" });
      } else {
        await updateProject(input.projectId, { cleanedImageUrl: url, cleanedImageKey: key });
      }

      return { url, key };
    }),

  // Módulo 2: Analyze terrain
  analyzeTerrain: protectedProcedure
    .input(z.object({
      projectId: z.number(),
      imageUrl: z.string(),
      areaM2: z.number().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const project = await getProjectById(input.projectId);
      if (!project) throw new TRPCError({ code: "NOT_FOUND" });
      if (project.userId !== ctx.user.id) throw new TRPCError({ code: "FORBIDDEN" });

      const analyzeMessages: Message[] = [
          {
            role: "system",
            content: `Eres un experto en análisis de terrenos para paisajismo profesional. 
Analiza la imagen del terreno y devuelve un JSON estructurado con el análisis completo.
Sé preciso y práctico. El análisis se usará para generar un diseño de jardín real.`,
          },
          {
            role: "user",
            content: [
              {
                type: "image_url" as const,
                image_url: { url: input.imageUrl, detail: "high" as const },
              },
              {
                type: "text" as const,
                text: `Analiza este terreno para paisajismo. ${input.areaM2 ? `El área aproximada es ${input.areaM2} m².` : "Estima el área aproximada."}
Devuelve SOLO JSON válido con esta estructura exacta:
{
  "soilType": "tipo de suelo detectado",
  "soilCondition": "condición del suelo (seco/húmedo/normal)",
  "estimatedAreaM2": número estimado en m²,
  "usableAreaM2": área usable en m² (descontando obstáculos),
  "usableAreaPercent": porcentaje del área usable (0-100),
  "climate": "tropical|subtropical|temperate|arid|mediterranean",
  "sunExposure": "full|partial|shade",
  "obstacles": [
    {"type": "tipo de obstáculo", "description": "descripción", "positionZone": "norte/sur/este/oeste/centro"}
  ],
  "zones": [
    {"id": "zona1", "name": "nombre de zona", "type": "usable|obstacle|path", "description": "descripción", "percentOfTotal": número}
  ],
  "recommendations": ["recomendación 1", "recomendación 2"],
  "suggestedClimate": "clima sugerido para las plantas",
  "notes": "observaciones adicionales"
}`,
              },
            ],
          },
        ];
      const response = await invokeLLM({
        messages: analyzeMessages,
        response_format: {
          type: "json_schema",
          json_schema: {
            name: "terrain_analysis",
            strict: true,
            schema: {
              type: "object",
              properties: {
                soilType: { type: "string" },
                soilCondition: { type: "string" },
                estimatedAreaM2: { type: "number" },
                usableAreaM2: { type: "number" },
                usableAreaPercent: { type: "number" },
                climate: { type: "string" },
                sunExposure: { type: "string" },
                obstacles: { type: "array", items: { type: "object", properties: { type: { type: "string" }, description: { type: "string" }, positionZone: { type: "string" } }, required: ["type", "description", "positionZone"], additionalProperties: false } },
                zones: { type: "array", items: { type: "object", properties: { id: { type: "string" }, name: { type: "string" }, type: { type: "string" }, description: { type: "string" }, percentOfTotal: { type: "number" } }, required: ["id", "name", "type", "description", "percentOfTotal"], additionalProperties: false } },
                recommendations: { type: "array", items: { type: "string" } },
                suggestedClimate: { type: "string" },
                notes: { type: "string" },
              },
              required: ["soilType", "soilCondition", "estimatedAreaM2", "usableAreaM2", "usableAreaPercent", "climate", "sunExposure", "obstacles", "zones", "recommendations", "suggestedClimate", "notes"],
              additionalProperties: false,
            },
          },
        },
      });

      const rawContent = response.choices[0]?.message?.content;
      const content = typeof rawContent === "string" ? rawContent : JSON.stringify(rawContent);
      if (!content) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "No se pudo analizar el terreno" });
      const analysis = JSON.parse(content);
      const areaM2 = input.areaM2 ? String(input.areaM2) : String(analysis.estimatedAreaM2);

      await updateProject(input.projectId, {
        terrainAnalysis: analysis,
        areaM2,
        climate: analysis.suggestedClimate,
        status: "cleaning",
      });

      return analysis;
    }),

  // Módulo 5: Generate design
  generateDesign: protectedProcedure
    .input(z.object({
      projectId: z.number(),
      projectType: z.string().default("jardín residencial"),
      climate: z.string().optional(),
      region: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const project = await getProjectById(input.projectId);
      if (!project) throw new TRPCError({ code: "NOT_FOUND" });
      if (project.userId !== ctx.user.id) throw new TRPCError({ code: "FORBIDDEN" });

      const analysis = project.terrainAnalysis as any;
      if (!analysis) throw new TRPCError({ code: "BAD_REQUEST", message: "Primero analiza el terreno" });

      const climate = input.climate || project.climate || analysis.suggestedClimate || "temperate";
      const areaM2 = parseFloat(project.areaM2 || "50");

      // Get compatible plants from inventory
      const availablePlants = await getAllPlants({ active: true });
      const compatiblePlants = availablePlants.filter(p =>
        p.stock > 0 && (p.climate === climate || p.climate === "all")
      );

      if (compatiblePlants.length === 0) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "No hay plantas disponibles para este clima" });
      }

      const plantList = compatiblePlants.map(p =>
        `ID:${p.id} | ${p.name} (${p.type}) | Precio: $${p.price} | Stock: ${p.stock} | Spacing: ${p.spacingMin}-${p.spacingMax}m | Tamaño: ${p.sizeCategory} | Sol: ${p.sun} | Mantenimiento: ${p.maintenance}`
      ).join("\n");

      const designMessages: Message[] = [
          {
            role: "system",
            content: `Eres un diseñador de paisajismo profesional experto. 
Genera diseños de jardín funcionales y estéticos usando SOLO los elementos del inventario proporcionado.
Respeta el spacing entre plantas, evita solapamientos, y distribuye lógicamente (árboles grandes al fondo, plantas decorativas al frente).
Las posiciones x,y son porcentajes del área total (0-100).`,
          },
          {
            role: "user",
            content: `Genera un diseño de ${input.projectType} para un terreno de ${areaM2} m².
Clima: ${climate}
Análisis del terreno: ${JSON.stringify(analysis, null, 2)}

INVENTARIO DISPONIBLE (usa SOLO estos elementos):
${plantList}

Reglas:
1. Árboles (xlarge/large) en la zona posterior (y: 60-90)
2. Arbustos y plantas medianas en zona media (y: 30-60)  
3. Plantas pequeñas y decorativas al frente (y: 5-30)
4. Respetar spacing mínimo entre elementos del mismo tipo
5. Validar stock disponible
6. Máximo 15 elementos distintos para este tamaño de jardín
7. Incluir al menos un elemento de cada tipo si hay stock

Devuelve SOLO JSON válido:`,
          },
        ];
      const response = await invokeLLM({
        messages: designMessages,
        response_format: {
          type: "json_schema",
          json_schema: {
            name: "design_layout",
            strict: true,
            schema: {
              type: "object",
              properties: {
                projectType: { type: "string" },
                totalElements: { type: "number" },
                designNotes: { type: "string" },
                elements: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      plantId: { type: "number" },
                      plantName: { type: "string" },
                      type: { type: "string" },
                      quantity: { type: "number" },
                      positionX: { type: "number" },
                      positionY: { type: "number" },
                      zone: { type: "string" },
                      justification: { type: "string" },
                    },
                    required: ["plantId", "plantName", "type", "quantity", "positionX", "positionY", "zone", "justification"],
                    additionalProperties: false,
                  },
                },
              },
              required: ["projectType", "totalElements", "designNotes", "elements"],
              additionalProperties: false,
            },
          },
        },
      });

      const rawContent2 = response.choices[0]?.message?.content;
      const content = typeof rawContent2 === "string" ? rawContent2 : JSON.stringify(rawContent2);
      if (!content) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "No se pudo generar el diseño" });

      const layout = JSON.parse(content);

      // Módulo 6: Calculate quotation
      const plantIds = layout.elements.map((e: any) => e.plantId);
      const plantsData = await getPlantsByIds(plantIds);
      const plantsMap = new Map(plantsData.map(p => [p.id, p]));

      let totalPrice = 0;
      const quotationItems: any[] = [];
      const projectItemsData: any[] = [];

      for (const element of layout.elements) {
        const plant = plantsMap.get(element.plantId);
        if (!plant) continue;
        const qty = Math.min(element.quantity, plant.stock);
        const unitPrice = parseFloat(String(plant.price));
        const total = unitPrice * qty;
        totalPrice += total;

        quotationItems.push({
          plantId: plant.id,
          plantName: plant.name,
          type: plant.type,
          quantity: qty,
          unitPrice,
          totalPrice: total,
          stockAvailable: plant.stock,
          stockSufficient: plant.stock >= element.quantity,
        });

        projectItemsData.push({
          projectId: input.projectId,
          plantId: plant.id,
          quantity: qty,
          positionX: String(element.positionX),
          positionY: String(element.positionY),
          unitPrice: String(unitPrice),
          totalPrice: String(total),
        });
      }

      const quotation = {
        items: quotationItems,
        subtotal: totalPrice,
        laborCost: totalPrice * 0.25,
        total: totalPrice * 1.25,
        currency: "USD",
        generatedAt: new Date().toISOString(),
      };

      await setProjectItems(input.projectId, projectItemsData);
      await updateProject(input.projectId, {
        designLayout: layout,
        quotation,
        projectType: input.projectType,
        climate,
        region: input.region,
        status: "quoted",
      });

      return { layout, quotation };
    }),

  // Módulo 7: Render design on image
  renderDesign: protectedProcedure
    .input(z.object({
      projectId: z.number(),
    }))
    .mutation(async ({ ctx, input }) => {
      const project = await getProjectById(input.projectId);
      if (!project) throw new TRPCError({ code: "NOT_FOUND" });
      if (project.userId !== ctx.user.id) throw new TRPCError({ code: "FORBIDDEN" });

      const layout = project.designLayout as any;
      const imageUrl = project.cleanedImageUrl || project.originalImageUrl;
      if (!layout || !imageUrl) throw new TRPCError({ code: "BAD_REQUEST", message: "Necesitas imagen y diseño primero" });

      const elementsDescription = layout.elements
        .map((e: any) => `${e.plantName} en posición (${e.positionX.toFixed(0)}%, ${e.positionY.toFixed(0)}%) - zona ${e.zone}`)
        .join(", ");

      const prompt = `Professional landscape design visualization. 
Place these garden elements on the terrain: ${elementsDescription}.
Show realistic plants and trees in their correct positions.
Maintain photorealistic style. Keep the original terrain structure visible.
Add subtle position markers for each plant group.`;

      const { url: renderedUrl } = await generateImage({
        prompt,
        originalImages: [{ url: imageUrl, mimeType: "image/jpeg" }],
      });

      if (!renderedUrl) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "No se pudo generar la imagen" });

      const suffix = Math.random().toString(36).substring(2, 8);
      const key = `projects/${ctx.user.id}/${input.projectId}/rendered-${suffix}.jpg`;
      const imgResponse = await fetch(renderedUrl as string);
      const imgBuffer = Buffer.from(await imgResponse.arrayBuffer());
      const { url: storedUrl } = await storagePut(key, imgBuffer, "image/jpeg");

      await updateProject(input.projectId, {
        renderedImageUrl: storedUrl,
        renderedImageKey: key,
        status: "saved",
      });

      return { renderedImageUrl: storedUrl };
    }),

  getItems: protectedProcedure
    .input(z.object({ projectId: z.number() }))
    .query(async ({ ctx, input }) => {
      const project = await getProjectById(input.projectId);
      if (!project) throw new TRPCError({ code: "NOT_FOUND" });
      if (project.userId !== ctx.user.id) throw new TRPCError({ code: "FORBIDDEN" });
      return getProjectItems(input.projectId);
    }),
});

// ─── App Router ───────────────────────────────────────────────────────────────
export const appRouter = router({
  system: systemRouter,
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return { success: true } as const;
    }),
  }),
  inventory: inventoryRouter,
  projects: projectsRouter,
});

export type AppRouter = typeof appRouter;
