import re
from typing import List, Dict, Any, Optional
from schemas.ai_contracts import PartyRoleV1, SplitTypeV1

# Pure functions and regex patterns for governed extraction

REMIX_CORE_PATTERNS = {
    "remixer": [
        r"(?i)\b(?:between|and|with)\s+([^,\.\(\)\n\r]+?)\s*\(the\s*\"Remixer\"\)",
        r"(?i)([^,\.\(\)\n\r]+?)\s*\(the\s*\"Remixer\"\)",
        r"(?i)remixer\s*:\s*([^,\.\n\r]+)",
        r"(?i)artist\s*known\s*as\s*([^,\.\n\r]+)",
    ],
    "label": [
        r"(?i)\b(?:between|and|with)\s+([^,\.\(\)\n\r]+?)\s*\(the\s*\"Label\"\)",
        r"(?i)([^,\.\(\)\n\r]+?)\s*\(the\s*\"Label\"\)",
        r"(?i)label\s*:\s*([^,\.\n\r]+)",
        r"(?i)company\s*:\s*([^,\.\n\r]+)",
    ],
    "track": [
        r"(?i)remix\s*of\s*the\s*track\s*[\"']([^\"']+)[\"']",
        r"(?i)provisionally\s*titled\s*[\"']([^\"']+)[\"']",
        r"(?i)track\s*entitled\s*[\"']([^\"']+)[\"']",
    ],
    "master_split": [
        r"(?i)(\d+(?:\.\d+)?)\s*%\s*of\s*the\s*net\s*receipts",
        r"(?i)royalties\s*of\s*(\d+(?:\.\d+)?)\s*%",
    ]
}

def extract_parties_from_text(text: str) -> List[Dict[str, Any]]:
    """
    Extract parties with normalized roles and confidence.
    """
    parties = []
    
    # Extract Remixer
    for pattern in REMIX_CORE_PATTERNS["remixer"]:
        match = re.search(pattern, text)
        if match:
            parties.append({
                "display_name": match.group(1).strip(),
                "role": PartyRoleV1.ARTIST,
                "confidence": 0.8,
                "source_span": match.group(0)
            })
            break
            
    # Extract Label
    for pattern in REMIX_CORE_PATTERNS["label"]:
        match = re.search(pattern, text)
        if match:
            parties.append({
                "display_name": match.group(1).strip(),
                "role": PartyRoleV1.LABEL,
                "confidence": 0.8,
                "source_span": match.group(0)
            })
            break
            
    return parties

def extract_splits_governed(text: str, parties: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    """
    Extract splits and tie them to nearest parties if possible.
    """
    splits = []
    
    # Find all percentages
    percent_matches = list(re.finditer(r"(\d+(?:\.\d+)?)\s*%", text))
    
    for match in percent_matches:
        percent = float(match.group(1))
        # Logic to find nearest party (simple proximity for now)
        # In a real implementation, we'd look for keywords like "to Remixer" or "for Label" near the percentage
        
        context = text[max(0, match.start()-50):min(len(text), match.end()+50)].lower()
        
        assigned_party = "Unknown Party"
        role = None
        
        if "remixer" in context or "artist" in context:
            # Try to find the remixer name from parties
            remixer = next((p for p in parties if p["role"] == PartyRoleV1.ARTIST), None)
            if remixer:
                assigned_party = remixer["display_name"]
                role = "Remixer"
        elif "label" in context or "company" in context:
            label = next((p for p in parties if p["role"] == PartyRoleV1.LABEL), None)
            if label:
                assigned_party = label["display_name"]
                role = "Label"
        
        splits.append({
            "split_type": SplitTypeV1.MASTER,
            "party_name": assigned_party,
            "party_role": role,
            "percent": percent,
            "notes": f"Detected near match: {match.group(0)}"
        })
        
    return splits

def extract_work_hints(text: str) -> Dict[str, List[str]]:
    """
    Extract track titles and artist names as hints.
    """
    hints = {"artists": [], "tracks": [], "releases": []}
    
    for pattern in REMIX_CORE_PATTERNS["track"]:
        match = re.search(pattern, text)
        if match:
            hints["tracks"].append(match.group(1).strip())
            
    return hints
