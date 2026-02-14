from sqlalchemy.orm import Session
from uuid import UUID
from typing import List
from schemas.ai_contracts import (
    ContractExtractionV1, 
    ResolvedContractProposalV1, 
    MatchProposalV1
)
from services.ai.registry import execute_tool

def resolve_entities(
    db: Session,
    org_id: UUID,
    extraction: ContractExtractionV1
) -> ResolvedContractProposalV1:
    """
    Resolves extracted names and hints against existing Catalog and Network entities.
    Uses Phase 1 search tools to maintain strict org-scoping and query patterns.
    """
    proposal = ResolvedContractProposalV1(needs_review=True)
    
    # Resolve Parties (Network Search)
    for party in extraction.parties:
        results = execute_tool(
            tool_name="search_network",
            db=db,
            org_id=org_id,
            query=party.name,
            limit=3
        )
        for res in results:
            proposal.proposed_network_entity_ids.append(MatchProposalV1(
                entity_id=res.id,
                label=res.label,
                confidence=0.8 if res.label.lower() == party.name.lower() else 0.5,
                reason=f"Matched party name: {party.name}"
            ))

    # Resolve Artists
    for artist_hint in extraction.works_hints.artists:
        results = execute_tool(
            tool_name="search_catalog",
            db=db,
            org_id=org_id,
            query=artist_hint,
            limit=3
        )
        for res in [r for r in results if r.type == "artist"]:
            proposal.proposed_artist_ids.append(MatchProposalV1(
                entity_id=res.id,
                label=res.label,
                confidence=0.9 if res.label.lower() == artist_hint.lower() else 0.5,
                reason=f"Matched artist hint: {artist_hint}"
            ))

    # Resolve Tracks
    for track_hint in extraction.works_hints.tracks:
        results = execute_tool(
            tool_name="search_catalog",
            db=db,
            org_id=org_id,
            query=track_hint,
            limit=3
        )
        for res in [r for r in results if r.type == "track"]:
            proposal.proposed_track_ids.append(MatchProposalV1(
                entity_id=res.id,
                label=res.label,
                confidence=0.9 if res.label.lower() == track_hint.lower() else 0.5,
                reason=f"Matched track hint: {track_hint}"
            ))

    return proposal
