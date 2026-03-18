import {
  int,
  mysqlEnum,
  mysqlTable,
  text,
  timestamp,
  varchar,
  decimal,
  json,
  boolean,
} from "drizzle-orm/mysql-core";

export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

// ─── Módulo 4: Inventario ─────────────────────────────────────────────────────
export const plants = mysqlTable("plants", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 200 }).notNull(),
  scientificName: varchar("scientificName", { length: 200 }),
  type: mysqlEnum("type", ["tree", "plant", "stone", "shrub", "grass"]).notNull(),
  price: decimal("price", { precision: 10, scale: 2 }).notNull(),
  stock: int("stock").notNull().default(0),
  region: varchar("region", { length: 100 }),
  climate: mysqlEnum("climate", ["tropical", "subtropical", "temperate", "arid", "mediterranean", "all"]).notNull().default("all"),
  sizeCategory: mysqlEnum("sizeCategory", ["small", "medium", "large", "xlarge"]).notNull(),
  heightMin: decimal("heightMin", { precision: 6, scale: 2 }),
  heightMax: decimal("heightMax", { precision: 6, scale: 2 }),
  spacingMin: decimal("spacingMin", { precision: 6, scale: 2 }).notNull(),
  spacingMax: decimal("spacingMax", { precision: 6, scale: 2 }).notNull(),
  sun: mysqlEnum("sun", ["full", "partial", "shade"]).notNull(),
  maintenance: mysqlEnum("maintenance", ["low", "medium", "high"]).notNull(),
  waterNeeds: mysqlEnum("waterNeeds", ["low", "medium", "high"]).notNull().default("medium"),
  description: text("description"),
  imageUrl: text("imageUrl"),
  active: boolean("active").notNull().default(true),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Plant = typeof plants.$inferSelect;
export type InsertPlant = typeof plants.$inferInsert;

// ─── Módulo 8: Proyectos ──────────────────────────────────────────────────────
export const projects = mysqlTable("projects", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  name: varchar("name", { length: 200 }).notNull(),
  status: mysqlEnum("status", ["capturing", "analyzing", "cleaning", "designing", "quoted", "saved"]).notNull().default("capturing"),

  // Módulo 1: imagen original
  originalImageUrl: text("originalImageUrl"),
  originalImageKey: varchar("originalImageKey", { length: 500 }),

  // Módulo 3: imagen limpia
  cleanedImageUrl: text("cleanedImageUrl"),
  cleanedImageKey: varchar("cleanedImageKey", { length: 500 }),

  // Módulo 7: imagen con diseño renderizado
  renderedImageUrl: text("renderedImageUrl"),
  renderedImageKey: varchar("renderedImageKey", { length: 500 }),

  // Módulo 2: análisis del terreno (JSON)
  terrainAnalysis: json("terrainAnalysis"),

  // Módulo 5: diseño generado (JSON con posiciones)
  designLayout: json("designLayout"),

  // Módulo 6: cotización (JSON)
  quotation: json("quotation"),

  // Metadatos del terreno
  areaM2: decimal("areaM2", { precision: 10, scale: 2 }),
  climate: varchar("climate", { length: 50 }),
  region: varchar("region", { length: 100 }),
  projectType: varchar("projectType", { length: 100 }),

  notes: text("notes"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Project = typeof projects.$inferSelect;
export type InsertProject = typeof projects.$inferInsert;

// ─── Elementos del diseño por proyecto ───────────────────────────────────────
export const projectItems = mysqlTable("project_items", {
  id: int("id").autoincrement().primaryKey(),
  projectId: int("projectId").notNull(),
  plantId: int("plantId").notNull(),
  quantity: int("quantity").notNull().default(1),
  positionX: decimal("positionX", { precision: 8, scale: 4 }),
  positionY: decimal("positionY", { precision: 8, scale: 4 }),
  unitPrice: decimal("unitPrice", { precision: 10, scale: 2 }).notNull(),
  totalPrice: decimal("totalPrice", { precision: 10, scale: 2 }).notNull(),
  notes: text("notes"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type ProjectItem = typeof projectItems.$inferSelect;
export type InsertProjectItem = typeof projectItems.$inferInsert;
