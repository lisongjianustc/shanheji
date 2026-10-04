import { z } from "zod";
import type { TerritorySlice } from "../domain/territorySlices";
import type { Evidence } from "../domain/types";
export interface Resource {
  path: string;
  sha256: string;
}
export interface MapPlate {
  id: string;
  year: number;
  title: string;
  sourceId: string;
  creator: string;
  edition: string;
  license: "CC BY-SA 3.0" | "CC BY-SA 4.0";
  sourceUrl: string;
  limitations: string;
  width: number;
  height: number;
  image: Resource;
}
export interface Manifest {
  version: string;
  catalog: Resource;
  packages: (Resource & {
    id: string;
    version: string;
    startYear: number;
    endYear: number;
    regionIds: string[];
  })[];
  territorySlices?: TerritorySlice[];
  mapPlates?: MapPlate[];
  defaultInterpretationIds: string[];
  scopeVersion: string;
  searchIndex: Resource;
  interpretations: {
    id: string;
    label: string;
    reason: string;
    evidence: Evidence[];
  }[];
}
const resource = z.object({
  path: z
    .string()
    .regex(/^[a-zA-Z0-9_./-]+$/)
    .refine((p) => !p.includes("..") && !p.startsWith("/")),
  sha256: z.string().regex(/^[a-f0-9]{64}$/),
});
export const mapPlateSchema = z.object({
  id: z.string().min(1),
  year: z.number().int().min(220).max(907),
  title: z.string().min(1),
  sourceId: z.string().min(1),
  creator: z.string().min(1),
  edition: z.string().min(1),
  license: z.enum(["CC BY-SA 3.0", "CC BY-SA 4.0"]),
  sourceUrl: z
    .url()
    .refine((s) => new URL(s).hostname === "commons.wikimedia.org"),
  limitations: z.string().min(1),
  width: z.number().int().positive(),
  height: z.number().int().positive(),
  image: resource,
});
export const manifestSchema = z.object({
  version: z.string(),
  catalog: resource,
  packages: z.array(
    resource.extend({
      id: z.string(),
      version: z.string(),
      startYear: z.number().int(),
      endYear: z.number().int(),
      regionIds: z.array(z.string()),
    }),
  ),
  territorySlices: z
    .array(
      z.object({
        year: z.number().int().min(220).max(907),
        entityId: z.string(),
        interpretationId: z.string(),
        regionIds: z.array(z.string()),
        relations: z.array(
          z.enum(["control", "administration", "vassal", "influence", "claim"]),
        ),
        featureCount: z.number().int().positive(),
        disputed: z.boolean(),
      }),
    )
    .default([]),
  mapPlates: z.array(mapPlateSchema).default([]),
  defaultInterpretationIds: z.array(z.string()),
  scopeVersion: z.string(),
  searchIndex: resource,
  interpretations: z.array(
    z.object({
      id: z.string(),
      label: z.string(),
      reason: z.string(),
      evidence: z.array(
        z.object({
          sourceId: z.string(),
          locator: z.string(),
          note: z.string(),
        }),
      ),
    }),
  ),
});
