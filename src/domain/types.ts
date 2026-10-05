import type {
  Feature,
  Polygon,
  MultiPolygon,
  MultiLineString,
  Point,
} from "geojson";
export type Id = string;
export type Day = string;
export type Precision = "day" | "month" | "year" | "range";
export interface Bound {
  earliest: Day;
  latest: Day;
}
export interface Validity {
  start: Bound;
  endExclusive: Bound;
  precision: Precision;
  label: string; // 面向读者的真实日期表述
}
export type Relation =
  | "control"
  | "administration"
  | "reconstruction"
  | "vassal"
  | "influence"
  | "claim";
export interface Evidence {
  sourceId: Id;
  locator: string;
  note: string;
}
export interface Review {
  status: "pending" | "verified" | "rejected";
  reviewerKind: "human" | "agent";
  reviewer: string;
  checkedAt: string;
  evidence: Evidence[];
}
export interface Source {
  id: Id;
  title: string;
  creator: string;
  edition: string;
  url: string | null;
  accessedAt: string;
  license: string;
  redistribution: "allowed" | "unknown" | "denied";
  permissionEvidence: string;
}
export interface Entity {
  id: Id;
  kind: "polity" | "local-power" | "confederation" | "administration";
  names: { text: string; validity: Validity; evidence: Evidence[] }[];
  existence: Validity;
  activePeriods?: Validity[];
  color: string;
  regionIds: Id[];
  capitals: { placeId: Id; validity: Validity; evidence: Evidence[] }[];
}
export interface Place {
  id: Id;
  names: { text: string; validity: Validity; evidence: Evidence[] }[];
  locations: {
    geometry: Point | Polygon | MultiPolygon;
    validity: Validity;
    spatialPrecision: "specified" | "approximate";
    evidence: Evidence[];
  }[];
}
export interface TerritoryProperties {
  id: Id;
  entityId: Id;
  regionIds: Id[];
  validity: Validity;
  temporalSupport: "interval" | "snapshot";
  snapshotYear: number | null;
  relation: Relation;
  spatialPrecision: "specified" | "approximate" | "disputed";
  interpretationId: Id;
  evidence: Evidence[];
  review: Review;
  compilation: {
    method: string;
    sourceScale: string | null;
    controlPoints: [number, number][];
    errorNote: string;
    extent?: "partial-source";
    boundaryGeometry?: MultiLineString; // 排除数据裁切产生的人工闭合边线
  };
}
export type Territory = Feature<Polygon | MultiPolygon, TerritoryProperties>;
export type EventKind =
  | "military"
  | "political"
  | "diplomatic"
  | "migration"
  | "culture"
  | "disaster";
export interface HistoricalEvent {
  id: Id;
  title: string;
  validity: Validity;
  kind: EventKind;
  placeIds: Id[];
  entityIds: Id[];
  summary: string;
  account: string;
  interpretation: string;
  evidence: Evidence[];
  review: Review;
}
export interface Coverage {
  id: Id;
  regionId: Id;
  startYear: number;
  endYear: number;
  topic: "territory" | "event" | "place";
  status: "verified" | "pending" | "missing";
  evidence: Evidence[];
  reason: string;
}
export interface Catalog {
  sources: Source[];
  entities: Entity[];
  places: Place[];
}
export interface DataPackage {
  id: Id;
  version: string;
  territories: Territory[];
  events: HistoricalEvent[];
  coverage: Coverage[];
}
export interface Filters {
  regionIds: Id[];
  entityIds: Id[];
  eventKinds: EventKind[];
  relations: Relation[];
  interpretationIds: Id[];
  nearbyReference: boolean;
}
export interface Query {
  snapshotId?: Id | null;
  year: number;
  at: Day | null;
  filters: Filters;
}
export interface Scene {
  query: Query;
  referenceAt: Day;
  catalog: Catalog;
  territories: Territory[];
  events: HistoricalEvent[];
  coverage: Coverage[];
  uncertainTerritoryIds: Id[];
  referenceYears: number[];
  territoryTimeLabels: Record<Id, string>;
  snapshotChoices?: { id: Id; label: string }[];
  warnings: string[];
}
export interface SearchEntry {
  namePeriods?: { text: string; startYear: number; endYear: number }[];
  id: Id;
  kind: "entity" | "event" | "place";
  label: string;
  aliases: string[];
  startYear: number;
  endYear: number;
  regionIds: Id[];
  entityIds?: Id[];
  eventKind?: EventKind;
}
