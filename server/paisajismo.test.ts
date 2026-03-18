import { describe, expect, it, vi, beforeEach } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

// Mock the database module
vi.mock("./db", () => ({
  getAllPlants: vi.fn().mockResolvedValue([
    {
      id: 1,
      name: "Lavanda",
      scientificName: "Lavandula angustifolia",
      type: "plant",
      price: "45.00",
      stock: 200,
      region: "Mediterráneo",
      climate: "mediterranean",
      sizeCategory: "small",
      heightMin: "0.30",
      heightMax: "0.80",
      spacingMin: "0.40",
      spacingMax: "0.60",
      sun: "full",
      maintenance: "low",
      waterNeeds: "low",
      description: "Planta aromática",
      imageUrl: null,
      active: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      id: 2,
      name: "Jacaranda",
      scientificName: "Jacaranda mimosifolia",
      type: "tree",
      price: "850.00",
      stock: 15,
      region: "América Latina",
      climate: "subtropical",
      sizeCategory: "xlarge",
      heightMin: "8.00",
      heightMax: "15.00",
      spacingMin: "5.00",
      spacingMax: "8.00",
      sun: "full",
      maintenance: "low",
      waterNeeds: "low",
      description: "Árbol ornamental",
      imageUrl: null,
      active: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  ]),
  getPlantById: vi.fn().mockResolvedValue({
    id: 1,
    name: "Lavanda",
    type: "plant",
    price: "45.00",
    stock: 200,
    climate: "mediterranean",
    sizeCategory: "small",
    spacingMin: "0.40",
    spacingMax: "0.60",
    sun: "full",
    maintenance: "low",
    waterNeeds: "low",
    active: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  }),
  getPlantsByIds: vi.fn().mockResolvedValue([]),
  upsertPlant: vi.fn().mockResolvedValue(1),
  deletePlant: vi.fn().mockResolvedValue(undefined),
  getProjectsByUser: vi.fn().mockResolvedValue([
    {
      id: 1,
      userId: 1,
      name: "Jardín test",
      status: "capturing",
      originalImageUrl: null,
      originalImageKey: null,
      cleanedImageUrl: null,
      cleanedImageKey: null,
      renderedImageUrl: null,
      renderedImageKey: null,
      terrainAnalysis: null,
      designLayout: null,
      quotation: null,
      areaM2: null,
      climate: null,
      region: null,
      projectType: null,
      notes: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  ]),
  getProjectById: vi.fn().mockResolvedValue({
    id: 1,
    userId: 1,
    name: "Jardín test",
    status: "capturing",
    originalImageUrl: "https://example.com/image.jpg",
    originalImageKey: "test-key",
    cleanedImageUrl: null,
    cleanedImageKey: null,
    renderedImageUrl: null,
    renderedImageKey: null,
    terrainAnalysis: null,
    designLayout: null,
    quotation: null,
    areaM2: "50",
    climate: "mediterranean",
    region: null,
    projectType: null,
    notes: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  }),
  createProject: vi.fn().mockResolvedValue(42),
  updateProject: vi.fn().mockResolvedValue(undefined),
  deleteProject: vi.fn().mockResolvedValue(undefined),
  getProjectItems: vi.fn().mockResolvedValue([]),
  setProjectItems: vi.fn().mockResolvedValue(undefined),
}));

function createAuthContext(userId = 1): TrpcContext {
  return {
    user: {
      id: userId,
      openId: "test-user",
      email: "test@example.com",
      name: "Test User",
      loginMethod: "manus",
      role: "user",
      createdAt: new Date(),
      updatedAt: new Date(),
      lastSignedIn: new Date(),
    },
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: { clearCookie: vi.fn() } as unknown as TrpcContext["res"],
  };
}

function createPublicContext(): TrpcContext {
  return {
    user: null,
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: { clearCookie: vi.fn() } as unknown as TrpcContext["res"],
  };
}

// ─── Auth tests ───────────────────────────────────────────────────────────────
describe("auth.me", () => {
  it("returns null for unauthenticated user", async () => {
    const caller = appRouter.createCaller(createPublicContext());
    const result = await caller.auth.me();
    expect(result).toBeNull();
  });

  it("returns user for authenticated user", async () => {
    const caller = appRouter.createCaller(createAuthContext());
    const result = await caller.auth.me();
    expect(result).not.toBeNull();
    expect(result?.name).toBe("Test User");
  });
});

// ─── Inventory tests ──────────────────────────────────────────────────────────
describe("inventory.list", () => {
  it("returns list of plants", async () => {
    const caller = appRouter.createCaller(createPublicContext());
    const result = await caller.inventory.list({});
    expect(Array.isArray(result)).toBe(true);
    expect(result.length).toBeGreaterThan(0);
  });

  it("returns plants with required fields", async () => {
    const caller = appRouter.createCaller(createPublicContext());
    const result = await caller.inventory.list({});
    const plant = result[0];
    expect(plant).toHaveProperty("id");
    expect(plant).toHaveProperty("name");
    expect(plant).toHaveProperty("type");
    expect(plant).toHaveProperty("price");
    expect(plant).toHaveProperty("stock");
    expect(plant).toHaveProperty("climate");
  });

  it("accepts type filter", async () => {
    const caller = appRouter.createCaller(createPublicContext());
    const result = await caller.inventory.list({ type: "plant" });
    expect(Array.isArray(result)).toBe(true);
  });
});

describe("inventory.getById", () => {
  it("returns plant by id", async () => {
    const caller = appRouter.createCaller(createPublicContext());
    const result = await caller.inventory.getById({ id: 1 });
    expect(result.id).toBe(1);
    expect(result.name).toBe("Lavanda");
  });
});

// ─── Projects tests ───────────────────────────────────────────────────────────
describe("projects.list", () => {
  it("returns user projects", async () => {
    const caller = appRouter.createCaller(createAuthContext());
    const result = await caller.projects.list();
    expect(Array.isArray(result)).toBe(true);
    expect(result.length).toBeGreaterThan(0);
    expect(result[0].name).toBe("Jardín test");
  });
});

describe("projects.create", () => {
  it("creates a new project and returns id", async () => {
    const caller = appRouter.createCaller(createAuthContext());
    const result = await caller.projects.create({ name: "Mi jardín nuevo" });
    expect(result).toHaveProperty("id");
    expect(typeof result.id).toBe("number");
  });
});

describe("projects.getById", () => {
  it("returns project with items for owner", async () => {
    const caller = appRouter.createCaller(createAuthContext(1));
    const result = await caller.projects.getById({ id: 1 });
    expect(result.project.id).toBe(1);
    expect(result.project.name).toBe("Jardín test");
    expect(Array.isArray(result.items)).toBe(true);
  });

  it("throws FORBIDDEN for non-owner", async () => {
    const caller = appRouter.createCaller(createAuthContext(999));
    await expect(caller.projects.getById({ id: 1 })).rejects.toThrow();
  });
});

describe("projects.update", () => {
  it("updates project fields", async () => {
    const caller = appRouter.createCaller(createAuthContext(1));
    const result = await caller.projects.update({ id: 1, name: "Nuevo nombre" });
    expect(result.success).toBe(true);
  });
});

describe("projects.delete", () => {
  it("deletes project for owner", async () => {
    const caller = appRouter.createCaller(createAuthContext(1));
    const result = await caller.projects.delete({ id: 1 });
    expect(result.success).toBe(true);
  });
});

// ─── Auth logout test ─────────────────────────────────────────────────────────
describe("auth.logout", () => {
  it("clears session cookie and returns success", async () => {
    const ctx = createAuthContext();
    const clearedCookies: string[] = [];
    (ctx.res as any).clearCookie = (name: string) => clearedCookies.push(name);
    const caller = appRouter.createCaller(ctx);
    const result = await caller.auth.logout();
    expect(result.success).toBe(true);
    expect(clearedCookies.length).toBe(1);
  });
});
