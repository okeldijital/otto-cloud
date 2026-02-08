from typing import List, Dict, Any, Optional
from datetime import datetime, date

def compute_contract_status(contract: Any, documents: List[Any]) -> Dict[str, Any]:
    """
    Computes contract status based on documents and metadata.
    RED: Status is not Draft but no PDF document exists.
    AMBER: Active but end_date is within 60 days (optional but good).
    GREEN: Everything OK.
    """
    reasons = []
    status = "GREEN"

    # Check for manual override
    if getattr(contract, 'status_quo_override', None):
        return {"status": contract.status_quo_override, "reasons": ["Manual override set"]}

    # Rule: If status is not Draft, MUST have at least one document
    if contract.status != "Draft":
        if not documents:
            status = "RED"
            reasons.append("Active contract missing signed PDF document")
        else:
            # Check if any document is a PDF (simplified check)
            has_pdf = any(doc.mime_type == "application/pdf" or (doc.file_name and doc.file_name.lower().endswith('.pdf')) for doc in documents)
            if not has_pdf:
                status = "RED"
                reasons.append("Active contract missing PDF document (non-PDF found)")

    # Rule: Expiration warning (Amber)
    if contract.status == "Active" and contract.end_date:
        today = date.today()
        days_to_end = (contract.end_date - today).days
        if days_to_end < 0:
            status = "RED"
            reasons.append(f"Contract expired on {contract.end_date}")
        elif days_to_end < 60:
            if status != "RED":
                status = "AMBER"
            reasons.append(f"Contract expiring soon ({days_to_end} days left)")

    return {"status": status, "reasons": reasons}

def compute_work_admin_status(work_admin: Any, docs: List[Any], work_metadata: Optional[Any] = None) -> Dict[str, Any]:
    """
    Computes work administration status (proof of registration docs + metadata).
    RED: Missing registration proof or status is Rejected.
    AMBER: Status is Unknown or Submitted, or missing critical metadata.
    GREEN: Registered with proof.
    """
    reasons = []
    status = "GREEN"

    if not work_admin:
        return {"status": "RED", "reasons": ["No administration record found"]}

    if work_admin.registration_status == "Rejected":
        status = "RED"
        reasons.append("Registration was rejected by the society/registry")
    elif work_admin.registration_status == "Unknown":
        status = "RED"
        reasons.append("Registration status is unknown")
    elif work_admin.registration_status == "Submitted":
        status = "AMBER"
        reasons.append("Registration is pending (Submitted)")

    # Check for proof documents
    has_proof = any(doc.doc_type == "RegistrationProof" for doc in docs)
    if work_admin.registration_status == "Registered" and not has_proof:
        if status != "RED":
            status = "AMBER"
        reasons.append("Registered but missing digital proof of registration")
    elif work_admin.registration_status != "Registered" and not has_proof:
        # If not registered and no proof, it's definitely not Green
        if status == "GREEN":
            status = "AMBER"
        reasons.append("Missing registration proof document")

    # Metadata check (Amber)
    if work_metadata:
        if not work_metadata.iswc_code:
            if status == "GREEN":
                status = "AMBER"
            reasons.append("Missing ISWC (International Standard Musical Work Code)")

    return {"status": status, "reasons": reasons}

def compute_relationship_status(contract_status: str, work_status: str) -> Dict[str, Any]:
    """
    Computes the combined status of a contract and a work it covers.
    """
    reasons = []
    status = "GREEN"

    if contract_status == "RED" or work_status == "RED":
        status = "RED"
        reasons.append("Critical issue in either contract or work administration")
    elif contract_status == "AMBER" or work_status == "AMBER":
        status = "AMBER"
        reasons.append("Warning level issues detected in contract or work admin")

    return {"status": status, "reasons": reasons}

def compute_overall_status(contracts_info: List[Dict], works_info: List[Dict]) -> Dict[str, Any]:
    """
    Computes top-level counts and overall health.
    """
    red_count = sum(1 for c in contracts_info if c['status_quo']['status'] == "RED")
    red_count += sum(1 for w in works_info if w['status_quo']['status'] == "RED")
    
    amber_count = sum(1 for c in contracts_info if c['status_quo']['status'] == "AMBER")
    amber_count += sum(1 for w in works_info if w['status_quo']['status'] == "AMBER")
    
    green_count = sum(1 for c in contracts_info if c['status_quo']['status'] == "GREEN")
    green_count += sum(1 for w in works_info if w['status_quo']['status'] == "GREEN")

    overall = "GREEN"
    if red_count > 0:
        overall = "RED"
    elif amber_count > 0:
        overall = "AMBER"

    return {
        "overall_status": overall,
        "counts": {
            "red": red_count,
            "amber": amber_count,
            "green": green_count,
            "total": red_count + amber_count + green_count
        }
    }

def compute_release_status(release: Any, tracks: List[Any], has_contract: bool, has_artist_contract: bool) -> Dict[str, Any]:
    """
    Computes release status/health.
    RED:
     - No tracks
     - Tracks exist but any track has no work linked (track.work_id is None)
     - Release not linked to any Contract
     - Release Artist not linked to any Contract
    AMBER:
     - No artwork (image_url missing)
    """
    reasons = []
    status = "GREEN"

    # Red Rules
    if not tracks:
        status = "RED"
        reasons.append("Release has no tracks")
    else:
        # Check if any track is missing a work
        missing_works = [t.title for t in tracks if not getattr(t, 'work_id', None)]
        if missing_works:
            status = "RED"
            reasons.append(f"Tracks missing Works: {', '.join(missing_works[:3])}" + ("..." if len(missing_works) > 3 else ""))

    if not has_contract:
        status = "RED"
        reasons.append("Release is not linked to any contract")
    
    if not has_artist_contract:
        status = "RED"
        reasons.append("Release Artist is not linked to any contract")

    # Amber Rules (only if not already Red)
    if status != "RED":
        if not getattr(release, 'image_url', None):
            status = "AMBER"
            reasons.append("Missing artwork")

    return {"status": status, "reasons": reasons}
