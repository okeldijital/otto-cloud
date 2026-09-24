export type ReleaseTrackOrderItem = { id: number };

export function orderReleaseTracks<T extends ReleaseTrackOrderItem>(
  tracks: T[],
  positions: Map<number, number | null | undefined>
): T[] {
  return [...tracks].sort((a, b) => {
    const aPosition = positions.get(a.id);
    const bPosition = positions.get(b.id);
    const aRank = aPosition == null ? Number.MAX_SAFE_INTEGER : aPosition;
    const bRank = bPosition == null ? Number.MAX_SAFE_INTEGER : bPosition;
    return aRank - bRank || a.id - b.id;
  });
}
