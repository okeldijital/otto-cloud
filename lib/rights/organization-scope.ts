type ScopedRelationship = { organizationId?: string | null };

type RightWithRelationships = {
  organizationId?: string | null;
  grants?: ScopedRelationship[];
  restrictions?: ScopedRelationship[];
  parties?: ScopedRelationship[];
  territories?: ScopedRelationship[];
  works?: ScopedRelationship[];
  releases?: ScopedRelationship[];
  contractRefs?: ScopedRelationship[];
};

function sameOrganization(item: ScopedRelationship, organizationId: string) {
  return item.organizationId === organizationId;
}

/**
 * Defense-in-depth for nested rights relationships. The registry already
 * scopes the parent right; this helper ensures every returned child relation
 * carries the same organization boundary before leaving the API layer.
 */
export function scopeRightRelationships<T extends RightWithRelationships>(
  right: T,
  organizationId: string
): T {
  const scoped = { ...right };

  for (const key of [
    "grants",
    "restrictions",
    "parties",
    "territories",
    "works",
    "releases",
    "contractRefs",
  ] as const) {
    if (Array.isArray(scoped[key])) {
      scoped[key] = scoped[key]!.filter((item) =>
        sameOrganization(item, organizationId)
      ) as T[typeof key];
    }
  }

  return scoped;
}

export function scopeRightRelationshipCollections<T extends Record<string, unknown>>(
  relationships: T,
  organizationId: string
): T {
  const scoped = { ...relationships };

  for (const key of ["works", "releases", "contractRelationships"] as const) {
    const value = scoped[key];
    if (Array.isArray(value)) {
      scoped[key] = value.filter(
        (item) =>
          item &&
          typeof item === "object" &&
          (item as ScopedRelationship).organizationId === organizationId
      ) as T[typeof key];
    }
  }

  return scoped;
}
