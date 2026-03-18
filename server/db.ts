import { eq, and, like, inArray } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import { InsertUser, users, plants, projects, projectItems, type InsertPlant, type InsertProject, type InsertProjectItem } from "../drizzle/schema";
import { ENV } from "./_core/env";

let _db: ReturnType<typeof drizzle> | null = null;

export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

// ─── Users ────────────────────────────────────────────────────────────────────
export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) throw new Error("User openId is required for upsert");
  const db = await getDb();
  if (!db) { console.warn("[Database] Cannot upsert user: database not available"); return; }
  try {
    const values: InsertUser = { openId: user.openId };
    const updateSet: Record<string, unknown> = {};
    const textFields = ["name", "email", "loginMethod"] as const;
    type TextField = (typeof textFields)[number];
    const assignNullable = (field: TextField) => {
      const value = user[field];
      if (value === undefined) return;
      const normalized = value ?? null;
      values[field] = normalized;
      updateSet[field] = normalized;
    };
    textFields.forEach(assignNullable);
    if (user.lastSignedIn !== undefined) { values.lastSignedIn = user.lastSignedIn; updateSet.lastSignedIn = user.lastSignedIn; }
    if (user.role !== undefined) { values.role = user.role; updateSet.role = user.role; }
    else if (user.openId === ENV.ownerOpenId) { values.role = "admin"; updateSet.role = "admin"; }
    if (!values.lastSignedIn) values.lastSignedIn = new Date();
    if (Object.keys(updateSet).length === 0) updateSet.lastSignedIn = new Date();
    await db.insert(users).values(values).onDuplicateKeyUpdate({ set: updateSet });
  } catch (error) { console.error("[Database] Failed to upsert user:", error); throw error; }
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

// ─── Plants ───────────────────────────────────────────────────────────────────
export async function getAllPlants(filters?: { type?: string; climate?: string; active?: boolean }) {
  const db = await getDb();
  if (!db) return [];
  let query = db.select().from(plants).$dynamic();
  const conditions = [];
  if (filters?.active !== undefined) conditions.push(eq(plants.active, filters.active));
  if (filters?.type) conditions.push(eq(plants.type, filters.type as any));
  if (filters?.climate && filters.climate !== "all") conditions.push(eq(plants.climate, filters.climate as any));
  if (conditions.length > 0) query = query.where(and(...conditions));
  return query.orderBy(plants.type, plants.name);
}

export async function getPlantById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(plants).where(eq(plants.id, id)).limit(1);
  return result[0];
}

export async function getPlantsByIds(ids: number[]) {
  const db = await getDb();
  if (!db) return [];
  if (ids.length === 0) return [];
  return db.select().from(plants).where(inArray(plants.id, ids));
}

export async function upsertPlant(plant: InsertPlant) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  if (plant.id) {
    await db.update(plants).set({ ...plant, updatedAt: new Date() }).where(eq(plants.id, plant.id));
    return plant.id;
  }
  const result = await db.insert(plants).values(plant);
  return (result[0] as any).insertId as number;
}

export async function deletePlant(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(plants).set({ active: false }).where(eq(plants.id, id));
}

// ─── Projects ─────────────────────────────────────────────────────────────────
export async function getProjectsByUser(userId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(projects).where(eq(projects.userId, userId)).orderBy(projects.updatedAt);
}

export async function getProjectById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(projects).where(eq(projects.id, id)).limit(1);
  return result[0];
}

export async function createProject(project: InsertProject) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(projects).values(project);
  return (result[0] as any).insertId as number;
}

export async function updateProject(id: number, data: Partial<InsertProject>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(projects).set({ ...data, updatedAt: new Date() }).where(eq(projects.id, id));
}

export async function deleteProject(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.delete(projectItems).where(eq(projectItems.projectId, id));
  await db.delete(projects).where(eq(projects.id, id));
}

// ─── Project Items ────────────────────────────────────────────────────────────
export async function getProjectItems(projectId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(projectItems).where(eq(projectItems.projectId, projectId));
}

export async function setProjectItems(projectId: number, items: InsertProjectItem[]) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.delete(projectItems).where(eq(projectItems.projectId, projectId));
  if (items.length > 0) await db.insert(projectItems).values(items);
}
