import { isSupportedYear } from "../domain/chronology";
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
  endYear?: number;
  entityIds?: string[];
  title: string;
  sourceId: string;
  creator: string;
  edition: string;
  license:
    | "CC BY 3.0"
    | "CC BY-SA 3.0"
    | "CC BY-SA 3.0 CZ"
    | "CC BY-SA 4.0"
    | "CC0 1.0";
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
export const mapPlateSchema = z
  .object({
    id: z.string().min(1),
    year: z.number().int().refine(isSupportedYear),
    endYear: z.number().int().refine(isSupportedYear).optional(),
    entityIds: z.array(z.string().min(1)).optional(),
    title: z.string().min(1),
    sourceId: z.string().min(1),
    creator: z.string().min(1),
    edition: z.string().min(1),
    license: z.enum([
      "CC BY 3.0",
      "CC BY-SA 3.0",
      "CC BY-SA 3.0 CZ",
      "CC BY-SA 4.0",
      "CC0 1.0",
    ]),
    sourceUrl: z
      .url()
      .refine((s) => new URL(s).hostname === "commons.wikimedia.org"),
    limitations: z.string().min(1),
    width: z.number().int().positive(),
    height: z.number().int().positive(),
    image: resource,
  })
  .refine(
    (p) => p.endYear === undefined || p.endYear >= p.year,
    "图幅年代范围倒置",
  );
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
        year: z.number().int().refine(isSupportedYear),
        endYear: z.number().int().refine(isSupportedYear).optional(),
        entityId: z.string(),
        interpretationId: z.string(),
        regionIds: z.array(z.string()),
        relations: z.array(
          z.enum([
            "control",
            "administration",
            "reconstruction",
            "vassal",
            "influence",
            "claim",
          ]),
        ),
        featureCount: z.number().int().positive(),
        disputed: z.boolean(),
        partial: z.boolean().optional(),
        parts: z
          .array(
            z.object({
              relation: z.enum([
                "control",
                "administration",
                "reconstruction",
                "vassal",
                "influence",
                "claim",
              ]),
              partial: z.boolean(),
              featureCount: z.number().int().positive(),
              regionIds: z.array(z.string()),
            }),
          )
          .optional(),
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
