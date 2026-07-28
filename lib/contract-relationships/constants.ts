/** Polymorphic target entity types — extend without schema redesign. */
export const TARGET_ENTITY_TYPES = [
  "artist",
  "release",
  "track",
  "work",
  "label",
  "publisher",
  "organization",
  "person",
  "contract",
] as const;

export type TargetEntityType = (typeof TARGET_ENTITY_TYPES)[number];

/** Data-driven relationship types (not hard-coded in schema). */
export const RELATIONSHIP_TYPES = [
  "represents",
  "applies_to",
  "governs",
  "licenses",
  "assigns_rights_to",
  "references",
  "supersedes",
  "amends",
] as const;

export type RelationshipType = (typeof RELATIONSHIP_TYPES)[number];

export const RELATIONSHIP_TYPE_LABELS: Record<string, string> = {
  represents: "Represents",
  applies_to: "Applies To",
  governs: "Governs",
  licenses: "Licenses",
  assigns_rights_to: "Assigns Rights To",
  references: "References",
  supersedes: "Supersedes",
  amends: "Amends",
};

export const MATCH_STRATEGIES = {
  exact: "exact",
  normalized: "normalized",
  alias: "alias",
} as const;

export type MatchStrategy =
  (typeof MATCH_STRATEGIES)[keyof typeof MATCH_STRATEGIES];
