import sys
import os
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), 'backend')))

from backend.database import SessionLocal
from backend.models.contract import Contract
from backend.schemas.contract import ContractResponse

db = SessionLocal()
contract = db.query(Contract).first()
if contract:
    for p in contract.parties:
        p.display_name = "test name"
    for a in contract.assets:
        a.asset_title = "test title"
    print(ContractResponse.model_validate(contract).model_dump(mode="json"))
else:
    print("no contracts")
