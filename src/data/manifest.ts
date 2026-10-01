import { z } from "zod";
import type { Evidence } from "../domain/types";
export interface Resource {
  path: string;
  sha256: string;
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
