import { sql } from "drizzle-orm";
import { index, integer, real, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";

export const hotspots = sqliteTable("hotspots", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  area: text("area").notNull(),
  category: text("category").notNull(),
  issue: text("issue").notNull(),
  priority: real("priority").notNull().default(1),
  reportCount: integer("report_count").notNull().default(0),
  growth: integer("growth").notNull().default(0),
  status: text("status").notNull().default("Reported"),
  radius: text("radius").notNull().default("0.3 km"),
  positionLeft: integer("position_left").notNull().default(50),
  positionTop: integer("position_top").notNull().default(50),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
}, (table) => [
  uniqueIndex("idx_hotspots_area_category").on(table.area, table.category),
  index("idx_hotspots_priority").on(table.priority),
  index("idx_hotspots_status").on(table.status),
]);

export const complaints = sqliteTable("complaints", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  trackingCode: text("tracking_code").notNull().unique(),
  description: text("description").notNull(),
  location: text("location").notNull(),
  latitude: real("latitude"),
  longitude: real("longitude"),
  category: text("category").notNull(),
  subcategory: text("subcategory").notNull(),
  severity: real("severity").notNull(),
  confidence: real("confidence").notNull(),
  status: text("status").notNull().default("Reported"),
  hotspotId: integer("hotspot_id").references(() => hotspots.id),
  evidenceKey: text("evidence_key"),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
}, (table) => [
  index("idx_complaints_hotspot_id").on(table.hotspotId),
  index("idx_complaints_category_location").on(table.category, table.location),
  index("idx_complaints_created_at").on(table.createdAt),
  index("idx_complaints_status").on(table.status),
]);

export const organizations = sqliteTable("organizations", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
  expertise: text("expertise").notNull(),
  operatingRegion: text("operating_region").notNull(),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});

export const adoptions = sqliteTable("adoptions", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  organizationId: integer("organization_id").notNull().references(() => organizations.id),
  hotspotId: integer("hotspot_id").notNull().references(() => hotspots.id),
  status: text("status").notNull().default("Under Investigation"),
  adoptedAt: text("adopted_at").notNull().default(sql`CURRENT_TIMESTAMP`),
}, (table) => [
  uniqueIndex("idx_adoptions_hotspot").on(table.hotspotId),
  index("idx_adoptions_organization").on(table.organizationId),
]);
