import sys
import os
from uuid import UUID
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

# Mock settings/env
sys.path.append('/Users/m2krproduction/otto-cloud/backend')
os.environ['DATABASE_URL'] = 'sqlite:////Users/m2krproduction/.otto/data/db/otto.sqlite'
os.environ['UPLOAD_DIR'] = '/tmp/otto_uploads'

from database import SessionLocal
from services.office_reports import build_contracts_audit, export_pdf

db = SessionLocal()
org_id = UUID(int=1)

try:
    print("Running build_contracts_audit...")
    rows, meta = build_contracts_audit(db, org_id, {})
    print(f"Success! Found {len(rows)} issues.")
    
    print("Testing export_pdf...")
    pdf_data = export_pdf("Test Report", rows, {})
    print(f"PDF generated: {len(pdf_data)} bytes")
    
except Exception as e:
    print(f"FAILED: {e}")
    import traceback
    traceback.print_exc()
finally:
    db.close()
