from database import SessionLocal
from routes.contracts import get_contract
from testing_utils import get_test_db, get_mock_user
from models.contract import Contract

db = SessionLocal()
contract = db.query(Contract).first()
if contract:
    from schemas.contract import ContractResponse
    for p in contract.parties:
        p.display_name = "test name"
    print(ContractResponse.model_validate(contract).model_dump(mode="json"))
