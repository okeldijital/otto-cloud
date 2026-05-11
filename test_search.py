import sys
import os
import asyncio
from sqlalchemy.orm import Session
from backend.database import SessionLocal
from backend.models.user import User
from backend.routes.search import global_search

# Add backend to path
sys.path.append(os.path.abspath('backend'))

def run_test():
    db = SessionLocal()
    # Get any user or admin
    user = db.query(User).first()
    if not user:
        print("No user found")
        return

    print(f"Testing with user: {user.email}, org: {user.organization_id}")
    
    try:
        results = global_search(q="admin", db=db, current_user=user)
        print("Success:", list(results.keys()))
    except Exception as e:
        import traceback
        traceback.print_exc()
        print("Error:", str(e))
    finally:
        db.close()

if __name__ == "__main__":
    run_test()
