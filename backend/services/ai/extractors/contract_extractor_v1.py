import re
from datetime import datetime
from typing import List, Optional
from schemas.ai_contracts import (
    ContractExtractionV1, 
    ContractSplitV1, 
    ContractPartyV1, 
    SplitTypeV1, 
    PartyRoleV1,
    WorksHintsV1
)
from services.ai.parsing.rules.remix_agreement_v1 import (
    extract_parties_from_text,
    extract_splits_governed,
    extract_work_hints
)

def deterministic_extract(text: str) -> ContractExtractionV1:
    """
    Governed structured extraction using deterministic rules.
    """
    warnings = []
    parser_version = "deterministic_v1"
    
    # 1. Extract Parties
    raw_parties = extract_parties_from_text(text)
    parties = [ContractPartyV1(**p) for p in raw_parties]
    
    # 2. Extract Splits
    raw_splits = extract_splits_governed(text, raw_parties)
    splits = [ContractSplitV1(**s) for s in raw_splits]
    
    # Associate splits with known parties if still "Unknown Party"
    if parties:
        for s in splits:
            if s.party_name == "Unknown Party":
                # If we only have one party, maybe it's them? 
                # (Simple logic: if one party and one split, associate)
                if len(parties) == 1:
                    s.party_name = parties[0].display_name
                    s.party_role = parties[0].role
                else:
                    s.notes = (s.notes or "") + " [UNASSIGNED]"
    
    # 3. Compute Splits Total
    splits_total = sum(s.percent for s in splits)
    if abs(splits_total - 100.0) > 0.05:
        warnings.append(f"splits_total_mismatch: Computed total is {splits_total}%")
    
    # 4. Extract Work Hints
    hints_dict = extract_work_hints(text)
    works_hints = WorksHintsV1(**hints_dict)
    
    # 5. Extract Basic Date (fallback)
    date_pattern = r'(\d{4}-\d{2}-\d{2})|(\d{2}/\d{2}/\d{4})'
    dates = re.findall(date_pattern, text)
    effective_date = None
    if dates:
        d_str = dates[0][0] or dates[0][1]
        try:
            if '-' in d_str:
                effective_date = datetime.strptime(d_str, '%Y-%m-%d').date()
            else:
                effective_date = datetime.strptime(d_str, '%d/%m/%Y').date()
        except:
            pass

    # Confidence depends on whether we found parties/splits
    confidence = 0.5
    if parties and splits:
        confidence = 0.8
    elif parties or splits:
        confidence = 0.6

    return ContractExtractionV1(
        contract_title="Governed Extraction (Deterministic V1)",
        effective_date=effective_date,
        parties=parties,
        splits=splits,
        splits_total=splits_total,
        works_hints=works_hints,
        raw_confidence=confidence,
        warnings=warnings,
        parser_version=parser_version
    )

def extract_contract_intelligence(text: str) -> ContractExtractionV1:
    """
    Main entry point for Phase 2 contract extraction.
    Tries AI engine first, falls back to deterministic rules.
    """
    engine = get_ai_engine()
    
    system_prompt = "You are a legal contract analyzer. Extract structured metadata from the provided text."
    user_prompt = f"Analyze this contract text and return valid JSON:\n\n{text[:5000]}" # Limit size for safety
    
    try:
        extraction = engine.complete_json(
            schema=ContractExtractionV1,
            system=system_prompt,
            user=user_prompt
        )
        if extraction:
            extraction.parser_version = "ai_v1"
            return extraction
    except (AIError, Exception) as e:
        pass
    
    # Fallback to deterministic if engine is NullEngine or fails
    return deterministic_extract(text)
