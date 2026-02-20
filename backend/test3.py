from database import SessionLocal
from models.contract import ContractAsset
db = SessionLocal()
all_assets = db.query(ContractAsset).all()
print("All contract assets:")
for a in all_assets:
    print(f"Contract {a.contract_id} -> type {a.asset_type} ID {a.asset_id}")
