import { z } from "zod";
import { parseDay } from "./time";
import type { Catalog, DataPackage } from "./types";
const text = z.string().min(1);
const day = z.string().refine((x) => {
  try {
    parseDay(x);
    return true;
  } catch {
    return false;
  }
}, "无效日期");
const bound = z
  .strictObject({ earliest: day, latest: day })
  .refine((x) => x.earliest <= x.latest, "时间范围倒置");
export const validitySchema = z
  .strictObject({
    start: bound,
    endExclusive: bound,
    precision: z.enum(["day", "month", "year", "range"]),
    label: text,
  })
  .refine(
    (x) =>
      x.start.earliest < x.endExclusive.latest &&
      x.start.latest < x.endExclusive.latest,
    "起止时间倒置",
  );
const evidence = z.strictObject({
  sourceId: text,
  locator: text,
  note: z.string(),
});
const evidenceList = z.array(evidence).min(1);
const review = z.strictObject({
  status: z.enum(["pending", "verified", "rejected"]),
  reviewerKind: z.enum(["human", "agent"]),
  reviewer: text,
  checkedAt: text,
  evidence: evidenceList,
});
const point = z.tuple([
  z.number().min(-180).max(180),
  z.number().min(-90).max(90),
]);
const ring = z
  .array(point)
  .min(4)
  .refine(
    (p) => p[0][0] === p.at(-1)![0] && p[0][1] === p.at(-1)![1],
    "环未闭合",
  );
const polygon = z.strictObject({
  type: z.literal("Polygon"),
  coordinates: z.array(ring).min(1),
});
const multi = z.strictObject({
  type: z.literal("MultiPolygon"),
  coordinates: z.array(z.array(ring).min(1)).min(1),
});
const geometry = z.union([polygon, multi]);
const named = z.strictObject({
  text,
  validity: validitySchema,
  evidence: evidenceList,
});
const entity = z.strictObject({
  id: text,
  kind: z.enum(["polity", "local-power", "confederation", "administration"]),
  names: z.array(named).min(1),
  existence: validitySchema,
  activePeriods: z.array(validitySchema).min(1).optional(),
  color: z.string().regex(/^#[\da-f]{6}$/i),
  regionIds: z.array(text).min(1),
  capitals: z.array(
    z.strictObject({
      placeId: text,
      validity: validitySchema,
      evidence: evidenceList,
    }),
  ),
});
const place = z.strictObject({
  id: text,
  names: z.array(named).min(1),
  locations: z.array(
    z.strictObject({
      geometry: z.union([
        geometry,
        z.strictObject({ type: z.literal("Point"), coordinates: point }),
      ]),
      validity: validitySchema,
      spatialPrecision: z.enum(["specified", "approximate"]),
      evidence: evidenceList,
    }),
  ),
});
const source = z.strictObject({
  id: text,
  title: text,
  creator: text,
  edition: text,
  url: z.string().url().nullable(),
  accessedAt: text,
  license: text,
  redistribution: z.enum(["allowed", "unknown", "denied"]),
  permissionEvidence: z.string(),
});
const properties = z
  .strictObject({
    id: text,
    entityId: text,
    regionIds: z.array(text).min(1),
    validity: validitySchema,
    temporalSupport: z.enum(["interval", "snapshot"]),
    snapshotYear: z.number().int().nullable(),
    relation: z.enum([
      "control",
      "administration",
      "vassal",
      "influence",
      "claim",
    ]),
    spatialPrecision: z.enum(["specified", "approximate", "disputed"]),
    interpretationId: text,
    evidence: evidenceList,
    review,
    compilation: z.strictObject({
      method: text,
      sourceScale: z.string().nullable(),
      controlPoints: z.array(point),
      errorNote: text,
    }),
  })
  .refine(
    (p) =>
      p.temporalSupport === "snapshot"
        ? p.snapshotYear !== null
        : p.snapshotYear === null,
    "快照年份不一致",
  );
export const territorySchema = z.strictObject({
  type: z.literal("Feature"),
  geometry,
  properties,
});
export const eventSchema = z.strictObject({
  id: text,
  title: text,
  validity: validitySchema,
  kind: z.enum([
    "military",
    "political",
    "diplomatic",
    "migration",
    "culture",
    "disaster",
  ]),
  placeIds: z.array(text),
  entityIds: z.array(text),
  summary: text,
  account: z.string(),
  interpretation: z.string(),
  evidence: evidenceList,
  review,
});
const coverage = z
  .strictObject({
    id: text,
    regionId: text,
    startYear: z.number().int(),
    endYear: z.number().int(),
    topic: z.enum(["territory", "event", "place"]),
    status: z.enum(["verified", "pending", "missing"]),
    evidence: z.array(evidence),
    reason: text,
  })
  .refine(
    (c) =>
      c.startYear <= c.endYear &&
      (!(c.status === "verified") || c.evidence.length > 0),
    "覆盖说明无效",
  );
export const catalogSchema: z.ZodType<Catalog> = z.strictObject({
  sources: z.array(source),
  entities: z.array(entity),
  places: z.array(place),
});
export const packageSchema: z.ZodType<DataPackage> = z.strictObject({
  id: text,
  version: text,
  territories: z.array(territorySchema),
  events: z.array(eventSchema),
  coverage: z.array(coverage),
});
