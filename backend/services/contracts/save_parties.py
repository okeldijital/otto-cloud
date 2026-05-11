from typing import Any, Iterable

from sqlalchemy.orm import Session

from models.artist import Artist
from models.contract import Contract, ContractParty
from models.network import Individual, Organization


class EntityTypeError(Exception):
    pass


class EntityNotFoundError(Exception):
    pass


class ContractNotFoundError(Exception):
    pass


class ValidationError(Exception):
    pass


class ConfirmRequiredError(Exception):
    pass


def _assert_entity_in_org(db: Session, entity_type: str, entity_id: int, org_id: Any) -> None:
    model_map = {
        "artist": Artist,
        "organization": Organization,
        "individual": Individual,
    }
    model = model_map.get((entity_type or "").strip().lower())
    if model is None:
        raise EntityTypeError("unsupported entity_type")

    record = db.query(model).filter(model.id == int(entity_id)).first()
    if not record:
        raise EntityNotFoundError("linked entity not found")

    record_org_id = getattr(record, "organization_id", None)
    if record_org_id is not None and record_org_id != org_id:
        raise EntityNotFoundError("linked entity not found")


def save_parties(
    db: Session,
    user: Any,
    contract_id: int,
    parties: Iterable[dict],
    confirm: bool,
) -> int:
    if not confirm:
        raise ConfirmRequiredError("confirm_non_destructive required")

    org_id = getattr(user, "organization_id", None)
    contract = (
        db.query(Contract)
        .filter(Contract.id == contract_id, Contract.organization_id == org_id)
        .first()
    )
    if not contract:
        raise ContractNotFoundError("contract not found")

    saved = 0
    for party in parties or []:
        role = str((party.get("role") or "Other")).strip() or "Other"
        entity_type = str((party.get("entity_type") or "external")).strip().lower()
        display_name = str((party.get("display_name") or "")).strip()
        split_percent = party.get("split_percent")
        notes = party.get("notes")

        if split_percent is not None:
            try:
                split_percent = float(split_percent)
            except Exception as exc:
                raise ValidationError("split_percent must be a valid number") from exc
            if split_percent < 0 or split_percent > 100:
                raise ValidationError("split_percent must be between 0 and 100")

        entity_id = None
        external_name = None
        db_entity_type = None

        if entity_type == "external":
            if not display_name:
                raise ValidationError("display_name is required")
            external_name = display_name
            db_entity_type = "External"
        else:
            entity_id = party.get("entity_id")
            if not entity_id:
                raise ValidationError("entity_id is required")
            _assert_entity_in_org(db, entity_type, int(entity_id), org_id)
            db_entity_type = entity_type.capitalize()

        existing = (
            db.query(ContractParty)
            .filter(
                ContractParty.contract_id == contract_id,
                ContractParty.organization_id == org_id,
                ContractParty.entity_type == db_entity_type,
                ContractParty.entity_id == (int(entity_id) if entity_id else None),
                ContractParty.external_name == external_name,
                ContractParty.role == role,
            )
            .first()
        )
        if existing:
            continue

        db.add(
            ContractParty(
                contract_id=contract_id,
                organization_id=org_id,
                entity_type=db_entity_type,
                entity_id=(int(entity_id) if entity_id else None),
                external_name=external_name,
                role=role,
                split_percent=split_percent,
                notes=notes,
            )
        )
        saved += 1

    db.commit()
    return saved