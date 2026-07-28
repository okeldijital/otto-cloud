/**
 * Contract Relationship Discovery & Linking (Milestone 4.0)
 *
 * AI/matching suggests; only users create relationships.
 */

export {
  TARGET_ENTITY_TYPES,
  RELATIONSHIP_TYPES,
  RELATIONSHIP_TYPE_LABELS,
  MATCH_STRATEGIES,
} from "./constants";
export type { TargetEntityType, RelationshipType, MatchStrategy } from "./constants";
export {
  MatchingService,
  matchingService,
  normalizeText,
  exactMatch,
  normalizedMatch,
} from "./matching-service";
export {
  RelationshipDiscoveryService,
  relationshipDiscoveryService,
} from "./discovery-service";
export {
  RelationshipService,
  relationshipService,
} from "./relationship-service";
export {
  canManageRelationships,
  assertCanManageRelationships,
} from "./permissions";
export { RELATIONSHIP_EVENTS } from "./events";
