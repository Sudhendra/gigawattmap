// @gigawattmap/types — shared type definitions for web, api, and pipeline-emitted JSON.
//
// Model shapes (Datacenter, Operator, PowerPlant, Cable, CableLanding,
// Announcement) are GENERATED from the Pydantic schemas in
// data-pipeline/opendc/schemas.py via `make gen-types` and live in
// ./generated/schema.ts. They are the source of truth for structure.
//
// Hand-written modules below contribute:
//   1. Documented enum aliases (DatacenterTier, FuelType, etc.) whose
//      JSDoc explains the semantic meaning of each variant.
//   2. UI-only types (LayerId) that have no Pydantic counterpart.
//
// On name collision the generated type wins for fields nested inside
// model interfaces; the hand-written enum aliases are exported under
// their documented names so component code can `import { DatacenterTier }`.

export type {
  Announcement,
  Cable,
  CableLanding,
  Datacenter,
  Operator,
  PowerPlant,
} from './generated/schema.js';

export type {
  DatacenterTier,
  DatacenterStatus,
  MwSource,
  Confidence,
} from './datacenter.js';
export type { FuelType } from './power.js';
export type { AnnouncementCategory } from './announcement.js';
export type { LayerId } from './operator.js';
