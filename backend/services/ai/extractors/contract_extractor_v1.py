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
from services.ai.engine import get_ai_engine, AIError

def deterministic_extract(text: str) -> ContractExtractionV1:
    """
    Fallback regex-based extraction for basic contract fields.
    """
    warnings = ["Used deterministic fallback (LLM disabled or failed)"]
    
    # Simple Date detection (YYYY-MM-DD or DD/MM/YYYY)
    date_pattern = r'(\d{4}-\d{2}-\d{2})|(\d{2}/\d{2}/\d{4})'
    dates = re.findall(date_pattern, text)
    effective_date = None
    if dates:
        # Just grab the first date found as a placeholder
        d_str = dates[0][0] or dates[0][1]
        try:
            if '-' in d_str:
                effective_date = datetime.strptime(d_str, '%Y-%m-%d').date()
            else:
                effective_date = datetime.strptime(d_str, '%d/%m/%Y').date()
        except:
            pass

    # Simple Percent detection
    percent_pattern = r'(\d+(?:\.\d+)?)\s*%'
    percents = re.findall(percent_pattern, text)
    splits = []
    for p in percents[:5]: # Take first 5 as hints
        splits.append(ContractSplitV1(
            split_type=SplitTypeV1.OTHER,
            party_name="Unknown Party (Extracted by Regex)",
            percent=float(p),
            notes="Extracted from text percentage"
        ))

    return ContractExtractionV1(
        contract_title="Extracted Contract (Regex)",
        effective_date=effective_date,
        splits=splits,
        raw_confidence=0.3,
        warnings=warnings
    )

def extract_contract_intelligence(text: str) -> ContractExtractionV1:
    """
    Main entry point for Phase 2 contract extraction.
    Tries AI engine first, falls back to deterministic regex.
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
        return extraction
    except (AIError, Exception) as e:
        # Fallback to regex if engine is NullEngine or fails
        return deterministic_extract(text)
